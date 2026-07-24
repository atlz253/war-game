import type { GameAction } from "../actions/game-actions";
import { calculateDamage } from "../combat/calculate-damage";
import type { GameEvent } from "../model/game-events";
import type { GameState, SideId, UnitState } from "../model/game-state";
import { findPath, positionsEqual } from "../pathfinding/find-path";
import { addTeamScore, CAPTURE_SCORE, calculateAttackScore } from "../scoring/team-scores";
import { canUnitAttackTarget } from "./attack-range";
import { validateAction } from "./validate-action";

export interface ApplyActionResult {
  readonly accepted: boolean;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

const ACTION_REJECTED: Omit<ApplyActionResult, "state"> = { accepted: false, events: [] };
const NO_MOVEMENT_COST = 0;
const INITIAL_TURN_INCREMENT = 1;
export const CONTROL_POINT_HEAL_AMOUNT = 2;

export function applyAction(state: GameState, action: GameAction): ApplyActionResult {
  const validation = validateAction(state, action);

  if (!validation.isValid) {
    return { ...ACTION_REJECTED, state };
  }

  switch (action.type) {
    case "move":
      return applyMove(state, action.unitId, action.destination);
    case "attack":
      return applyAttack(state, action.unitId, action.targetUnitId);
    case "capture":
      return applyCapture(state, action.unitId, action.controlPointId);
    case "wait":
      return applyWait(state, action.unitId);
    case "end-turn":
      return applyEndTurn(state);
  }
}

function applyMove(
  state: GameState,
  unitId: string,
  destination: { readonly x: number; readonly y: number },
): ApplyActionResult {
  const unit = requireUnit(state, unitId);
  const path = findPath(state.board, state.units, unit.id, unit.position, destination);
  const cost = path?.length ?? NO_MOVEMENT_COST;
  const movedUnit = {
    ...unit,
    position: destination,
    movementPoints: unit.movementPoints - cost,
    hasMovedThisTurn: true,
  };
  const nextState = withUnit(state, movedUnit);

  return {
    accepted: true,
    state: nextState,
    events: [{ type: "unit-moved", unitId, from: unit.position, to: destination, cost }],
  };
}

function applyAttack(state: GameState, unitId: string, targetUnitId: string): ApplyActionResult {
  const attacker = requireUnit(state, unitId);
  const target = requireUnit(state, targetUnitId);
  const committedAttacker = { ...attacker, hasTakenMainAction: true };
  const damage = calculateDamage(state, attacker, target);
  const score = calculateAttackScore(target.health, damage);
  const remainingHealth = target.health - damage;
  const events: GameEvent[] = [
    { type: "unit-attacked", attackerUnitId: unitId, targetUnitId },
    {
      type: "unit-damaged",
      unitId: targetUnitId,
      damage,
      remainingHealth: Math.max(remainingHealth, NO_MOVEMENT_COST),
    },
    { type: "team-scored", side: attacker.side, points: score, reason: "attack" },
  ];
  const attackedState = withScore(withUnit(state, committedAttacker), attacker.side, score);

  if (remainingHealth <= NO_MOVEMENT_COST) {
    const destroyedState = withoutUnit(attackedState, targetUnitId);
    events.push({ type: "unit-destroyed", unitId: targetUnitId });

    return completeVictoryIfNeeded(destroyedState, attacker.side, events);
  }

  const defendingUnit = { ...target, health: remainingHealth };
  const stateAfterAttack = withUnit(attackedState, defendingUnit);

  if (!canUnitAttackTarget(state.board, defendingUnit, attacker)) {
    return { accepted: true, state: stateAfterAttack, events };
  }

  return applyCounterattack(stateAfterAttack, defendingUnit, committedAttacker, events);
}

function applyCounterattack(
  state: GameState,
  counterattacker: UnitState,
  target: UnitState,
  events: GameEvent[],
): ApplyActionResult {
  const damage = calculateDamage(state, counterattacker, target);
  const score = calculateAttackScore(target.health, damage);
  const remainingHealth = target.health - damage;
  events.push(
    {
      type: "unit-counterattacked",
      counterattackerUnitId: counterattacker.id,
      targetUnitId: target.id,
    },
    {
      type: "unit-damaged",
      unitId: target.id,
      damage,
      remainingHealth: Math.max(remainingHealth, NO_MOVEMENT_COST),
    },
    { type: "team-scored", side: counterattacker.side, points: score, reason: "attack" },
  );
  const counterattackedState = withScore(state, counterattacker.side, score);

  if (remainingHealth > NO_MOVEMENT_COST) {
    return {
      accepted: true,
      state: withUnit(counterattackedState, { ...target, health: remainingHealth }),
      events,
    };
  }

  const destroyedState = withoutUnit(counterattackedState, target.id);
  events.push({ type: "unit-destroyed", unitId: target.id });

  return completeVictoryIfNeeded(destroyedState, counterattacker.side, events);
}

function applyCapture(state: GameState, unitId: string, controlPointId: string): ApplyActionResult {
  const unit = requireUnit(state, unitId);
  const controlPoint = state.controlPoints[controlPointId];

  if (!controlPoint) {
    throw new Error(`Validated control point ${controlPointId} is missing.`);
  }

  const nextState = {
    ...withUnit(state, { ...unit, hasTakenMainAction: true }),
    controlPoints: {
      ...state.controlPoints,
      [controlPointId]: { ...controlPoint, owner: unit.side },
    },
  };
  const scoredState = withScore(nextState, unit.side, CAPTURE_SCORE);

  return {
    accepted: true,
    state: scoredState,
    events: [
      { type: "control-point-captured", controlPointId, owner: unit.side },
      { type: "team-scored", side: unit.side, points: CAPTURE_SCORE, reason: "capture" },
    ],
  };
}

function applyWait(state: GameState, unitId: string): ApplyActionResult {
  const nextState = withUnit(state, { ...requireUnit(state, unitId), hasTakenMainAction: true });

  return { accepted: true, state: nextState, events: [{ type: "unit-waited", unitId }] };
}

function applyEndTurn(state: GameState): ApplyActionResult {
  const activeSide = oppositeSide(state.activeSide);
  const refreshedUnits = refreshSideUnits(state.units, activeSide);
  const { units, events } = healUnitsOnOwnedControlPoints(
    refreshedUnits,
    state.controlPoints,
    activeSide,
  );
  const nextState = { ...state, turn: state.turn + INITIAL_TURN_INCREMENT, activeSide, units };

  return {
    accepted: true,
    state: nextState,
    events: [...events, { type: "turn-ended", turn: nextState.turn, activeSide }],
  };
}

function completeVictoryIfNeeded(
  state: GameState,
  winner: SideId,
  events: GameEvent[],
): ApplyActionResult {
  const hasEnemyUnits = Object.values(state.units).some((unit) => unit.side !== winner);

  if (hasEnemyUnits) {
    return { accepted: true, state, events };
  }

  const victoriousState = { ...state, winner };
  events.push({ type: "victory-achieved", winner });

  return { accepted: true, state: victoriousState, events };
}

function withUnit(state: GameState, unit: UnitState): GameState {
  return { ...state, units: { ...state.units, [unit.id]: unit } };
}

function withoutUnit(state: GameState, unitId: string): GameState {
  const units = { ...state.units };
  delete units[unitId];

  return { ...state, units };
}

function withScore(state: GameState, side: SideId, points: number): GameState {
  return { ...state, scores: addTeamScore(state.scores, side, points) };
}

function refreshSideUnits(
  units: Readonly<Record<string, UnitState>>,
  activeSide: SideId,
): Record<string, UnitState> {
  return Object.fromEntries(
    Object.entries(units).map(([unitId, unit]) => [
      unitId,
      unit.side === activeSide
        ? {
            ...unit,
            movementPoints: unit.maxMovementPoints,
            hasMovedThisTurn: false,
            hasTakenMainAction: false,
          }
        : unit,
    ]),
  );
}

function healUnitsOnOwnedControlPoints(
  units: Readonly<Record<string, UnitState>>,
  controlPoints: GameState["controlPoints"],
  activeSide: SideId,
): { readonly units: Record<string, UnitState>; readonly events: readonly GameEvent[] } {
  const events: GameEvent[] = [];
  const nextUnits = { ...units };
  const ownedControlPoints = Object.values(controlPoints).filter(
    (controlPoint) => controlPoint.owner === activeSide,
  );

  for (const unit of Object.values(units).sort((first, second) =>
    first.id.localeCompare(second.id),
  )) {
    if (!canUnitHealOnControlPoint(unit, activeSide, ownedControlPoints)) continue;

    const healthRestored = Math.min(CONTROL_POINT_HEAL_AMOUNT, unit.maxHealth - unit.health);
    const remainingHealth = unit.health + healthRestored;
    nextUnits[unit.id] = { ...unit, health: remainingHealth };
    events.push({ type: "unit-healed", unitId: unit.id, healthRestored, remainingHealth });
  }

  return { units: nextUnits, events };
}

function canUnitHealOnControlPoint(
  unit: UnitState,
  activeSide: SideId,
  ownedControlPoints: readonly GameState["controlPoints"][string][],
): boolean {
  return (
    unit.side === activeSide &&
    unit.health < unit.maxHealth &&
    ownedControlPoints.some((controlPoint) => positionsEqual(unit.position, controlPoint.position))
  );
}

function requireUnit(state: GameState, unitId: string): UnitState {
  const unit = state.units[unitId];

  if (!unit) {
    throw new Error(`Validated unit ${unitId} is missing.`);
  }

  return unit;
}

function oppositeSide(side: SideId): SideId {
  return side === "blue" ? "red" : "blue";
}
