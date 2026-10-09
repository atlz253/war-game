import type Phaser from "phaser";
import type { Position } from "../../core/model/game-state";

const TILE_SIZE = 512;
const TILE_CENTER = TILE_SIZE / 2;
const MOVEMENT_COLOR = 0x3dd6b1;
const MOVEMENT_ALPHA = 0.28;
const MOVEMENT_BORDER_ALPHA = 0.85;
const BORDER_WIDTH = 8;
const ATTACK_COLOR = 0xd94b4b;
const ATTACK_ALPHA = 0.32;
export function drawHighlights(
  layer: Phaser.GameObjects.Graphics | null,
  cells: readonly Position[],
  toScreen: (cell: Position) => Position,
  attack = false,
): void {
  if (!layer) return;
  layer.clear();
  layer.fillStyle(attack ? ATTACK_COLOR : MOVEMENT_COLOR, attack ? ATTACK_ALPHA : MOVEMENT_ALPHA);
  for (const cell of cells) {
    const point = toScreen(cell);
    layer.fillRect(point.x - TILE_CENTER, point.y - TILE_CENTER, TILE_SIZE, TILE_SIZE);
    if (!attack) {
      layer.lineStyle(BORDER_WIDTH, MOVEMENT_COLOR, MOVEMENT_BORDER_ALPHA);
      layer.strokeRect(point.x - TILE_CENTER, point.y - TILE_CENTER, TILE_SIZE, TILE_SIZE);
    }
  }
}
