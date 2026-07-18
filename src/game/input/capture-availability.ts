import type {
  ControlPointState,
  GameState,
  Position,
  UnitState,
} from "../../core/model/game-state";

export function getCapturableControlPointId(
  state: GameState,
  selectedUnitId: string | null,
  inputLocked: boolean,
): string | null {
  const selectedUnit = getSelectedActiveUnit(state, selectedUnitId);

  if (!selectedUnit || inputLocked || selectedUnit.hasTakenMainAction) {
    return null;
  }

  return (
    Object.values(state.controlPoints).find((controlPoint) =>
      canCaptureControlPoint(selectedUnit, controlPoint),
    )?.id ?? null
  );
}

function getSelectedActiveUnit(state: GameState, unitId: string | null): UnitState | undefined {
  if (!unitId) {
    return undefined;
  }

  const unit = state.units[unitId];

  return unit?.side === state.activeSide ? unit : undefined;
}

function canCaptureControlPoint(unit: UnitState, controlPoint: ControlPointState): boolean {
  return controlPoint.owner !== unit.side && positionsEqual(unit.position, controlPoint.position);
}

function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
