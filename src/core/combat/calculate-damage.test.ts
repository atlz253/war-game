import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { calculateDamage, getDefenceBonus } from "./calculate-damage";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";
const FULL_HEALTH_DAMAGE = 3;
const FRACTIONAL_DAMAGE = 2;
const HALF_HEALTH = 5;
const FRACTIONAL_HEALTH = 7;
const CRITICAL_HEALTH = 1;
const MOUNTAIN_POSITION = { x: 2, y: 1 };
const FOREST_POSITION = { x: 3, y: 1 };
const MINIMUM_DAMAGE = 1;

describe("calculateDamage", () => {
  it("scales attack damage by the attacker's remaining health and rounds down", () => {
    const state = createSkirmishGameState();
    const attacker = state.units[BLUE_INFANTRY_ID];
    const target = state.units[RED_INFANTRY_ID];

    expect(calculateDamage(state, attacker, target)).toBe(FULL_HEALTH_DAMAGE);
    expect(calculateDamage(state, { ...attacker, health: FRACTIONAL_HEALTH }, target)).toBe(
      FRACTIONAL_DAMAGE,
    );
    expect(calculateDamage(state, { ...attacker, health: HALF_HEALTH }, target)).toBe(
      MINIMUM_DAMAGE,
    );
  });

  it("does not reduce scaled damage below one after defence", () => {
    const state = createSkirmishGameState();
    const attacker = { ...state.units[BLUE_INFANTRY_ID], health: CRITICAL_HEALTH };
    const target = { ...state.units[RED_INFANTRY_ID], position: MOUNTAIN_POSITION };

    expect(calculateDamage(state, attacker, target)).toBe(MINIMUM_DAMAGE);
  });

  it("applies forest and mountain defence bonuses in increasing strength", () => {
    const state = createSkirmishGameState();
    const terrainState = {
      ...state,
      board: {
        ...state.board,
        terrain: [
          { type: "forest" as const, position: FOREST_POSITION },
          { type: "mountain" as const, position: MOUNTAIN_POSITION },
        ],
      },
    };
    const forestControlPointState = {
      ...terrainState,
      controlPoints: {
        ...terrainState.controlPoints,
        "control-point-1": {
          ...terrainState.controlPoints["control-point-1"],
          position: FOREST_POSITION,
        },
      },
    };

    expect(getDefenceBonus(terrainState, { x: 0, y: 0 })).toBe(0);
    expect(getDefenceBonus(terrainState, FOREST_POSITION)).toBe(1);
    expect(getDefenceBonus(terrainState, MOUNTAIN_POSITION)).toBe(2);
    expect(getDefenceBonus(forestControlPointState, FOREST_POSITION)).toBe(2);
  });
});
