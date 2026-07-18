import type { GameState, Position, UnitState } from "../model/game-state";

export const MOUNTAIN_DEFENCE_BONUS = 1;
export const CONTROL_POINT_DEFENCE_BONUS = 1;
export const MINIMUM_DAMAGE = 1;

export function calculateDamage(state: GameState, target: UnitState, baseDamage: number): number {
  const defenceBonus = getDefenceBonus(state, target.position);

  return Math.max(MINIMUM_DAMAGE, baseDamage - defenceBonus);
}

export function getDefenceBonus(state: GameState, position: Position): number {
  return getMountainDefenceBonus(state, position) + getControlPointDefenceBonus(state, position);
}

function getMountainDefenceBonus(state: GameState, position: Position): number {
  return state.board.terrain.some(
    (terrain) => terrain.type === "mountain" && positionsEqual(terrain.position, position),
  )
    ? MOUNTAIN_DEFENCE_BONUS
    : 0;
}

function getControlPointDefenceBonus(state: GameState, position: Position): number {
  return Object.values(state.controlPoints).some((point) =>
    positionsEqual(point.position, position),
  )
    ? CONTROL_POINT_DEFENCE_BONUS
    : 0;
}

function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
