import type { GameAction } from "../actions/game-actions";
import type { GameState, Position, UnitState } from "../model/game-state";
import { findPath, positionsEqual } from "../pathfinding/find-path";
import { canUnitAttackTarget } from "./attack-range";

export type ValidationFailureReason =
  | "match-finished"
  | "unit-not-found"
  | "unit-not-active-side"
  | "unit-main-action-already-taken"
  | "unit-cannot-attack-after-moving"
  | "unit-has-no-movement-points"
  | "destination-unreachable"
  | "destination-out-of-range"
  | "target-not-found"
  | "target-is-friendly"
  | "control-point-not-found"
  | "control-point-not-at-unit-position"
  | "control-point-already-owned";

export type ValidationResult =
  | { readonly isValid: true }
  | { readonly isValid: false; readonly reason: ValidationFailureReason };

const VALID_ACTION: ValidationResult = { isValid: true };
const NO_MOVEMENT_POINTS = 0;

export function validateAction(state: GameState, action: GameAction): ValidationResult {
  if (state.winner) {
    return invalid("match-finished");
  }

  switch (action.type) {
    case "move":
      return validateMove(state, action.unitId, action.destination);
    case "attack":
      return validateAttack(state, action.unitId, action.targetUnitId);
    case "capture":
      return validateCapture(state, action.unitId, action.controlPointId);
    case "wait":
      return validateMainAction(state, action.unitId);
    case "end-turn":
      return VALID_ACTION;
  }
}

function validateMove(state: GameState, unitId: string, destination: Position): ValidationResult {
  const unit = state.units[unitId];
  const unitValidation = validateUnitTurn(state, unit);

  if (!unitValidation.isValid) {
    return unitValidation;
  }

  if (unit.hasTakenMainAction) {
    return invalid("unit-main-action-already-taken");
  }

  if (unit.movementPoints <= NO_MOVEMENT_POINTS) {
    return invalid("unit-has-no-movement-points");
  }

  const path = findPath(state.board, state.units, unit.id, unit.position, destination);

  if (!path || path.length === NO_MOVEMENT_POINTS || path.length > unit.movementPoints) {
    return invalid("destination-unreachable");
  }

  return VALID_ACTION;
}

function validateAttack(state: GameState, unitId: string, targetUnitId: string): ValidationResult {
  const unit = state.units[unitId];
  const unitValidation = validateMainAction(state, unitId);

  if (!unitValidation.isValid || !unit) {
    return unitValidation;
  }

  if (unit.type === "artillery" && unit.hasMovedThisTurn) {
    return invalid("unit-cannot-attack-after-moving");
  }

  const target = state.units[targetUnitId];

  if (!target) {
    return invalid("target-not-found");
  }

  if (target.side === unit.side) {
    return invalid("target-is-friendly");
  }

  return canUnitAttackTarget(state.board, unit, target)
    ? VALID_ACTION
    : invalid("destination-out-of-range");
}

function validateCapture(
  state: GameState,
  unitId: string,
  controlPointId: string,
): ValidationResult {
  const unitValidation = validateMainAction(state, unitId);

  if (!unitValidation.isValid) {
    return unitValidation;
  }

  const unit = state.units[unitId];
  const controlPoint = state.controlPoints[controlPointId];

  if (!unit || !controlPoint) {
    return invalid("control-point-not-found");
  }

  if (!positionsEqual(unit.position, controlPoint.position)) {
    return invalid("control-point-not-at-unit-position");
  }

  return controlPoint.owner === unit.side ? invalid("control-point-already-owned") : VALID_ACTION;
}

function validateMainAction(state: GameState, unitId: string): ValidationResult {
  const unit = state.units[unitId];
  const unitValidation = validateUnitTurn(state, unit);

  if (!unitValidation.isValid) {
    return unitValidation;
  }

  return unit.hasTakenMainAction ? invalid("unit-main-action-already-taken") : VALID_ACTION;
}

function validateUnitTurn(state: GameState, unit: UnitState | undefined): ValidationResult {
  if (!unit) {
    return invalid("unit-not-found");
  }

  return unit.side === state.activeSide ? VALID_ACTION : invalid("unit-not-active-side");
}

function invalid(reason: ValidationFailureReason): ValidationResult {
  return { isValid: false, reason };
}
