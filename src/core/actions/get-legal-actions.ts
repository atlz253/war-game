import type { GameState, Position, UnitState } from "../model/game-state";
import { validateAction } from "../rules/validate-action";
import type { GameAction } from "./game-actions";

const FIRST_COORDINATE = 0;
const COORDINATE_INCREMENT = 1;

export function getLegalActions(state: GameState): readonly GameAction[] {
  const actions: GameAction[] = [];
  const activeUnits = getActiveUnits(state);

  for (const unit of activeUnits) {
    addUnitActions(state, unit, actions);
  }

  actions.push({ type: "end-turn" });

  return actions;
}

function getActiveUnits(state: GameState): readonly UnitState[] {
  return Object.values(state.units)
    .filter((unit) => unit.side === state.activeSide)
    .sort((first, second) => first.id.localeCompare(second.id));
}

function addUnitActions(state: GameState, unit: UnitState, actions: GameAction[]): void {
  addLegalMoveActions(state, unit, actions);
  addLegalAttackActions(state, unit, actions);
  addLegalCaptureActions(state, unit, actions);
  addIfLegal(state, { type: "wait", unitId: unit.id }, actions);
}

function addLegalMoveActions(state: GameState, unit: UnitState, actions: GameAction[]): void {
  const minimumX = Math.max(FIRST_COORDINATE, unit.position.x - unit.movementPoints);
  const maximumX = Math.min(
    state.board.width - COORDINATE_INCREMENT,
    unit.position.x + unit.movementPoints,
  );
  const minimumY = Math.max(FIRST_COORDINATE, unit.position.y - unit.movementPoints);
  const maximumY = Math.min(
    state.board.height - COORDINATE_INCREMENT,
    unit.position.y + unit.movementPoints,
  );

  for (let y = minimumY; y <= maximumY; y += COORDINATE_INCREMENT) {
    for (let x = minimumX; x <= maximumX; x += COORDINATE_INCREMENT) {
      addIfLegal(state, { type: "move", unitId: unit.id, destination: { x, y } }, actions);
    }
  }
}

function addLegalAttackActions(state: GameState, unit: UnitState, actions: GameAction[]): void {
  const targets = Object.values(state.units).sort((first, second) =>
    first.id.localeCompare(second.id),
  );

  for (const target of targets) {
    addIfLegal(state, { type: "attack", unitId: unit.id, targetUnitId: target.id }, actions);
  }
}

function addLegalCaptureActions(state: GameState, unit: UnitState, actions: GameAction[]): void {
  const controlPoints = Object.values(state.controlPoints).sort((first, second) =>
    first.id.localeCompare(second.id),
  );

  for (const controlPoint of controlPoints) {
    addIfLegal(
      state,
      { type: "capture", unitId: unit.id, controlPointId: controlPoint.id },
      actions,
    );
  }
}

function addIfLegal(state: GameState, action: GameAction, actions: GameAction[]): void {
  if (validateAction(state, action).isValid) {
    actions.push(action);
  }
}

export function chebyshevDistance(first: Position, second: Position): number {
  return Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y));
}
