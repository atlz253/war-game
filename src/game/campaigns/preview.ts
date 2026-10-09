import type Phaser from "phaser";
import type { MapDefinition } from "../../core/maps/map-definition";
import { createGameStateFromMap } from "../../core/maps/map-definition";
import type { Position, UnitState } from "../../core/model/game-state";
import { positionsEqual } from "../../core/pathfinding/find-path";
import { assetManifest } from "../assets/asset-manifest";
import {
  getControlPointTextureKey,
  getTerrainTextureKey,
  getUnitTextureKey,
} from "../scenes/battle-view-helpers";
import { campaignUi as ui } from "../ui/theme/campaign-ui";
import { uiTheme } from "../ui/theme/ui-theme";

const TILE_CENTER_OFFSET = 0.5;
const GOAL_ALPHA = 0.3;
const PREVIEW_WIDTH = 1250;
const PREVIEW_HEIGHT = 780;
export function createCampaignPreview(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  map: MapDefinition,
  target: Position | undefined,
  pick: (cell: Position, unitId?: string) => void,
): void {
  const state = createGameStateFromMap(map);
  const container = scene.add.container(ui.previewX, ui.previewY);
  const scale = Math.min(
    1,
    PREVIEW_WIDTH / (map.width * ui.previewTile),
    PREVIEW_HEIGHT / (map.height * ui.previewTile),
  );
  container.setScale(scale);
  parent.add(container);
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const cell = { x, y };
      const unit = Object.values(state.units).find((candidate) =>
        positionsEqual(candidate.position, cell),
      );
      drawCell(scene, container, map, cell, unit);
      const overlay = scene.add
        .rectangle(
          x * ui.previewTile,
          y * ui.previewTile,
          ui.previewTile,
          ui.previewTile,
          uiTheme.colors.primary,
          target && positionsEqual(target, cell) ? GOAL_ALPHA : 0,
        )
        .setOrigin(0)
        .setInteractive();
      overlay.on(
        "pointerdown",
        (_p: unknown, _x: unknown, _y: unknown, event: { stopPropagation(): void }) => {
          event.stopPropagation();
          pick(cell, unit?.id);
        },
      );
      container.add(overlay);
    }
}

function drawCell(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  map: MapDefinition,
  cell: Position,
  unit?: UnitState,
): void {
  const terrain = map.terrain.find((placement) => positionsEqual(placement.position, cell));
  const point = map.controlPoints.find((placement) => positionsEqual(placement.position, cell));
  const keys = [
    terrain ? getTerrainTextureKey(terrain.type) : assetManifest.terrain.plain.textureKey,
  ];
  if (point) keys.push(getControlPointTextureKey(point.owner));
  if (unit) keys.push(getUnitTextureKey(unit));
  for (const key of keys)
    container.add(
      scene.add
        .image(
          (cell.x + TILE_CENTER_OFFSET) * ui.previewTile,
          (cell.y + TILE_CENTER_OFFSET) * ui.previewTile,
          key,
        )
        .setDisplaySize(ui.previewTile, ui.previewTile),
    );
}
