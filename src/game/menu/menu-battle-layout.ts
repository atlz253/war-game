import { chebyshevDistance } from "../../core/actions/get-legal-actions";
import type { MenuBattleConfig } from "../../core/menu-battle/menu-battle";
import type { GameState, Position } from "../../core/model/game-state";
import { menuBattleUi } from "../ui/theme/menu-battle-ui";

const CELL_CENTER = 0.5;

/** Cover only the central rectangle: resize never exposes a deployment strip. */
export function menuBattleLayout(
  width: number,
  height: number,
  config: MenuBattleConfig,
  focus?: Position,
) {
  const tileSize = menuBattleUi.tileSize;
  const worldWidth = config.visibleWidth * tileSize;
  const worldHeight = config.height * tileSize;
  const zoom = Math.max(width / worldWidth, height / worldHeight);
  const hiddenWidth = config.stripWidth * tileSize;
  const centerX = focus ? (focus.x + CELL_CENTER) * tileSize : hiddenWidth + worldWidth / 2;
  const centerY = focus ? (focus.y + CELL_CENTER) * tileSize : worldHeight / 2;
  return {
    tileSize,
    zoom,
    left: Math.max(
      hiddenWidth,
      Math.min(hiddenWidth + worldWidth - width / zoom, centerX - width / zoom / 2),
    ),
    top: Math.max(0, Math.min(worldHeight - height / zoom, centerY - height / zoom / 2)),
  };
}

export function menuBattleFocus(state: GameState): Position | undefined {
  const blue = Object.values(state.units).filter((unit) => unit.side === "blue");
  const red = Object.values(state.units).filter((unit) => unit.side === "red");
  let distance = Number.POSITIVE_INFINITY;
  let focus: Position | undefined;
  for (const first of blue) {
    for (const second of red) {
      const candidateDistance = chebyshevDistance(first.position, second.position);
      if (candidateDistance >= distance) continue;
      distance = candidateDistance;
      focus = {
        x: (first.position.x + second.position.x) / 2,
        y: (first.position.y + second.position.y) / 2,
      };
    }
  }
  return focus;
}
