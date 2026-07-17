import Phaser from "phaser";

import { HeuristicAgent } from "../../ai/agents/HeuristicAgent";
import type { GameAction } from "../../core/actions/game-actions";
import type { GameEvent } from "../../core/model/game-events";
import type { GameState, Position, UnitState } from "../../core/model/game-state";
import { applyAction } from "../../core/rules/apply-action";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  createSkirmishGameState,
} from "../../core/scenarios/skirmish-12x8";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { ProgressBar } from "../ui/components/ProgressBar";
import { ScrollableList } from "../ui/components/ScrollableList";
import { uiTheme } from "../ui/theme/ui-theme";
import { RESULT_SCENE_KEY } from "./scene-keys";

const TILE_SIZE = 32;
const BOARD_ORIGIN_X = 32;
const BOARD_ORIGIN_Y = 120;
const TILE_CENTER = TILE_SIZE / 2;
const BOARD_BORDER_WIDTH = 1;
const HUD_X = 456;
const HUD_WIDTH = 472;
const TOP_PANEL_Y = 24;
const TOP_PANEL_HEIGHT = 76;
const SELECTED_PANEL_Y = 116;
const SELECTED_PANEL_HEIGHT = 132;
const LOG_PANEL_Y = 264;
const LOG_PANEL_HEIGHT = 240;
const PANEL_CONTENT_X = HUD_X + uiTheme.spacing.md;
const TOP_TEXT_OFFSET = 38;
const TOP_TEXT_Y = TOP_PANEL_Y + TOP_TEXT_OFFSET;
const SELECTED_TEXT_OFFSET = 38;
const SELECTED_TEXT_Y = SELECTED_PANEL_Y + SELECTED_TEXT_OFFSET;
const SELECTED_HEALTH_BAR_OFFSET = 76;
const SELECTED_HEALTH_BAR_Y = SELECTED_PANEL_Y + SELECTED_HEALTH_BAR_OFFSET;
const SELECTED_HEALTH_BAR_WIDTH = 180;
const SELECTED_HEALTH_BAR_HEIGHT = 12;
const LOG_TEXT_OFFSET = 36;
const LOG_TEXT_Y = LOG_PANEL_Y + LOG_TEXT_OFFSET;
const END_BUTTON_X = 848;
const END_BUTTON_Y = 61;
const WAIT_BUTTON_X = 736;
const WAIT_BUTTON_Y = 61;
const BUTTON_WIDTH = 96;
const BUTTON_HEIGHT = 32;
const EVENT_LOG_ENTRIES = 10;
const AI_ACTION_DELAY = 350;
const CAMERA_SCROLL_SPEED = 300;
const MILLISECONDS_PER_SECOND = 1000;
const WHEEL_ZOOM_STEP = 0.001;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2;
const INITIAL_ZOOM = 1;
const NO_UNIT_COUNT = 0;
const DIAGNOSTIC_TILE_COLOR_A = 0x31513a;
const DIAGNOSTIC_TILE_COLOR_B = 0x2a4633;
const DIAGNOSTIC_BLUE_UNIT_COLOR = 0x4e9fce;
const DIAGNOSTIC_RED_UNIT_COLOR = 0xc64d4d;
const DIAGNOSTIC_SELECTION_COLOR = 0xf2f5f7;
const DIAGNOSTIC_CONTROL_POINT_COLOR = 0xe0bd5b;
const DIAGNOSTIC_TILE_ALTERNATION = 2;
const DIAGNOSTIC_MODE = import.meta.env.DEV;

export class BattleScene extends Phaser.Scene {
  private worldContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private gameState!: GameState;
  private selectedUnitId: string | null = null;
  private inputLocked = false;
  private selectedUnitText!: Phaser.GameObjects.Text;
  private activeTurnText!: Phaser.GameObjects.Text;
  private readonly aiAgent = new HeuristicAgent();
  private healthBar!: ProgressBar;
  private eventLog!: ScrollableList;
  private waitButton!: Button;
  private endTurnButton!: Button;
  private selectionView: Phaser.GameObjects.Rectangle | null = null;
  private diagnosticUnitLayer: Phaser.GameObjects.Graphics | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

  public constructor() {
    super("battle");
  }

  public create(): void {
    this.gameState = createSkirmishGameState();
    this.worldContainer = this.add.container();
    this.hudContainer = this.add.container().setScrollFactor(0);
    this.configureCameras();
    this.createWorld();
    this.createHud();
    this.bindInput();
    this.renderGameState(null, this.gameState);
  }

  public update(_time: number, delta: number): void {
    const camera = this.cameras.main;
    const distance = (CAMERA_SCROLL_SPEED * delta) / MILLISECONDS_PER_SECOND;

    if (this.cursors?.left.isDown || this.wasdKeys?.left.isDown) {
      camera.scrollX -= distance;
    }
    if (this.cursors?.right.isDown || this.wasdKeys?.right.isDown) {
      camera.scrollX += distance;
    }
    if (this.cursors?.up.isDown || this.wasdKeys?.up.isDown) {
      camera.scrollY -= distance;
    }
    if (this.cursors?.down.isDown || this.wasdKeys?.down.isDown) {
      camera.scrollY += distance;
    }
  }

  private configureCameras(): void {
    const boardWidth = BOARD_WIDTH * TILE_SIZE;
    const boardHeight = BOARD_HEIGHT * TILE_SIZE;
    const worldCamera = this.cameras.main;
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);

    worldCamera
      .setBounds(BOARD_ORIGIN_X, BOARD_ORIGIN_Y, boardWidth, boardHeight)
      .setZoom(INITIAL_ZOOM);
    worldCamera.ignore(this.hudContainer);
    this.uiCamera.ignore(this.worldContainer);
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

  private createWorld(): void {
    if (!DIAGNOSTIC_MODE) {
      return;
    }

    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        this.addDiagnosticTile(x, y);
      }
    }

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
    this.uiCamera.ignore(this.diagnosticUnitLayer);
    this.drawDiagnosticUnitMarkers(this.gameState);
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
    this.hudContainer.add([
      turnPanel.container,
      selectedPanel.container,
      logPanel.container,
      this.activeTurnText,
      this.selectedUnitText,
      this.healthBar.container,
      this.eventLog.container,
      this.waitButton.container,
      this.endTurnButton.container,
    ]);
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.handleHudClick(pointer)) {
        return;
      }

      if (pointer.x < HUD_X) {
        this.handleBoardClick(pointer);
      }
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_pointer: Phaser.Input.Pointer, _objects: unknown[], _x: number, y: number) => {
        const camera = this.cameras.main;
        camera.setZoom(Phaser.Math.Clamp(camera.zoom - y * WHEEL_ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
      },
    );
  }

  private handleHudClick(pointer: Phaser.Input.Pointer): boolean {
    if (isInsideButton(pointer, WAIT_BUTTON_X, WAIT_BUTTON_Y)) {
      this.waitSelectedUnit();
      return true;
    }

    if (isInsideButton(pointer, END_BUTTON_X, END_BUTTON_Y)) {
      this.endPlayerTurn();
      return true;
    }

    return pointer.x >= HUD_X;
  }

  private handleBoardClick(pointer: Phaser.Input.Pointer): void {
    if (this.inputLocked || this.gameState.activeSide !== "blue") {
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const position = this.toBoardPosition(worldPoint);

    if (!position) {
      return;
    }

    const clickedUnit = findUnitAt(this.gameState, position);

    if (clickedUnit?.side === "blue") {
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

    const controlPoint = Object.values(this.gameState.controlPoints).find((point) =>
      positionsEqual(point.position, position),
    );

    if (controlPoint) {
      this.submitAction({
        type: "capture",
        unitId: this.selectedUnitId,
        controlPointId: controlPoint.id,
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

  private endPlayerTurn(): void {
    if (!this.inputLocked && this.gameState.activeSide === "blue") {
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
    this.addEventMessages(result.events);
    this.renderGameState(previousState, this.gameState);
    this.checkForResult();

    if (
      action.type === "end-turn" &&
      this.gameState.activeSide === "red" &&
      !this.gameState.winner
    ) {
      this.inputLocked = true;
      this.runAiAction();
    }
  }

  private runAiAction(): void {
    this.time.delayedCall(AI_ACTION_DELAY, () => {
      const action = this.aiAgent.chooseAction(this.gameState);
      const result = applyAction(this.gameState, action);

      if (!result.accepted) {
        throw new Error("HeuristicAgent returned an invalid action.");
      }

      const previousState = this.gameState;
      this.gameState = result.state;
      this.addEventMessages(result.events);
      this.renderGameState(previousState, this.gameState);

      if (this.checkForResult()) {
        return;
      }

      if (this.gameState.activeSide === "red") {
        this.runAiAction();
      } else {
        this.inputLocked = false;
      }
    });
  }

  private checkForResult(): boolean {
    if (!this.gameState.winner) {
      return false;
    }

    this.scene.start(RESULT_SCENE_KEY, {
      winner: this.gameState.winner,
      turn: this.gameState.turn,
    });

    return true;
  }

  private renderGameState(previousState: GameState | null, nextState: GameState): void {
    this.updateUnitViews(previousState, nextState);
    this.updateHud(nextState);
  }

  private updateUnitViews(_previousState: GameState | null, nextState: GameState): void {
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
    this.uiCamera.ignore(this.selectionView);
  }

  private updateHud(state: GameState): void {
    const selectedUnit = this.selectedUnitId ? state.units[this.selectedUnitId] : undefined;
    this.activeTurnText.setText(
      `Turn ${state.turn} — ${state.activeSide.toUpperCase()}${this.inputLocked ? " AI thinking" : ""}`,
    );
    this.selectedUnitText.setText(formatSelectedUnit(selectedUnit));

    if (selectedUnit) {
      this.healthBar.setValue(selectedUnit.health, selectedUnit.maxHealth);
    } else {
      this.healthBar.setValue(NO_UNIT_COUNT, NO_UNIT_COUNT);
    }

    const canIssueOrders = state.activeSide === "blue" && !this.inputLocked;
    this.waitButton.setEnabled(
      canIssueOrders && selectedUnit !== undefined && !selectedUnit.hasTakenMainAction,
    );
    this.endTurnButton.setEnabled(canIssueOrders);
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

    return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT ? { x, y } : null;
  }

  private addText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.normalSize}px`,
    });
  }
}

function findUnitAt(state: GameState, position: Position): UnitState | undefined {
  return Object.values(state.units).find((unit) => positionsEqual(unit.position, position));
}

function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}

function formatSelectedUnit(unit: UnitState | undefined): string {
  if (!unit) {
    return "Select a Blue unit.";
  }

  return `${unit.type.toUpperCase()}\nHP ${unit.health}/${unit.maxHealth}  MP ${unit.movementPoints}/${unit.maxMovementPoints}\nRange ${unit.attackRange}  Action ${unit.hasTakenMainAction ? "used" : "ready"}`;
}

function formatEvent(event: GameEvent): string {
  switch (event.type) {
    case "unit-moved":
      return `${event.unitId} moved.`;
    case "unit-attacked":
      return `${event.attackerUnitId} attacked ${event.targetUnitId}.`;
    case "unit-damaged":
      return `${event.unitId} took ${event.damage} damage.`;
    case "unit-destroyed":
      return `${event.unitId} was destroyed.`;
    case "control-point-captured":
      return `${event.owner} captured ${event.controlPointId}.`;
    case "unit-waited":
      return `${event.unitId} waited.`;
    case "turn-ended":
      return `Turn ${event.turn}: ${event.activeSide}.`;
    case "victory-achieved":
      return `${event.winner.toUpperCase()} wins.`;
  }
}

function isInsideButton(pointer: Phaser.Input.Pointer, centerX: number, centerY: number): boolean {
  const halfWidth = BUTTON_WIDTH / 2;
  const halfHeight = BUTTON_HEIGHT / 2;

  return (
    pointer.x >= centerX - halfWidth &&
    pointer.x <= centerX + halfWidth &&
    pointer.y >= centerY - halfHeight &&
    pointer.y <= centerY + halfHeight
  );
}
