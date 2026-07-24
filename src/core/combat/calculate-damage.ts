import type { GameState, Position, UnitState } from "../model/game-state";
import { getTerrainDefenceBonus } from "../terrain/terrain-rules";

export { MOUNTAIN_DEFENCE_BONUS } from "../terrain/terrain-rules";
export const CONTROL_POINT_DEFENCE_BONUS = 1;
export const MINIMUM_DAMAGE = 1;

export function calculateDamage(state: GameState, attacker: UnitState, target: UnitState): number {
  const defence = getTargetBaseDefence(attacker, target) + getDefenceBonus(state, target.position);
  const damageBeforeHealthScaling = attacker.baseDamage - defence;
  const healthRatio = attacker.health / attacker.maxHealth;

  return Math.max(MINIMUM_DAMAGE, Math.floor(damageBeforeHealthScaling * healthRatio));
}

export function getDefenceBonus(state: GameState, position: Position): number {
  return (
    getTerrainDefenceBonus(state.board, position) + getControlPointDefenceBonus(state, position)
  );
}

function getControlPointDefenceBonus(state: GameState, position: Position): number {
  return Object.values(state.controlPoints).some((point) =>
    positionsEqual(point.position, position),
  )
    ? CONTROL_POINT_DEFENCE_BONUS
    : 0;
}

function getTargetBaseDefence(attacker: UnitState, target: UnitState): number {
  return attacker.type === "artillery" && target.type === "tank" ? 0 : target.baseDefence;
}

function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
