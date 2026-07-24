import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { calculateDamage } from "./calculate-damage";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";
const FULL_HEALTH_DAMAGE = 3;
const FRACTIONAL_DAMAGE = 2;
const HALF_HEALTH = 5;
const FRACTIONAL_HEALTH = 7;
const CRITICAL_HEALTH = 1;
const MOUNTAIN_POSITION = { x: 2, y: 1 };
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
});
