import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { getCapturableControlPointId } from "./capture-availability";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";
const CONTROL_POINT_ID = "control-point-1";

describe("getCapturableControlPointId", () => {
  it("returns a neutral point under the selected blue unit", () => {
    const state = placeSelectedUnitOnControlPoint(createSkirmishGameState());

    expect(getCapturableControlPointId(state, BLUE_INFANTRY_ID, false)).toBe(CONTROL_POINT_ID);
  });

  it("returns an enemy-owned point under the selected blue unit", () => {
    const state = placeSelectedUnitOnControlPoint(createSkirmishGameState());
    const enemyOwnedState = {
      ...state,
      controlPoints: {
        ...state.controlPoints,
        [CONTROL_POINT_ID]: {
          ...state.controlPoints[CONTROL_POINT_ID],
          owner: "red" as const,
        },
      },
    };

    expect(getCapturableControlPointId(enemyOwnedState, BLUE_INFANTRY_ID, false)).toBe(
      CONTROL_POINT_ID,
    );
  });

  it("returns null when capture is unavailable", () => {
    const state = createSkirmishGameState();
    const unitOnPointState = placeSelectedUnitOnControlPoint(state);
    const ownedPointState = {
      ...unitOnPointState,
      controlPoints: {
        ...unitOnPointState.controlPoints,
        [CONTROL_POINT_ID]: {
          ...unitOnPointState.controlPoints[CONTROL_POINT_ID],
          owner: "blue" as const,
        },
      },
    };
    const actedState = {
      ...unitOnPointState,
      units: {
        ...unitOnPointState.units,
        [BLUE_INFANTRY_ID]: {
          ...unitOnPointState.units[BLUE_INFANTRY_ID],
          hasTakenMainAction: true,
        },
      },
    };
    const aiTurnState = { ...unitOnPointState, activeSide: "red" as const };

    expect(getCapturableControlPointId(state, BLUE_INFANTRY_ID, false)).toBeNull();
    expect(getCapturableControlPointId(ownedPointState, BLUE_INFANTRY_ID, false)).toBeNull();
    expect(getCapturableControlPointId(actedState, BLUE_INFANTRY_ID, false)).toBeNull();
    expect(getCapturableControlPointId(aiTurnState, BLUE_INFANTRY_ID, false)).toBeNull();
    expect(getCapturableControlPointId(unitOnPointState, BLUE_INFANTRY_ID, true)).toBeNull();
    expect(getCapturableControlPointId(unitOnPointState, null, false)).toBeNull();
  });

  it("allows an active Red human unit to capture a point", () => {
    const state = createSkirmishGameState();
    const redTurnState = {
      ...state,
      activeSide: "red" as const,
      units: {
        ...state.units,
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: state.controlPoints[CONTROL_POINT_ID]?.position,
        },
      },
    };

    expect(getCapturableControlPointId(redTurnState, RED_INFANTRY_ID, false)).toBe(
      CONTROL_POINT_ID,
    );
  });
});

function placeSelectedUnitOnControlPoint(state: ReturnType<typeof createSkirmishGameState>) {
  return {
    ...state,
    units: {
      ...state.units,
      [BLUE_INFANTRY_ID]: {
        ...state.units[BLUE_INFANTRY_ID],
        position: state.controlPoints[CONTROL_POINT_ID]?.position,
      },
    },
  };
}
