import type Phaser from "phaser";

import { getLegalActions } from "../../core/actions/get-legal-actions";
import type { GameState, Position, UnitState } from "../../core/model/game-state";
import { assetManifest } from "../assets/asset-manifest";
import {
  getControlPointTextureKey,
  getTerrainTextureKey,
  getUnitTextureKey,
} from "../scenes/battle-view-helpers";
import { uiTheme } from "../ui/theme/ui-theme";
import {
  calculateUnitHealthLabelScale,
  calculateUnitHealthLabelY,
  formatUnitHealthLabel,
} from "./unit-health-label";
import { WorldBackground } from "./world-background";

const UNIT_HEALTH_LABEL_GAP = 24;
const UNIT_HEALTH_LABEL_PADDING_X = 16;
const UNIT_HEALTH_LABEL_PADDING_Y = 8;
const UNIT_HEALTH_LABEL_BACKGROUND_COLOR = 0x101820;
const UNIT_HEALTH_LABEL_BACKGROUND_ALPHA = 0.85;
const UNIT_HEALTH_LABEL_BORDER_COLOR = 0xeaf4ff;
const UNIT_HEALTH_LABEL_BORDER_WIDTH = 4;
const MOVED_UNIT_TINT = 0x8d8d8d;
const DOUBLE_SIZE_MULTIPLIER = 2;
const CENTER_ORIGIN = 0.5;

export interface BattleMapRendererOptions {
  readonly boardOriginX: number;
  readonly boardOriginY: number;
  readonly tileSize: number;
  readonly initialZoom: number;
}

interface UnitHealthView {
  readonly container: Phaser.GameObjects.Container;
  readonly background: Phaser.GameObjects.Rectangle;
  readonly text: Phaser.GameObjects.Text;
}

export class BattleMapRenderer {
  private readonly unitViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly unitHealthViews = new Map<string, UnitHealthView>();
  private readonly controlPointViews = new Map<string, Phaser.GameObjects.Image>();
  private worldBackground?: WorldBackground;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly worldContainer: Phaser.GameObjects.Container,
    private readonly options: BattleMapRendererOptions,
  ) {}

  public hasLoadedAssets(): boolean {
    return this.scene.textures.exists(assetManifest.terrain.plain.textureKey);
  }

  public createTerrain(state: GameState): void {
    const boardWidth = state.board.width * this.options.tileSize;
    const boardHeight = state.board.height * this.options.tileSize;
    this.worldBackground = new WorldBackground(this.scene, this.worldContainer, {
      boardLeft: this.options.boardOriginX,
      boardTop: this.options.boardOriginY,
      boardWidth,
      boardHeight,
    });
    const tile = this.scene.add.tileSprite(
      this.options.boardOriginX + boardWidth / DOUBLE_SIZE_MULTIPLIER,
      this.options.boardOriginY + boardHeight / DOUBLE_SIZE_MULTIPLIER,
      boardWidth,
      boardHeight,
      assetManifest.terrain.plain.textureKey,
    );
    this.worldContainer.add(tile);

    for (const terrain of state.board.terrain) {
      const point = this.toScreenPosition(terrain.position);
      this.worldContainer.add(
        this.scene.add.image(point.x, point.y, getTerrainTextureKey(terrain.type)),
      );
    }
  }

  public renderState(state: GameState): void {
    this.updateControlPointViews(state);
    this.updateUnitViews(state, getUnitsWithAvailableMainActions(state));
    this.bringHealthLabelsToFront();
  }

  public updateHealthLabelScales(cameraZoom: number): void {
    this.worldBackground?.refresh();
    const scale = calculateUnitHealthLabelScale(cameraZoom);
    for (const healthView of this.unitHealthViews.values()) healthView.container.setScale(scale);
  }

  public bringHealthLabelsToFront(): void {
    for (const healthView of this.unitHealthViews.values()) {
      this.worldContainer.bringToTop(healthView.container);
    }
  }

  public reset(): void {
    this.worldBackground = undefined;
    this.unitViews.clear();
    this.unitHealthViews.clear();
    this.controlPointViews.clear();
  }

  private updateUnitViews(
    state: GameState,
    unitsWithAvailableMainActions: ReadonlySet<string>,
  ): void {
    const unitIds = new Set(Object.keys(state.units));
    for (const [id, view] of this.unitViews) {
      if (unitIds.has(id)) continue;
      view.destroy();
      this.unitHealthViews.get(id)?.container.destroy();
      this.unitViews.delete(id);
      this.unitHealthViews.delete(id);
    }
    for (const unit of Object.values(state.units)) {
      this.upsertUnit(unit, state.activeSide, unitsWithAvailableMainActions);
    }
  }

  private upsertUnit(
    unit: UnitState,
    activeSide: GameState["activeSide"],
    unitsWithAvailableMainActions: ReadonlySet<string>,
  ): void {
    const point = this.toScreenPosition(unit.position);
    const view =
      this.unitViews.get(unit.id) ??
      this.scene.add.image(point.x, point.y, getUnitTextureKey(unit));
    view.setPosition(point.x, point.y).setTexture(getUnitTextureKey(unit));
    this.updateUnitTint(view, unit, activeSide, unitsWithAvailableMainActions);
    this.unitViews.set(unit.id, view);
    if (!view.parentContainer) this.worldContainer.add(view);
    this.upsertUnitHealthView(unit, point);
  }

  private updateUnitTint(
    view: Phaser.GameObjects.Image,
    unit: UnitState,
    activeSide: GameState["activeSide"],
    unitsWithAvailableMainActions: ReadonlySet<string>,
  ): void {
    if (unit.side !== activeSide) {
      view.clearTint();
      return;
    }

    if (
      unit.hasTakenMainAction ||
      (unit.hasMovedThisTurn && !unitsWithAvailableMainActions.has(unit.id))
    ) {
      view.setTint(MOVED_UNIT_TINT);
      return;
    }

    view.clearTint();
  }

  private upsertUnitHealthView(unit: UnitState, point: Position): void {
    const labelY = calculateUnitHealthLabelY(point.y, this.options.tileSize, UNIT_HEALTH_LABEL_GAP);
    const existing = this.unitHealthViews.get(unit.id);
    if (existing) {
      existing.container.setPosition(point.x, labelY);
      existing.text.setText(formatUnitHealthLabel(unit.health));
      this.layoutUnitHealthView(existing);
      return;
    }

    const text = this.scene.add
      .text(0, 0, formatUnitHealthLabel(unit.health), {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const background = this.scene.add
      .rectangle(0, 0, 0, 0, UNIT_HEALTH_LABEL_BACKGROUND_COLOR, UNIT_HEALTH_LABEL_BACKGROUND_ALPHA)
      .setStrokeStyle(UNIT_HEALTH_LABEL_BORDER_WIDTH, UNIT_HEALTH_LABEL_BORDER_COLOR);
    const container = this.scene.add.container(point.x, labelY, [background, text]);
    const healthView = { container, background, text };
    container.setScale(calculateUnitHealthLabelScale(this.options.initialZoom));
    this.layoutUnitHealthView(healthView);
    this.worldContainer.add(container);
    this.unitHealthViews.set(unit.id, healthView);
  }

  private updateControlPointViews(state: GameState): void {
    const controlPointIds = new Set(Object.keys(state.controlPoints));
    for (const [id, view] of this.controlPointViews) {
      if (controlPointIds.has(id)) continue;
      view.destroy();
      this.controlPointViews.delete(id);
    }
    for (const point of Object.values(state.controlPoints)) {
      const position = this.toScreenPosition(point.position);
      const textureKey = getControlPointTextureKey(point.owner);
      const view =
        this.controlPointViews.get(point.id) ??
        this.scene.add.image(position.x, position.y, textureKey);
      view.setTexture(textureKey).setPosition(position.x, position.y);
      this.controlPointViews.set(point.id, view);
      if (!view.parentContainer) this.worldContainer.add(view);
    }
  }

  private layoutUnitHealthView(healthView: UnitHealthView): void {
    healthView.background.setSize(
      healthView.text.width + UNIT_HEALTH_LABEL_PADDING_X * DOUBLE_SIZE_MULTIPLIER,
      healthView.text.height + UNIT_HEALTH_LABEL_PADDING_Y * DOUBLE_SIZE_MULTIPLIER,
    );
  }

  private toScreenPosition(position: Position): Position {
    const tileCenter = this.options.tileSize / DOUBLE_SIZE_MULTIPLIER;
    return {
      x: this.options.boardOriginX + position.x * this.options.tileSize + tileCenter,
      y: this.options.boardOriginY + position.y * this.options.tileSize + tileCenter,
    };
  }
}

function getUnitsWithAvailableMainActions(state: GameState): ReadonlySet<string> {
  const hasMovedActiveUnit = Object.values(state.units).some(
    (unit) => unit.side === state.activeSide && unit.hasMovedThisTurn && !unit.hasTakenMainAction,
  );
  if (!hasMovedActiveUnit) return new Set();

  return new Set(
    getLegalActions(state).flatMap((action) =>
      action.type === "attack" || action.type === "capture" ? [action.unitId] : [],
    ),
  );
}
