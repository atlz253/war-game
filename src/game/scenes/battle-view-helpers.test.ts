import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { formatSelectedUnit } from "./battle-view-helpers";

const BLUE_TANK_ID = "blue-tank-1";
const CONTROL_POINT_ID = "control-point-1";

describe("formatSelectedUnit", () => {
  it("shows the selected unit's base defence", () => {
    const state = createSkirmishGameState();

    expect(formatSelectedUnit(state, state.units["blue-infantry-1"], "blue", true)).toContain(
      "Defence 0",
    );
  });

  it("shows the positional defence bonus alongside a tank's base defence", () => {
    const state = createSkirmishGameState();
    const tank = state.units[BLUE_TANK_ID];
    const defendedState = {
      ...state,
      controlPoints: {
        ...state.controlPoints,
        [CONTROL_POINT_ID]: { ...state.controlPoints[CONTROL_POINT_ID], position: tank.position },
      },
    };

    expect(formatSelectedUnit(defendedState, tank, "blue", true)).toContain(
      "Defence 2 (+1 position)",
    );
  });
});
