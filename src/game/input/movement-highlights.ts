import type { MoveAction } from "../../core/actions/game-actions";
import { getLegalActions } from "../../core/actions/get-legal-actions";
import type { GameState, Position, UnitState } from "../../core/model/game-state";

export function getMovementHighlightPositions(
  state: GameState,
  selectedUnitId: string | null,
  inputLocked: boolean,
): readonly Position[] {
  const selectedUnit = getSelectedBlueUnit(state, selectedUnitId);

  if (
    !selectedUnit ||
    inputLocked ||
    state.activeSide !== "blue" ||
    selectedUnit.hasTakenMainAction
  ) {
    return [];
  }

  return getLegalActions(state)
    .filter((action): action is MoveAction => isSelectedUnitMove(action, selectedUnit.id))
    .map((action) => action.destination)
    .filter((position) => !positionsEqual(position, selectedUnit.position));
}

function getSelectedBlueUnit(state: GameState, unitId: string | null): UnitState | undefined {
  if (!unitId) {
    return undefined;
  }

  const unit = state.units[unitId];

  return unit?.side === "blue" ? unit : undefined;
}

function isSelectedUnitMove(
  action: ReturnType<typeof getLegalActions>[number],
  unitId: string,
): boolean {
  return action.type === "move" && action.unitId === unitId;
}

function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
