import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import {
  formatActionRejection,
  formatEvent,
  formatRejectedOrder,
  formatSelectedUnit,
  toContainerPosition,
} from "./battle-view-helpers";

const BLUE_TANK_ID = "blue-tank-1";
const CONTROL_POINT_ID = "control-point-1";
const HUD_ORIGIN = { x: 100, y: 200 };
const HUD_SCALE = 0.5;
const SCREEN_POINTER = { x: 300, y: 400 };
const HUD_POINTER = { x: 400, y: 400 };

describe("toContainerPosition", () => {
  it("converts a screen pointer into scaled HUD coordinates", () => {
    expect(toContainerPosition(SCREEN_POINTER, HUD_ORIGIN, HUD_SCALE)).toEqual(HUD_POINTER);
  });
});

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

describe("formatEvent", () => {
  it("describes restored health", () => {
    expect(
      formatEvent({
        type: "unit-healed",
        unitId: "red-infantry-1",
        healthRestored: 2,
        remainingHealth: 7,
      }),
    ).toBe("red-infantry-1 restored 2 HP.");
  });
});

describe("formatRejectedOrder", () => {
  it("explains why an attack target cannot be selected", () => {
    expect(formatRejectedOrder("destination-out-of-range")).toBe(
      "Order rejected: the target is out of range.",
    );
    expect(formatRejectedOrder("unit-has-no-ammunition")).toBe(
      "Order rejected: the unit has no ammunition.",
    );
  });

  it("derives the reason from the rejected action", () => {
    const state = createSkirmishGameState();

    expect(
      formatActionRejection(state, {
        type: "attack",
        unitId: "blue-infantry-1",
        targetUnitId: "red-infantry-1",
      }),
    ).toBe("Order rejected: the target is out of range.");
  });
});
