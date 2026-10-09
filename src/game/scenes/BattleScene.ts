import Phaser from "phaser";

import { HeuristicAgent } from "../../ai/agents/HeuristicAgent";
import type { GameAction } from "../../core/actions/game-actions";
import { createMapDefinitionFromState } from "../../core/maps/create-map-definition-from-state";
import { createGameStateFromMap, type MapDefinition } from "../../core/maps/map-definition";
import type { GameEvent } from "../../core/model/game-events";
import type { GameState, Position } from "../../core/model/game-state";
import { applyAction } from "../../core/rules/apply-action";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { BattleMapRenderer } from "../board/BattleMapRenderer";
import {
  calculatePresentationViewport,
  calculateRightAlignedContentX,
  type PresentationViewport,
} from "../config/presentation-layout";
import { getAttackHighlightPositions } from "../input/attack-highlights";
import { calculateInertialCameraVelocity } from "../input/camera-inertia";
import { calculateInertialZoom, calculateNextZoom, INITIAL_MAP_ZOOM } from "../input/camera-zoom";
import { getCapturableControlPointId } from "../input/capture-availability";
import { getMovementHighlightPositions } from "../input/movement-highlights";
import type { AiActionDecision } from "../match/choose-ai-action";
import { decideAiAction } from "../match/choose-ai-action";
import {
  createAgentForParticipant,
  createDefaultMatchConfiguration,
  isHumanTurn,
  type MatchConfiguration,
} from "../match/match-configuration";
import type { MultiplayerSession } from "../multiplayer/multiplayer-session";
import { MovementPresenter } from "../presentation/MovementPresenter";
import { getMovementSettings, movementDuration } from "../presentation/movement-settings";
import { movementRoute } from "../presentation/movement-transition";
import { createRecordedMatch } from "../replays/recorded-match";
import { getBrowserReplayLibrary } from "../replays/replay-library";
import type { Button } from "../ui/components/Button";
import { EventLogDialog } from "../ui/components/EventLogDialog";
import { EVENT_LOG_VISIBLE_ENTRY_COUNT, EventLogModel } from "../ui/components/EventLogModel";
import { PauseMenu } from "../ui/components/PauseMenu";
import type { ProgressBar } from "../ui/components/ProgressBar";
import { BattleAiPauseController } from "./battle-ai-pause-controller";
import { createDiagnosticBoard, drawDiagnosticUnits } from "./battle-diagnostics";
import {
  createBattleHud,
  HUD_WIDTH,
  HUD_X,
  SELECTED_PANEL_HEIGHT,
  SELECTED_PANEL_Y,
  TOP_PANEL_Y,
} from "./battle-hud";
import { calculateWorldViewportWidth } from "./battle-presentation";
import {
  findUnitAt,
  formatActionRejection,
  formatEvent,
  formatSelectedUnit,
  toContainerPosition,
} from "./battle-view-helpers";
import { calculateCameraCenterLimits } from "./camera-presentation";
import { MAIN_MENU_SCENE_KEY, RESULT_SCENE_KEY } from "./scene-keys";

const TILE_SIZE = 512;
const BOARD_ORIGIN_X = 0;
const BOARD_ORIGIN_Y = 56;
const TILE_CENTER = TILE_SIZE / 2;
const BOARD_BORDER_WIDTH = 8;
const AI_ACTION_DELAY = 500;
const MULTIPLAYER_RECONNECT_TIMEOUT_MS = 60_000;
const CAMERA_SCROLL_SPEED = 2400;
const CAMERA_DECELERATION = 8;
const ZOOM_RESPONSE_PER_SECOND = 8;
const MILLISECONDS_PER_SECOND = 1000;
const NO_UNIT_COUNT = 0;
const DIAGNOSTIC_SELECTION_COLOR = 0xf2f5f7;
const MOVEMENT_HIGHLIGHT_COLOR = 0x3dd6b1;
const MOVEMENT_HIGHLIGHT_FILL_ALPHA = 0.28;
const MOVEMENT_HIGHLIGHT_BORDER_ALPHA = 0.85;
const MOVEMENT_HIGHLIGHT_BORDER_WIDTH = 8;
const ATTACK_HIGHLIGHT_COLOR = 0xd94b4b;
const ATTACK_HIGHLIGHT_FILL_ALPHA = 0.32;
const DIAGNOSTIC_MODE = import.meta.env.DEV;

interface ZoomAnchor {
  readonly pointerX: number;
  readonly pointerY: number;
}

export interface BattleSceneData {
  readonly matchConfiguration?: MatchConfiguration;
  readonly mapDefinition?: MapDefinition;
  readonly initialState?: GameState;
  readonly multiplayerSession?: MultiplayerSession;
}

export class BattleScene extends Phaser.Scene {
  private worldContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private presentationViewport!: PresentationViewport;
  private gameState!: GameState;
  // Network actions commit to gameState immediately; only the presenter advances displayedState.
  private displayedState!: GameState;
  private presenter?: MovementPresenter;
  private aiInFlight = false;
  private disconnected = false;
  private mapDefinition: MapDefinition | null = null;
  private replayMapDefinition!: MapDefinition;
  private matchConfiguration = createDefaultMatchConfiguration();
  private multiplayerSession: MultiplayerSession | null = null;
  private actionSequence = 0;
  private mapZoom = INITIAL_MAP_ZOOM;
  private targetMapZoom = INITIAL_MAP_ZOOM;
  private zoomAnchor: ZoomAnchor | null = null;
  private cameraVelocity = { x: 0, y: 0 };
  private cameraCenter = { x: 0, y: 0 };
  private selectedUnitId: string | null = null;
  private inputLocked = false;
  private aiTurnActions: GameAction[] = [];
  private replayActions: GameAction[] = [];
  private selectedUnitText!: Phaser.GameObjects.Text;
  private activeTurnText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private healthBar!: ProgressBar;
  private eventLog = new EventLogModel(EVENT_LOG_VISIBLE_ENTRY_COUNT);
  private waitButton!: Button;
  private endTurnButton!: Button;
  private captureButton!: Button;
  private selectionView: Phaser.GameObjects.Rectangle | null = null;
  private diagnosticUnitLayer: Phaser.GameObjects.Graphics | null = null;
  private movementHighlightLayer: Phaser.GameObjects.Graphics | null = null;
  private attackHighlightLayer: Phaser.GameObjects.Graphics | null = null;
  private mapRenderer!: BattleMapRenderer;
  private pauseMenu?: PauseMenu;
  private eventLogDialog?: EventLogDialog;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private aiDelayEvent?: Phaser.Time.TimerEvent;
  private aiPauseController = new BattleAiPauseController<AiActionDecision>();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

  public constructor() {
    super("battle");
  }

  public create(data: BattleSceneData = {}): void {
    this.resetRenderingState();
    this.mapDefinition = data.mapDefinition ?? null;
    this.gameState =
      data.initialState ??
      (this.mapDefinition ? createGameStateFromMap(this.mapDefinition) : createSkirmishGameState());
    this.replayMapDefinition =
      this.mapDefinition ?? createMapDefinitionFromState(this.gameState, "Skirmish 12×8");
    this.multiplayerSession = data.multiplayerSession ?? null;
    this.matchConfiguration = this.multiplayerSession
      ? { ...createDefaultMatchConfiguration(), red: "human" }
      : (data.matchConfiguration ?? createDefaultMatchConfiguration());
    this.bindMultiplayerSession();
    this.mapZoom = INITIAL_MAP_ZOOM;
    this.targetMapZoom = INITIAL_MAP_ZOOM;
    this.worldContainer = this.add.container();
    this.hudContainer = this.add.container().setScrollFactor(0);
    this.configureCameras();
    this.createWorld();
    this.createHud();
    this.createPresenter();
    this.createPauseMenu();
    this.bindInput();
    this.renderGameState(null, this.gameState);
    this.startAiTurnIfNeeded();
  }

  private resetRenderingState(): void {
    this.presenter?.reset();
    this.presenter = undefined;
    this.aiInFlight = false;
    this.disconnected = false;
    this.pauseMenu = undefined;
    this.eventLogDialog = undefined;
    this.eventLog = new EventLogModel(EVENT_LOG_VISIBLE_ENTRY_COUNT);
    this.mapRenderer?.reset();
    this.aiDelayEvent?.remove(false);
    this.aiDelayEvent = undefined;
    this.aiPauseController = new BattleAiPauseController<AiActionDecision>();
    this.selectionView = null;
    this.diagnosticUnitLayer = null;
    this.movementHighlightLayer = null;
    this.attackHighlightLayer = null;
    this.selectedUnitId = null;
    this.inputLocked = false;
    this.aiTurnActions = [];
    this.replayActions = [];
    this.actionSequence = 0;
    this.cameraVelocity = { x: 0, y: 0 };
    this.cameraCenter = { x: 0, y: 0 };
    this.zoomAnchor = null;
  }

  public update(_time: number, delta: number): void {
    if (this.pauseMenu?.isOpen) return;
    this.presenter?.update(delta);
    this.updateKeyboardCamera(delta);
    this.updateInertialZoom(delta);
  }

  private configureCameras(): void {
    const worldCamera = this.cameras.main;
    this.uiCamera = this.cameras.add();

    worldCamera.removeBounds();
    worldCamera.ignore(this.hudContainer);
    this.uiCamera.ignore(this.worldContainer);
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindPresentationResize, this);
    const keyboard = this.input.keyboard;

    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasdKeys = keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
    }
  }

  private updatePresentationViewport(): void {
    this.presentationViewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.configureWorldCameraViewport();
    this.configureUiCameraViewport();
    this.updatePauseMenuPresentation();
  }

  private configureWorldCameraViewport(): void {
    const { x, y, width, height, scale } = this.presentationViewport;
    const zoom = this.mapZoom * scale;
    const worldViewportWidth = calculateWorldViewportWidth(width, HUD_WIDTH, scale);
    this.worldContainer.setPosition(0, 0);
    this.cameras.main.removeBounds();
    this.cameras.main.setViewport(x, y, worldViewportWidth, height).setZoom(zoom);
    this.resetCameraCenter();
    this.applyCameraCenter();
    this.stopCameraMotion();
  }

  private configureUiCameraViewport(): void {
    const { contentY, scale } = this.presentationViewport;
    const hudX = calculateRightAlignedContentX(this.presentationViewport, HUD_X + HUD_WIDTH);

    this.uiCamera.setViewport(0, 0, this.scale.width, this.scale.height).setScroll(0, 0).setZoom(1);
    this.hudContainer.setPosition(hudX, contentY).setScale(scale);
  }

  private unbindPresentationResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }

  private createWorld(): void {
    this.mapRenderer = new BattleMapRenderer(this, this.worldContainer, {
      boardOriginX: BOARD_ORIGIN_X,
      boardOriginY: BOARD_ORIGIN_Y,
      tileSize: TILE_SIZE,
      initialZoom: this.mapZoom,
    });
    if (this.mapRenderer.hasLoadedAssets()) {
      this.createAssetWorld();
      return;
    }

    if (!DIAGNOSTIC_MODE) {
      return;
    }

    createDiagnosticBoard(this, this.worldContainer, this.gameState, (position) =>
      this.toScreenPosition(position),
    );
    this.createMovementHighlightLayer();
    this.createAttackHighlightLayer();
    this.diagnosticUnitLayer = this.add.graphics();
    this.worldContainer.add(this.diagnosticUnitLayer);
    this.drawDiagnosticUnitMarkers(this.gameState);
  }

  private createAssetWorld(): void {
    this.mapRenderer.createTerrain(this.gameState);
    this.createMovementHighlightLayer();
    this.createAttackHighlightLayer();
    this.mapRenderer.renderState(this.gameState);
  }

  private createMovementHighlightLayer(): void {
    this.movementHighlightLayer = this.add.graphics();
    this.worldContainer.add(this.movementHighlightLayer);
    this.uiCamera.ignore(this.movementHighlightLayer);
  }

  private createAttackHighlightLayer(): void {
    this.attackHighlightLayer = this.add.graphics();
    this.worldContainer.add(this.attackHighlightLayer);
    this.uiCamera.ignore(this.attackHighlightLayer);
  }

  private createHud(): void {
    Object.assign(
      this,
      createBattleHud(this, this.hudContainer, {
        wait: () => this.waitSelectedUnit(),
        end: () => this.endPlayerTurn(),
        capture: () => this.captureSelectedControlPoint(),
      }),
    );
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.pauseMenu?.isOpen) return;
      if (this.handleHudClick(pointer)) {
        return;
      }

      this.handleBoardClick(pointer);
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (pointer: Phaser.Input.Pointer, _objects: unknown[], _x: number, y: number) => {
        if (this.pauseMenu?.isOpen) return;
        this.zoomWorldCamera(pointer, y);
      },
    );
    this.bindPauseKey();
  }

  private createPauseMenu(): void {
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.resumeFromPause(),
      onExit: () => this.exitToMainMenu(),
      onShowEventLog: () => this.openEventLog(),
    });
    this.eventLogDialog = new EventLogDialog(this, this.eventLog);
    this.cameras.main.ignore([this.pauseMenu.overlay, this.pauseMenu.container]);
    this.cameras.main.ignore(this.eventLogDialog.container);
    this.updatePauseMenuPresentation();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownPauseMenu, this);
  }
  private updatePauseMenuPresentation(): void {
    if (!this.pauseMenu) return;
    this.pauseMenu.container
      .setPosition(this.presentationViewport.contentX, this.presentationViewport.contentY)
      .setScale(this.presentationViewport.scale);
    this.eventLogDialog?.container
      .setPosition(this.presentationViewport.contentX, this.presentationViewport.contentY)
      .setScale(this.presentationViewport.scale);
    this.pauseMenu.setOverlaySize(this.scale.width, this.scale.height);
  }
  private bindPauseKey(): void {
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey?.on(Phaser.Input.Keyboard.Events.DOWN, this.handleEscapeKey, this);
  }
  private handleEscapeKey(): void {
    if (this.eventLogDialog?.isOpen) {
      this.eventLogDialog.close();
      return;
    }
    if (this.pauseMenu?.isOpen) this.resumeFromPause();
    else this.openPauseMenu();
  }
  private openPauseMenu(): void {
    if (!this.pauseMenu) return;
    this.presenter?.pause();
    const { cancelDelay } = this.aiPauseController.pause();
    if (cancelDelay) this.aiDelayEvent?.remove(false);
    if (cancelDelay) this.aiDelayEvent = undefined;
    this.stopCameraMotion();
    this.pauseMenu.open();
  }
  private resumeFromPause(): void {
    this.eventLogDialog?.close();
    this.pauseMenu?.close();
    const resume = this.aiPauseController.resume();
    this.presenter?.resume();
    if (resume.kind === "apply") this.applyAiDecision(resume.decision);
    if (resume.kind === "start-delay") this.runAiAction();
  }
  private exitToMainMenu(): void {
    this.presenter?.reset();
    this.aiPauseController.exit();
    this.aiDelayEvent?.remove(false);
    this.aiDelayEvent = undefined;
    this.scene.start(MAIN_MENU_SCENE_KEY, { matchConfiguration: this.matchConfiguration });
  }
  private shutdownPauseMenu(): void {
    this.presenter?.reset();
    this.aiPauseController.exit();
    this.aiDelayEvent?.remove(false);
    this.aiDelayEvent = undefined;
    this.escapeKey?.off(Phaser.Input.Keyboard.Events.DOWN, this.handleEscapeKey, this);
    this.eventLogDialog?.destroy(this);
    this.eventLogDialog = undefined;
  }

  private openEventLog(): void {
    this.eventLogDialog?.open();
  }

  private zoomWorldCamera(pointer: Phaser.Input.Pointer, wheelDeltaY: number): void {
    const logicalPointer = this.toLogicalPointer(pointer);

    if (!logicalPointer || this.isPointerInsideHud(pointer)) {
      return;
    }

    const nextMapZoom = calculateNextZoom(this.targetMapZoom, wheelDeltaY);

    if (nextMapZoom === this.targetMapZoom) {
      return;
    }

    this.targetMapZoom = nextMapZoom;
    this.zoomAnchor = {
      pointerX: pointer.x - this.presentationViewport.x,
      pointerY: pointer.y - this.presentationViewport.y,
    };
    this.stopCameraMotion();
  }

  private updateInertialZoom(delta: number): void {
    if (!this.zoomAnchor || this.mapZoom === this.targetMapZoom) {
      return;
    }

    const camera = this.cameras.main;
    const nextMapZoom = calculateInertialZoom({
      currentZoom: this.mapZoom,
      targetZoom: this.targetMapZoom,
      deltaMs: delta,
      responsePerSecond: ZOOM_RESPONSE_PER_SECOND,
    });
    const nextZoom = nextMapZoom * this.presentationViewport.scale;
    this.mapZoom = nextMapZoom;
    camera.removeBounds();
    camera.setZoom(nextZoom);
    this.resetCameraCenter();
    this.applyCameraCenter();
    this.mapRenderer.updateHealthLabelScales(nextMapZoom);
    if (this.mapZoom === this.targetMapZoom) this.zoomAnchor = null;
  }

  private updateKeyboardCamera(delta: number): void {
    const limits = this.getCameraCenterLimits(this.cameraCenter.x, this.cameraCenter.y);
    const direction = this.getKeyboardCameraDirection();
    const velocity = calculateInertialCameraVelocity({
      velocityX: limits.canPanHorizontally ? this.cameraVelocity.x : 0,
      velocityY: limits.canPanVertically ? this.cameraVelocity.y : 0,
      horizontal: limits.canPanHorizontally ? direction.horizontal : 0,
      vertical: limits.canPanVertically ? direction.vertical : 0,
      deltaMs: delta,
      speed: CAMERA_SCROLL_SPEED,
      deceleration: CAMERA_DECELERATION,
    });

    this.cameraVelocity = velocity;
    this.cameraCenter = {
      x: this.cameraCenter.x + (velocity.x * delta) / MILLISECONDS_PER_SECOND,
      y: this.cameraCenter.y + (velocity.y * delta) / MILLISECONDS_PER_SECOND,
    };
    this.applyCameraCenter();
  }

  private resetCameraCenter(): void {
    this.cameraCenter = {
      x: BOARD_ORIGIN_X + (this.gameState.board.width * TILE_SIZE) / 2,
      y: BOARD_ORIGIN_Y + (this.gameState.board.height * TILE_SIZE) / 2,
    };
  }

  private applyCameraCenter(): void {
    const limits = this.getCameraCenterLimits(this.cameraCenter.x, this.cameraCenter.y);
    this.cameraCenter = { x: limits.centerX, y: limits.centerY };
    this.cameras.main.centerOn(limits.centerX, limits.centerY);
  }

  private getCameraCenterLimits(requestedCenterX: number, requestedCenterY: number) {
    const camera = this.cameras.main;
    return calculateCameraCenterLimits({
      requestedCenterX,
      requestedCenterY,
      boardLeft: BOARD_ORIGIN_X,
      boardTop: BOARD_ORIGIN_Y,
      boardWidth: this.gameState.board.width * TILE_SIZE,
      boardHeight: this.gameState.board.height * TILE_SIZE,
      visibleWidth: camera.width / camera.zoom,
      visibleHeight: camera.height / camera.zoom,
    });
  }

  private getKeyboardCameraDirection(): { horizontal: number; vertical: number } {
    return {
      horizontal:
        Number(Boolean(this.cursors?.right.isDown || this.wasdKeys?.right.isDown)) -
        Number(Boolean(this.cursors?.left.isDown || this.wasdKeys?.left.isDown)),
      vertical:
        Number(Boolean(this.cursors?.down.isDown || this.wasdKeys?.down.isDown)) -
        Number(Boolean(this.cursors?.up.isDown || this.wasdKeys?.up.isDown)),
    };
  }

  private stopCameraMotion(): void {
    this.cameraVelocity = { x: 0, y: 0 };
  }

  private handleHudClick(pointer: Phaser.Input.Pointer): boolean {
    if (!this.toLogicalPointer(pointer)) {
      return true;
    }

    return this.isPointerInsideHud(pointer);
  }

  private toHudPosition(pointer: Phaser.Input.Pointer): Position {
    return toContainerPosition(
      pointer,
      { x: this.hudContainer.x, y: this.hudContainer.y },
      this.presentationViewport.scale,
    );
  }

  private isPointerInsideHud(pointer: Phaser.Input.Pointer): boolean {
    const hudPointer = this.toHudPosition(pointer);
    const hudBottom = SELECTED_PANEL_Y + SELECTED_PANEL_HEIGHT;

    return (
      hudPointer.x >= HUD_X &&
      hudPointer.x < HUD_X + HUD_WIDTH &&
      hudPointer.y >= TOP_PANEL_Y &&
      hudPointer.y < hudBottom
    );
  }

  private handleBoardClick(pointer: Phaser.Input.Pointer): void {
    if (!this.canHumanIssueOrders()) {
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const position = this.toBoardPosition(worldPoint);

    if (!position) {
      return;
    }

    const clickedUnit = findUnitAt(this.gameState, position);

    if (clickedUnit?.side === this.gameState.activeSide) {
      this.selectedUnitId = clickedUnit.id;
      this.renderGameState(this.gameState, this.gameState);
      return;
    }

    if (!this.selectedUnitId) {
      return;
    }

    if (clickedUnit) {
      this.submitAction({
        type: "attack",
        unitId: this.selectedUnitId,
        targetUnitId: clickedUnit.id,
      });
      return;
    }

    this.submitAction({ type: "move", unitId: this.selectedUnitId, destination: position });
  }

  private waitSelectedUnit(): void {
    if (this.selectedUnitId) {
      this.submitAction({ type: "wait", unitId: this.selectedUnitId });
    }
  }

  private captureSelectedControlPoint(): void {
    const controlPointId = getCapturableControlPointId(
      this.gameState,
      this.selectedUnitId,
      this.inputLocked,
    );

    if (this.selectedUnitId && controlPointId) {
      this.submitAction({ type: "capture", unitId: this.selectedUnitId, controlPointId });
    }
  }

  private endPlayerTurn(): void {
    if (this.canHumanIssueOrders()) {
      this.submitAction({ type: "end-turn" });
    }
  }

  private submitAction(action: GameAction): void {
    if (!this.canHumanIssueOrders()) return;
    if (this.multiplayerSession?.role === "client") {
      this.multiplayerSession.requestAction(action);
      this.eventLog.push("ORDER SENT TO HOST.");
      return;
    }
    this.applyAcceptedAction(action, true);
  }

  private applyAcceptedAction(action: GameAction, publishToPeer: boolean): void {
    const result = applyAction(this.gameState, action);

    if (!result.accepted)
      return void this.eventLog.push(formatActionRejection(this.gameState, action));

    const previousState = this.gameState;
    this.gameState = result.state;
    this.recordTurnAction(action);
    this.recordReplayAction(action);
    if (publishToPeer && this.multiplayerSession?.role === "host") {
      this.actionSequence += 1;
      this.multiplayerSession.publishAcceptedAction(this.actionSequence, action);
    }
    this.presentAcceptedAction(previousState, action, result.events);
  }

  private runAiAction(): void {
    if (this.aiDelayEvent || this.aiInFlight || this.presenter?.busy || this.pauseMenu?.isOpen)
      return;
    this.aiPauseController.beginDelay();
    this.aiDelayEvent = this.time.delayedCall(AI_ACTION_DELAY, () => {
      this.aiDelayEvent = undefined;
      this.aiPauseController.delayStarted();
      void this.executeAiAction();
    });
  }

  private async executeAiAction(): Promise<void> {
    this.aiInFlight = true;
    const pauseController = this.aiPauseController;
    const participant = this.matchConfiguration[this.gameState.activeSide];
    const fallbackAgent = new HeuristicAgent();
    const agent = createAgentForParticipant(
      participant,
      this.matchConfiguration.lmStudioConnections[this.gameState.activeSide],
    );
    const context = { actionsThisTurn: this.aiTurnActions };
    const decision = agent
      ? await decideAiAction(this.gameState, context, agent, fallbackAgent)
      : { action: await fallbackAgent.chooseAction(this.gameState, context), usedFallback: true };
    const receipt = pauseController.receiveDecision(decision);
    if (pauseController !== this.aiPauseController) return;
    this.aiInFlight = false;
    if (receipt.kind !== "apply") return;
    this.applyAiDecision(decision);
  }

  private applyAiDecision(decision: AiActionDecision): void {
    const participant = this.matchConfiguration[this.gameState.activeSide];
    const result = applyAction(this.gameState, decision.action);

    if (!result.accepted) {
      throw new Error("AI returned an invalid action.");
    }

    const previousState = this.gameState;
    this.gameState = result.state;
    this.recordTurnAction(decision.action);
    this.recordReplayAction(decision.action);
    if (decision.usedFallback && participant === "lm-studio-ai") {
      this.eventLog.push(
        `${this.gameState.activeSide.toUpperCase()} LM Studio unavailable — Heuristic AI order used.`,
      );
    }
    this.presentAcceptedAction(previousState, decision.action, result.events);
  }

  private startAiTurnIfNeeded(): void {
    if (this.presenter?.busy || this.pauseMenu?.isOpen) return;
    if (this.multiplayerSession) {
      this.inputLocked =
        this.disconnected || this.gameState.activeSide !== this.multiplayerSession.localSide;
      this.renderGameState(this.displayedState, this.displayedState);
      return;
    }
    if (this.gameState.winner || this.isActiveSideHuman()) {
      this.inputLocked = false;
      return;
    }

    this.inputLocked = true;
    this.renderGameState(this.displayedState, this.displayedState);
    this.runAiAction();
  }

  private recordTurnAction(action: GameAction): void {
    this.aiTurnActions = action.type === "end-turn" ? [] : [...this.aiTurnActions, action];
  }

  private createPresenter(): void {
    this.presenter = new MovementPresenter(
      {
        render: (state) => this.renderGameState(this.displayedState ?? null, state),
        position: (id, position) => this.mapRenderer.setMovementPosition(id, position),
        clear: () => this.mapRenderer.clearMovementPositions(),
        settled: () => {
          if (!this.checkForResult()) this.startAiTurnIfNeeded();
          if (this.scene.isActive()) this.updateHud(this.displayedState);
        },
      },
      () => movementDuration(getMovementSettings().load()),
    );
  }

  private presentAcceptedAction(
    before: GameState,
    action: GameAction,
    events: readonly GameEvent[],
  ): void {
    this.presenter?.enqueue({
      before,
      after: this.gameState,
      route: movementRoute(before, action, true),
      complete: () => {
        this.clearSelectionAfterTurnEnd(action);
        this.addEventMessages(events);
        if (action.type === "end-turn") {
          this.renderGameState(this.displayedState, this.displayedState);
        }
      },
    });
  }

  private recordReplayAction(action: GameAction): void {
    this.replayActions = [...this.replayActions, action];
  }

  private clearSelectionAfterTurnEnd(action: GameAction): void {
    if (action.type === "end-turn") {
      this.selectedUnitId = null;
    }
  }

  private canHumanIssueOrders(): boolean {
    return (
      !this.inputLocked &&
      !this.disconnected &&
      !this.presenter?.busy &&
      !this.pauseMenu?.isOpen &&
      this.isActiveSideHuman()
    );
  }

  private isActiveSideHuman(): boolean {
    if (this.multiplayerSession)
      return this.gameState.activeSide === this.multiplayerSession.localSide;
    return isHumanTurn(this.matchConfiguration, this.gameState.activeSide);
  }

  private bindMultiplayerSession(): void {
    if (!this.multiplayerSession) return;
    this.multiplayerSession.setEvents({
      onActionRequest: (action) => this.applyAcceptedAction(action, true),
      onAcceptedAction: (sequence, action) => this.applyRemoteAcceptedAction(sequence, action),
      onSnapshot: (sequence, state) => this.applyRemoteSnapshot(sequence, state),
      onResyncRequest: () =>
        this.multiplayerSession?.publishSnapshot(this.actionSequence, this.gameState),
      onStatus: (status) => this.eventLog?.push(status),
      onDisconnect: () => {
        this.disconnected = true;
        this.inputLocked = true;
        this.eventLog?.push("CONNECTION LOST — MATCH PAUSED.");
        this.time.delayedCall(MULTIPLAYER_RECONNECT_TIMEOUT_MS, () => {
          if (!this.multiplayerSession?.isConnected) this.exitToMainMenu();
        });
      },
    });
  }

  private applyRemoteAcceptedAction(sequence: number, action: GameAction): void {
    if (sequence !== this.actionSequence + 1) {
      this.multiplayerSession?.requestResync();
      this.eventLog.push("OUT OF SYNC — REQUESTING SNAPSHOT.");
      return;
    }
    this.actionSequence = sequence;
    this.applyAcceptedAction(action, false);
  }

  private applyRemoteSnapshot(sequence: number, state: GameState): void {
    this.actionSequence = sequence;
    this.gameState = state;
    this.presenter?.reset(state);
    if (this.pauseMenu?.isOpen) this.presenter?.pause();
    this.disconnected = false;
    this.startAiTurnIfNeeded();
  }

  private checkForResult(): boolean {
    if (!this.gameState.winner) {
      return false;
    }

    const replay = createRecordedMatch({
      id: `replay-${Date.now()}`,
      name: `${this.gameState.winner.toUpperCase()} victory — ${this.replayMapDefinition.name}`,
      savedAt: new Date().toISOString(),
      mapDefinition: this.replayMapDefinition,
      matchConfiguration: this.matchConfiguration,
      actions: this.replayActions,
    });
    getBrowserReplayLibrary().save(replay);

    this.scene.start(RESULT_SCENE_KEY, {
      winner: this.gameState.winner,
      turn: this.gameState.turn,
      matchConfiguration: this.matchConfiguration,
      mapDefinition: this.mapDefinition ?? undefined,
      replayId: replay.id,
    });

    return true;
  }

  private renderGameState(previousState: GameState | null, nextState: GameState): void {
    this.displayedState = nextState;
    this.updateMovementHighlights(nextState);
    this.updateAttackHighlights(nextState);
    this.updateUnitViews(previousState, nextState);
    this.updateHud(nextState);
  }

  private updateMovementHighlights(state: GameState): void {
    if (!this.movementHighlightLayer) {
      return;
    }

    this.movementHighlightLayer.clear();

    for (const position of getMovementHighlightPositions(
      state,
      this.selectedUnitId,
      !this.canHumanIssueOrders(),
    )) {
      const point = this.toScreenPosition(position);
      const tileX = point.x - TILE_CENTER;
      const tileY = point.y - TILE_CENTER;

      this.movementHighlightLayer.fillStyle(
        MOVEMENT_HIGHLIGHT_COLOR,
        MOVEMENT_HIGHLIGHT_FILL_ALPHA,
      );
      this.movementHighlightLayer.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
      this.movementHighlightLayer.lineStyle(
        MOVEMENT_HIGHLIGHT_BORDER_WIDTH,
        MOVEMENT_HIGHLIGHT_COLOR,
        MOVEMENT_HIGHLIGHT_BORDER_ALPHA,
      );
      this.movementHighlightLayer.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
    }
  }

  private updateAttackHighlights(state: GameState): void {
    if (!this.attackHighlightLayer) {
      return;
    }

    this.attackHighlightLayer.clear();
    this.attackHighlightLayer.fillStyle(ATTACK_HIGHLIGHT_COLOR, ATTACK_HIGHLIGHT_FILL_ALPHA);

    for (const position of getAttackHighlightPositions(
      state,
      this.selectedUnitId,
      !this.canHumanIssueOrders(),
    )) {
      const point = this.toScreenPosition(position);
      this.attackHighlightLayer.fillRect(
        point.x - TILE_CENTER,
        point.y - TILE_CENTER,
        TILE_SIZE,
        TILE_SIZE,
      );
    }
  }

  private updateUnitViews(_previousState: GameState | null, nextState: GameState): void {
    if (this.mapRenderer.hasLoadedAssets()) {
      this.mapRenderer.renderState(nextState);
      this.updateSelectionView(nextState);
      this.mapRenderer.bringHealthLabelsToFront();
      return;
    }

    if (!DIAGNOSTIC_MODE) {
      return;
    }

    this.drawDiagnosticUnitMarkers(nextState);
    this.updateSelectionView(nextState);
  }

  private drawDiagnosticUnitMarkers(state: GameState): void {
    if (this.diagnosticUnitLayer)
      drawDiagnosticUnits(this.diagnosticUnitLayer, state, (position) =>
        this.toScreenPosition(position),
      );
  }

  private updateSelectionView(state: GameState): void {
    this.selectionView?.destroy();
    this.selectionView = null;
    const selectedUnit = this.selectedUnitId ? state.units[this.selectedUnitId] : undefined;

    if (!selectedUnit) {
      return;
    }

    const point = this.toScreenPosition(selectedUnit.position);
    this.selectionView = this.add
      .rectangle(point.x, point.y, TILE_SIZE, TILE_SIZE)
      .setStrokeStyle(BOARD_BORDER_WIDTH, DIAGNOSTIC_SELECTION_COLOR);
    this.worldContainer.add(this.selectionView);
  }

  private updateHud(state: GameState): void {
    const selectedUnit = this.selectedUnitId ? state.units[this.selectedUnitId] : undefined;
    this.activeTurnText.setText(
      `Turn ${state.turn} — ${state.activeSide.toUpperCase()}${this.getAiThinkingSuffix()}`,
    );
    this.scoreText.setText(`B ${state.scores.blue}  R ${state.scores.red}`);
    this.selectedUnitText.setText(
      formatSelectedUnit(state, selectedUnit, state.activeSide, this.isActiveSideHuman()),
    );

    if (selectedUnit) {
      this.healthBar.setValue(selectedUnit.health, selectedUnit.maxHealth);
    } else {
      this.healthBar.setValue(NO_UNIT_COUNT, NO_UNIT_COUNT);
    }

    const canIssueOrders = this.canHumanIssueOrders();
    this.waitButton.setEnabled(
      canIssueOrders && selectedUnit !== undefined && !selectedUnit.hasTakenMainAction,
    );
    this.endTurnButton.setEnabled(canIssueOrders);
    this.captureButton.setEnabled(
      canIssueOrders && getCapturableControlPointId(state, this.selectedUnitId, false) !== null,
    );
  }

  private getAiThinkingSuffix(): string {
    if (this.isActiveSideHuman() || !this.inputLocked) return "";
    return this.matchConfiguration[this.gameState.activeSide] === "lm-studio-ai"
      ? " — LM STUDIO THINKING..."
      : " — AI THINKING";
  }

  private addEventMessages(events: readonly GameEvent[]): void {
    for (const event of events) {
      this.eventLog.push(formatEvent(event));
    }
  }

  private toScreenPosition(position: Position): Position {
    return {
      x: BOARD_ORIGIN_X + position.x * TILE_SIZE + TILE_CENTER,
      y: BOARD_ORIGIN_Y + position.y * TILE_SIZE + TILE_CENTER,
    };
  }

  private toBoardPosition(point: Position): Position | null {
    const x = Math.floor((point.x - BOARD_ORIGIN_X) / TILE_SIZE);
    const y = Math.floor((point.y - BOARD_ORIGIN_Y) / TILE_SIZE);

    return x >= 0 && x < this.gameState.board.width && y >= 0 && y < this.gameState.board.height
      ? { x, y }
      : null;
  }

  private toLogicalPointer(pointer: Phaser.Input.Pointer): Position | null {
    const { x, y, width, height, scale } = this.presentationViewport;
    const pointerX = pointer.x - x;
    const pointerY = pointer.y - y;

    if (pointerX < 0 || pointerX >= width || pointerY < 0 || pointerY >= height) {
      return null;
    }

    return { x: Math.floor(pointerX / scale), y: Math.floor(pointerY / scale) };
  }
}
