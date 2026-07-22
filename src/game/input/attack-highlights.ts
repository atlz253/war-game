import type { AttackAction } from "../../core/actions/game-actions";
import { getLegalActions } from "../../core/actions/get-legal-actions";
import type { GameState, Position, UnitState } from "../../core/model/game-state";

export function getAttackHighlightPositions(
  state: GameState,
  selectedUnitId: string | null,
  inputLocked: boolean,
): readonly Position[] {
  const selectedUnit = getSelectedActiveUnit(state, selectedUnitId);

  if (!selectedUnit || inputLocked || selectedUnit.hasTakenMainAction) {
    return [];
  }

  return getLegalActions(state)
    .filter((action): action is AttackAction => isSelectedUnitAttack(action, selectedUnit.id))
    .flatMap((action) => {
      const target = state.units[action.targetUnitId];
      return target ? [target.position] : [];
    });
}

function getSelectedActiveUnit(state: GameState, unitId: string | null): UnitState | undefined {
  if (!unitId) {
    return undefined;
  }

  const unit = state.units[unitId];

  return unit?.side === state.activeSide ? unit : undefined;
}

function isSelectedUnitAttack(
  action: ReturnType<typeof getLegalActions>[number],
  unitId: string,
): boolean {
  return action.type === "attack" && action.unitId === unitId;
}
