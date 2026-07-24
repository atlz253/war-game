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
import { createRecordedMatch } from "../replays/recorded-match";
import { getBrowserReplayLibrary } from "../replays/replay-library";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { PauseMenu } from "../ui/components/PauseMenu";
import { ProgressBar } from "../ui/components/ProgressBar";
import { ScrollableList } from "../ui/components/ScrollableList";
import { uiTheme } from "../ui/theme/ui-theme";
import { BattleAiPauseController } from "./battle-ai-pause-controller";
import { calculateWorldViewportWidth } from "./battle-presentation";
import {
  findUnitAt,
  formatEvent,
  formatSelectedUnit,
  isInsideRectangle,
} from "./battle-view-helpers";
import { calculateCameraCenterLimits } from "./camera-presentation";
import { MAIN_MENU_SCENE_KEY, RESULT_SCENE_KEY } from "./scene-keys";

const TILE_SIZE = 512;
const BOARD_ORIGIN_X = 0;
const BOARD_ORIGIN_Y = 56;
const TILE_CENTER = TILE_SIZE / 2;
const BOARD_BORDER_WIDTH = 8;
const HUD_X = 3104;
const HUD_WIDTH = 704;
const TOP_PANEL_Y = 56;
const TOP_PANEL_HEIGHT = 300;
const SELECTED_PANEL_Y = 388;
const SELECTED_PANEL_HEIGHT = 480;
const LOG_PANEL_Y = 900;
const LOG_PANEL_HEIGHT = 1204;
const PANEL_CONTENT_X = HUD_X + uiTheme.spacing.md;
const TOP_TEXT_OFFSET = 128;
const TOP_TEXT_Y = TOP_PANEL_Y + TOP_TEXT_OFFSET;
const SCORE_TEXT_OFFSET_X = 384;
const SCORE_TEXT_X = HUD_X + SCORE_TEXT_OFFSET_X;
const SCORE_TEXT_Y = TOP_PANEL_Y + uiTheme.spacing.sm;
const SELECTED_TEXT_OFFSET = 128;
const SELECTED_TEXT_Y = SELECTED_PANEL_Y + SELECTED_TEXT_OFFSET;
const SELECTED_HEALTH_BAR_OFFSET = 264;
const SELECTED_HEALTH_BAR_Y = SELECTED_PANEL_Y + SELECTED_HEALTH_BAR_OFFSET;
const SELECTED_HEALTH_BAR_WIDTH = 256;
const SELECTED_HEALTH_BAR_HEIGHT = 32;
const LOG_TEXT_OFFSET = 128;
const LOG_TEXT_Y = LOG_PANEL_Y + LOG_TEXT_OFFSET;
const END_BUTTON_X = 3652;
const END_BUTTON_Y = 292;
const WAIT_BUTTON_X = 3392;
const WAIT_BUTTON_Y = 292;
const BUTTON_WIDTH = 224;
const BUTTON_HEIGHT = 96;
const CAPTURE_BUTTON_WIDTH = 448;
const CAPTURE_BUTTON_OFFSET_Y = 388;
const CAPTURE_BUTTON_X = HUD_X + HUD_WIDTH / 2;
const CAPTURE_BUTTON_Y = SELECTED_PANEL_Y + CAPTURE_BUTTON_OFFSET_Y;
const EVENT_LOG_ENTRIES = 10;
const AI_ACTION_DELAY = 500;
const CAMERA_SCROLL_SPEED = 2400;
const CAMERA_DECELERATION = 8;
const ZOOM_RESPONSE_PER_SECOND = 8;
const MILLISECONDS_PER_SECOND = 1000;
const NO_UNIT_COUNT = 0;
const DIAGNOSTIC_TILE_COLOR_A = 0x31513a;
const DIAGNOSTIC_TILE_COLOR_B = 0x2a4633;
const DIAGNOSTIC_BLUE_UNIT_COLOR = 0x4e9fce;
const DIAGNOSTIC_RED_UNIT_COLOR = 0xc64d4d;
const DIAGNOSTIC_SELECTION_COLOR = 0xf2f5f7;
const DIAGNOSTIC_CONTROL_POINT_COLOR = 0xe0bd5b;
const DIAGNOSTIC_TILE_ALTERNATION = 2;
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
}

export class BattleScene extends Phaser.Scene {
  private worldContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private presentationViewport!: PresentationViewport;
  private gameState!: GameState;
  private mapDefinition: MapDefinition | null = null;
  private replayMapDefinition!: MapDefinition;
  private matchConfiguration = createDefaultMatchConfiguration();
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
  private eventLog!: ScrollableList;
  private waitButton!: Button;
  private endTurnButton!: Button;
  private captureButton!: Button;
  private selectionView: Phaser.GameObjects.Rectangle | null = null;
  private diagnosticUnitLayer: Phaser.GameObjects.Graphics | null = null;
  private movementHighlightLayer: Phaser.GameObjects.Graphics | null = null;
  private attackHighlightLayer: Phaser.GameObjects.Graphics | null = null;
  private mapRenderer!: BattleMapRenderer;
  private pauseMenu!: PauseMenu;
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
    this.gameState = this.mapDefinition
      ? createGameStateFromMap(this.mapDefinition)
      : createSkirmishGameState();
    this.replayMapDefinition =
      this.mapDefinition ?? createMapDefinitionFromState(this.gameState, "Skirmish 12×8");
    this.matchConfiguration = data.matchConfiguration ?? createDefaultMatchConfiguration();
    this.mapZoom = INITIAL_MAP_ZOOM;
    this.targetMapZoom = INITIAL_MAP_ZOOM;
    this.worldContainer = this.add.container();
    this.hudContainer = this.add.container().setScrollFactor(0);
    this.configureCameras();
    this.createWorld();
    this.createHud();
    this.createPauseMenu();
    this.bindInput();
    this.renderGameState(null, this.gameState);
    this.startAiTurnIfNeeded();
  }

  private resetRenderingState(): void {
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
    this.cameraVelocity = { x: 0, y: 0 };
    this.cameraCenter = { x: 0, y: 0 };
    this.zoomAnchor = null;
  }

  public update(_time: number, delta: number): void {
    if (this.pauseMenu.isOpen) return;
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

    for (let y = 0; y < this.gameState.board.height; y += 1) {
      for (let x = 0; x < this.gameState.board.width; x += 1) {
        this.addDiagnosticTile(x, y);
      }
    }

    this.createMovementHighlightLayer();
    this.createAttackHighlightLayer();

    for (const controlPoint of Object.values(this.gameState.controlPoints)) {
      const point = this.toScreenPosition(controlPoint.position);
      this.worldContainer.add(
        this.add.rectangle(
          point.x,
          point.y,
          TILE_CENTER,
          TILE_CENTER,
          DIAGNOSTIC_CONTROL_POINT_COLOR,
        ),
      );
    }

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

  private addDiagnosticTile(x: number, y: number): void {
    const point = this.toScreenPosition({ x, y });
    const color =
      (x + y) % DIAGNOSTIC_TILE_ALTERNATION === 0
        ? DIAGNOSTIC_TILE_COLOR_A
        : DIAGNOSTIC_TILE_COLOR_B;
    const tile = this.add
      .rectangle(point.x, point.y, TILE_SIZE, TILE_SIZE, color)
      .setStrokeStyle(BOARD_BORDER_WIDTH, uiTheme.colors.background);

    this.worldContainer.add(tile);
  }

  private createHud(): void {
    const turnPanel = new Panel(this, {
      x: HUD_X,
      y: TOP_PANEL_Y,
      width: HUD_WIDTH,
      height: TOP_PANEL_HEIGHT,
      title: "TURN",
    });
    const selectedPanel = new Panel(this, {
      x: HUD_X,
      y: SELECTED_PANEL_Y,
      width: HUD_WIDTH,
      height: SELECTED_PANEL_HEIGHT,
      title: "SELECTED UNIT",
    });
    const logPanel = new Panel(this, {
      x: HUD_X,
      y: LOG_PANEL_Y,
      width: HUD_WIDTH,
      height: LOG_PANEL_HEIGHT,
      title: "EVENT LOG",
    });
    this.activeTurnText = this.addText(PANEL_CONTENT_X, TOP_TEXT_Y, "");
    this.scoreText = this.addScoreText(SCORE_TEXT_X, SCORE_TEXT_Y, "");
    this.selectedUnitText = this.addText(PANEL_CONTENT_X, SELECTED_TEXT_Y, "Select a Blue unit.");
    this.healthBar = new ProgressBar(this, {
      x: PANEL_CONTENT_X,
      y: SELECTED_HEALTH_BAR_Y,
      width: SELECTED_HEALTH_BAR_WIDTH,
      height: SELECTED_HEALTH_BAR_HEIGHT,
      color: uiTheme.colors.primary,
    });
    this.eventLog = new ScrollableList(this, {
      x: PANEL_CONTENT_X,
      y: LOG_TEXT_Y,
      width: HUD_WIDTH - uiTheme.spacing.lg,
      maxEntries: EVENT_LOG_ENTRIES,
    });
    this.waitButton = new Button(this, {
      x: WAIT_BUTTON_X,
      y: WAIT_BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "WAIT",
      onClick: () => this.waitSelectedUnit(),
    });
    this.endTurnButton = new Button(this, {
      x: END_BUTTON_X,
      y: END_BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "END TURN",
      onClick: () => this.endPlayerTurn(),
    });
    this.captureButton = new Button(this, {
      x: CAPTURE_BUTTON_X,
      y: CAPTURE_BUTTON_Y,
      width: CAPTURE_BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "CAPTURE POINT",
      onClick: () => this.captureSelectedControlPoint(),
    });
    this.hudContainer.add([
      turnPanel.container,
      selectedPanel.container,
      logPanel.container,
      this.activeTurnText,
      this.scoreText,
      this.selectedUnitText,
      this.healthBar.container,
      this.eventLog.container,
      this.waitButton.container,
      this.endTurnButton.container,
      this.captureButton.container,
    ]);
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.pauseMenu.isOpen) return;
      if (this.handleHudClick(pointer)) {
        return;
      }

      this.handleBoardClick(pointer);
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (pointer: Phaser.Input.Pointer, _objects: unknown[], _x: number, y: number) => {
        if (this.pauseMenu.isOpen) return;
        this.zoomWorldCamera(pointer, y);
      },
    );
    this.bindPauseKey();
  }

  private createPauseMenu(): void {
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.resumeFromPause(),
      onExit: () => this.exitToMainMenu(),
    });
    this.cameras.main.ignore([this.pauseMenu.overlay, this.pauseMenu.container]);
    this.updatePauseMenuPresentation();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownPauseMenu, this);
  }
  private updatePauseMenuPresentation(): void {
    if (!this.pauseMenu) return;
    this.pauseMenu.container
      .setPosition(this.presentationViewport.contentX, this.presentationViewport.contentY)
      .setScale(this.presentationViewport.scale);
    this.pauseMenu.setOverlaySize(this.scale.width, this.scale.height);
  }
  private bindPauseKey(): void {
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey?.on(Phaser.Input.Keyboard.Events.DOWN, this.handleEscapeKey, this);
  }
  private handleEscapeKey(): void {
    if (this.pauseMenu.isOpen) this.resumeFromPause();
    else this.openPauseMenu();
  }
  private openPauseMenu(): void {
    const { cancelDelay } = this.aiPauseController.pause();
    if (cancelDelay) this.aiDelayEvent?.remove(false);
    if (cancelDelay) this.aiDelayEvent = undefined;
    this.stopCameraMotion();
    this.pauseMenu.open();
  }
  private resumeFromPause(): void {
    this.pauseMenu.close();
    const resume = this.aiPauseController.resume();
    if (resume.kind === "apply") this.applyAiDecision(resume.decision);
    if (resume.kind === "start-delay") this.runAiAction();
  }
  private exitToMainMenu(): void {
    this.aiPauseController.exit();
    this.aiDelayEvent?.remove(false);
    this.aiDelayEvent = undefined;
    this.scene.start(MAIN_MENU_SCENE_KEY, { matchConfiguration: this.matchConfiguration });
  }
  private shutdownPauseMenu(): void {
    this.aiPauseController.exit();
    this.aiDelayEvent?.remove(false);
    this.aiDelayEvent = undefined;
    this.escapeKey?.off(Phaser.Input.Keyboard.Events.DOWN, this.handleEscapeKey, this);
  }

  private zoomWorldCamera(pointer: Phaser.Input.Pointer, wheelDeltaY: number): void {
    const logicalPointer = this.toLogicalPointer(pointer);

    if (!logicalPointer || logicalPointer.x >= HUD_X) {
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
    const logicalPointer = this.toLogicalPointer(pointer);

    if (!logicalPointer) {
      return true;
    }

    if (
      isInsideRectangle(
        logicalPointer,
        WAIT_BUTTON_X,
        WAIT_BUTTON_Y,
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
      ) ||
      isInsideRectangle(logicalPointer, END_BUTTON_X, END_BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT) ||
      isInsideRectangle(
        logicalPointer,
        CAPTURE_BUTTON_X,
        CAPTURE_BUTTON_Y,
        CAPTURE_BUTTON_WIDTH,
        BUTTON_HEIGHT,
      )
    ) {
      return true;
    }

    return logicalPointer.x >= HUD_X;
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
    const result = applyAction(this.gameState, action);

    if (!result.accepted) {
      this.eventLog.push("Order rejected.");
      return;
    }

    const previousState = this.gameState;
    this.gameState = result.state;
    this.recordTurnAction(action);
    this.recordReplayAction(action);
    this.clearSelectionAfterTurnEnd(action);
    this.addEventMessages(result.events);
    this.renderGameState(previousState, this.gameState);
    this.checkForResult();

    this.startAiTurnIfNeeded();
  }

  private runAiAction(): void {
    this.aiPauseController.beginDelay();
    this.aiDelayEvent = this.time.delayedCall(AI_ACTION_DELAY, () => {
      this.aiDelayEvent = undefined;
      this.aiPauseController.delayStarted();
      void this.executeAiAction();
    });
  }

  private async executeAiAction(): Promise<void> {
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
    const receipt = this.aiPauseController.receiveDecision(decision);
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
    this.clearSelectionAfterTurnEnd(decision.action);
    if (decision.usedFallback && participant === "lm-studio-ai") {
      this.eventLog.push(
        `${this.gameState.activeSide.toUpperCase()} LM Studio unavailable — Heuristic AI order used.`,
      );
    }
    this.addEventMessages(result.events);
    this.renderGameState(previousState, this.gameState);

    if (!this.checkForResult()) this.startAiTurnIfNeeded();
  }

  private startAiTurnIfNeeded(): void {
    if (this.gameState.winner || this.isActiveSideHuman()) {
      this.inputLocked = false;
      return;
    }

    this.inputLocked = true;
    this.renderGameState(this.gameState, this.gameState);
    this.runAiAction();
  }

  private recordTurnAction(action: GameAction): void {
    this.aiTurnActions = action.type === "end-turn" ? [] : [...this.aiTurnActions, action];
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
    return !this.inputLocked && this.isActiveSideHuman();
  }

  private isActiveSideHuman(): boolean {
    return isHumanTurn(this.matchConfiguration, this.gameState.activeSide);
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
      this.inputLocked,
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
      this.inputLocked,
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
    if (!this.diagnosticUnitLayer) {
      return;
    }

    this.diagnosticUnitLayer.clear();

    for (const unit of Object.values(state.units)) {
      const point = this.toScreenPosition(unit.position);
      const color = unit.side === "blue" ? DIAGNOSTIC_BLUE_UNIT_COLOR : DIAGNOSTIC_RED_UNIT_COLOR;
      this.diagnosticUnitLayer.fillStyle(color);
      this.diagnosticUnitLayer.fillRect(
        point.x - TILE_CENTER + uiTheme.spacing.xs,
        point.y - TILE_CENTER + uiTheme.spacing.xs,
        TILE_SIZE - uiTheme.spacing.sm,
        TILE_SIZE - uiTheme.spacing.sm,
      );
    }
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
      getCapturableControlPointId(state, this.selectedUnitId, this.inputLocked) !== null,
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

  private addText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.normalSize}px`,
    });
  }

  private addScoreText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color: uiTheme.colors.mutedText,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.smallSize}px`,
    });
  }
}
