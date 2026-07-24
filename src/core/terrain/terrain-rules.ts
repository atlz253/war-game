import type { BoardState, Position } from "../model/game-state";

export const PLAIN_MOVEMENT_COST = 1;
export const FOREST_MOVEMENT_COST = 2;
export const FOREST_DEFENCE_BONUS = 1;
export const MOUNTAIN_DEFENCE_BONUS = 2;

export function getTerrainMovementCost(board: BoardState, position: Position): number {
  return hasTerrainAt(board, "forest", position) ? FOREST_MOVEMENT_COST : PLAIN_MOVEMENT_COST;
}

export function getTerrainDefenceBonus(board: BoardState, position: Position): number {
  if (hasTerrainAt(board, "mountain", position)) return MOUNTAIN_DEFENCE_BONUS;
  return hasTerrainAt(board, "forest", position) ? FOREST_DEFENCE_BONUS : 0;
}

export function getPathMovementCost(board: BoardState, path: readonly Position[]): number {
  return path.reduce((cost, position) => cost + getTerrainMovementCost(board, position), 0);
}

function hasTerrainAt(
  board: BoardState,
  terrainType: "forest" | "mountain",
  position: Position,
): boolean {
  return board.terrain.some(
    (terrain) =>
      terrain.type === terrainType &&
      terrain.position.x === position.x &&
      terrain.position.y === position.y,
  );
}
