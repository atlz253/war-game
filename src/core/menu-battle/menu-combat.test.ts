const COMBAT_SEED = 42;
const ATTACKS_BEYOND_CAPACITY = 12;
const DUEL_HEALTH = 100;
const OUTSIDE_ENEMY_STRIP = 3;

import { describe, expect, it } from "vitest";
import { getLegalActions } from "../actions/get-legal-actions";
import type { GameState, SideId } from "../model/game-state";
import { findPath } from "../pathfinding/find-path";
import { applyAction } from "../rules/apply-action";
import { validateAction } from "../rules/validate-action";
import { createMenuBattle } from "./menu-battle";

function duel(activeSide: SideId = "blue"): GameState {
  const state = createMenuBattle(COMBAT_SEED);
  const blue = required(Object.values(state.units).find((u) => u.side === "blue"));
  const red = required(Object.values(state.units).find((u) => u.side === "red"));
  return {
    ...state,
    activeSide,
    units: {
      blue: {
        ...blue,
        id: "blue",
        type: "infantry",
        position: { x: 8, y: 4 },
        minAttackRange: 1,
        attackRange: 1,
        health: DUEL_HEALTH,
        maxHealth: DUEL_HEALTH,
        baseDamage: 1,
        baseDefence: 0,
      },
      red: {
        ...red,
        id: "red",
        type: "infantry",
        position: { x: 9, y: 4 },
        minAttackRange: 1,
        attackRange: 1,
        health: DUEL_HEALTH,
        maxHealth: DUEL_HEALTH,
        baseDamage: 1,
        baseDefence: 0,
      },
    },
  };
}
describe("isolated menu combat rules", () => {
  it("sustains attacks and counterattacks beyond capacity without consuming ammo", () => {
    let state = duel();
    const ammo = [required(state.units.blue).ammo, required(state.units.red).ammo];
    for (let i = 0; i < ATTACKS_BEYOND_CAPACITY; i++) {
      const result = applyAction(state, { type: "attack", unitId: "blue", targetUnitId: "red" });
      expect(result.accepted).toBe(true);
      expect(result.events.some((e) => e.type === "unit-counterattacked")).toBe(true);
      state = applyAction(applyAction(result.state, { type: "end-turn" }).state, {
        type: "end-turn",
      }).state;
      expect([required(state.units.blue).ammo, required(state.units.red).ammo]).toEqual(ammo);
    }
    const ordinary = { ...duel(), menuBattle: undefined };
    expect(
      required(
        applyAction(ordinary, { type: "attack", unitId: "blue", targetUnitId: "red" }).state.units
          .blue,
      ).ammo,
    ).toBe(required(ordinary.units.blue).ammo - 1);
    expect(
      validateAction(
        {
          ...ordinary,
          units: { ...ordinary.units, blue: { ...required(ordinary.units.blue), ammo: 0 } },
        },
        { type: "attack", unitId: "blue", targetUnitId: "red" },
      ).isValid,
    ).toBe(false);
  });
  it.each(["blue", "red"] as const)(
    "replaces eliminated %s, preserving survivors, scores, turn and replay",
    (side) => {
      const state = duel(side === "blue" ? "red" : "blue");
      const survivor = side === "blue" ? "red" : "blue";
      const before = {
        ...state,
        units: { ...state.units, [side]: { ...required(state.units[side]), health: 1 } },
      };
      const action = { type: "attack" as const, unitId: survivor, targetUnitId: side };
      const result = applyAction(before, action);
      expect(result).toEqual(applyAction(before, action));
      expect(result.state.winner).toBeNull();
      expect(required(result.state.menuBattle).waves[side]).toBe(2);
      expect(result.state.units[survivor]).toEqual({
        ...before.units[survivor],
        hasTakenMainAction: true,
      });
      expect(result.state.scores[survivor]).toBe(1);
      expect(result.state.turn).toBe(before.turn);
      expect(result.state.activeSide).toBe(before.activeSide);
      expect(result.events.some((e) => e.type === "menu-reinforced")).toBe(true);
      expect(applyAction({ ...before, menuBattle: undefined }, action).state.winner).toBe(survivor);
    },
  );
  it("reinforces counterattack elimination", () => {
    const state = duel();
    const result = applyAction(
      { ...state, units: { ...state.units, blue: { ...required(state.units.blue), health: 1 } } },
      { type: "attack", unitId: "blue", targetUnitId: "red" },
    );
    expect(required(result.state.menuBattle).waves.blue).toBe(2);
    expect(required(result.state.units.red).health).toBe(DUEL_HEALTH - 1);
    expect(result.state.winner).toBeNull();
  });
  it("reserves opposing strips in validation, pathfinding and legal actions", () => {
    const state = duel();
    const unit = {
      ...required(state.units.blue),
      position: { x: state.board.width - OUTSIDE_ENEMY_STRIP, y: 4 },
    };
    const before = { ...state, units: { blue: unit } };
    const destination = { x: state.board.width - 2, y: 4 };
    const action = { type: "move" as const, unitId: "blue", destination };
    expect(validateAction(before, action).isValid).toBe(false);
    expect(findPath(before.board, before.units, unit.id, unit.position, destination)).toBeNull();
    expect(getLegalActions(before)).not.toContainEqual(action);
    expect(
      validateAction(
        {
          ...before,
          board: { ...before.board, menuDeploymentWidth: undefined },
          menuBattle: undefined,
        },
        action,
      ).isValid,
    ).toBe(true);
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing test fixture value");
  return value;
}
