import type {
  ControlPointState,
  GameState,
  Position,
  UnitState,
} from "../../core/model/game-state";

const PLAYER_SIDE = "blue";

export function getCapturableControlPointId(
  state: GameState,
  selectedUnitId: string | null,
  inputLocked: boolean,
): string | null {
  const selectedUnit = getSelectedPlayerUnit(state, selectedUnitId);

  if (
    !selectedUnit ||
    inputLocked ||
    state.activeSide !== PLAYER_SIDE ||
    selectedUnit.hasTakenMainAction
  ) {
    return null;
  }

  return (
    Object.values(state.controlPoints).find((controlPoint) =>
      canCaptureControlPoint(selectedUnit, controlPoint),
    )?.id ?? null
  );
}

function getSelectedPlayerUnit(state: GameState, unitId: string | null): UnitState | undefined {
  if (!unitId) {
    return undefined;
  }

  const unit = state.units[unitId];

  return unit?.side === PLAYER_SIDE ? unit : undefined;
}

function canCaptureControlPoint(unit: UnitState, controlPoint: ControlPointState): boolean {
  return controlPoint.owner !== unit.side && positionsEqual(unit.position, controlPoint.position);
}

function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
