import type Phaser from "phaser";
import type { GameState, Position } from "../../core/model/game-state";
import { uiTheme } from "../ui/theme/ui-theme";

const TILE_SIZE = 512;
const TILE_CENTER = TILE_SIZE / 2;
const TILE_COLOR_A = 0x31513a;
const TILE_COLOR_B = 0x2a4633;
const BLUE_UNIT_COLOR = 0x4e9fce;
const RED_UNIT_COLOR = 0xc64d4d;
const CONTROL_POINT_COLOR = 0xe0bd5b;
const TILE_ALTERNATION = 2;
const BOARD_BORDER_WIDTH = 8;

/** Explicit development-only missing-asset diagnostics. Callers guard with import.meta.env.DEV. */
export function createDiagnosticBoard(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  state: GameState,
  screen: (position: Position) => Position,
): void {
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const point = screen({ x, y });
      const color = (x + y) % TILE_ALTERNATION === 0 ? TILE_COLOR_A : TILE_COLOR_B;
      container.add(
        scene.add
          .rectangle(point.x, point.y, TILE_SIZE, TILE_SIZE, color)
          .setStrokeStyle(BOARD_BORDER_WIDTH, uiTheme.colors.background),
      );
    }
  }
  for (const controlPoint of Object.values(state.controlPoints)) {
    const point = screen(controlPoint.position);
    container.add(
      scene.add.rectangle(point.x, point.y, TILE_CENTER, TILE_CENTER, CONTROL_POINT_COLOR),
    );
  }
}

export function drawDiagnosticUnits(
  layer: Phaser.GameObjects.Graphics,
  state: GameState,
  screen: (position: Position) => Position,
): void {
  layer.clear();
  for (const unit of Object.values(state.units)) {
    const point = screen(unit.position);
    layer.fillStyle(unit.side === "blue" ? BLUE_UNIT_COLOR : RED_UNIT_COLOR);
    layer.fillRect(
      point.x - TILE_CENTER + uiTheme.spacing.xs,
      point.y - TILE_CENTER + uiTheme.spacing.xs,
      TILE_SIZE - uiTheme.spacing.sm,
      TILE_SIZE - uiTheme.spacing.sm,
    );
  }
}
