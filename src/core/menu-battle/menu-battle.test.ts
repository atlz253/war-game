const GENERATION_SEED = 17;
const GENERATION_SEEDS = 20;
const INVALID_CAPACITY = 17;
const BOTH_SIDES_FULL_CAPACITY = 32;

import { describe, expect, it } from "vitest";
import { createMapDefinitionFromState } from "../maps/create-map-definition-from-state";
import { validateMapDefinition } from "../maps/map-definition";
import { findPath } from "../pathfinding/find-path";
import { createMenuBattle, reinforceMenuSide } from "./menu-battle";

describe("seeded menu deployment", () => {
  it("creates identical valid wide maps with connected hidden opposing forces", () => {
    const state = createMenuBattle(GENERATION_SEED);
    expect(state).toEqual(createMenuBattle(GENERATION_SEED));
    expect(validateMapDefinition(createMapDefinitionFromState(state, "Demo")).isValid).toBe(true);
    const strip = required(state.menuBattle).config.stripWidth;
    for (const unit of Object.values(state.units)) {
      expect(
        unit.side === "blue"
          ? unit.position.x < strip
          : unit.position.x >= state.board.width - strip,
      ).toBe(true);
      expect(
        findPath(state.board, { [unit.id]: unit }, unit.id, unit.position, {
          x: strip + 1,
          y: unit.position.y,
        }),
      ).not.toBeNull();
    }
  });
  it("bounds every wave, preserves survivors and uses fresh deterministic identities", () => {
    for (let seed = 0; seed < GENERATION_SEEDS; seed++) {
      const state = createMenuBattle(seed);
      const red = Object.fromEntries(
        Object.entries(state.units).filter(([, u]) => u.side === "red"),
      );
      const next = reinforceMenuSide({ ...state, units: red }, "blue");
      expect(next).toEqual(reinforceMenuSide({ ...state, units: red }, "blue"));
      expect(required(next.menuBattle).waves.blue).toBe(2);
      const blue = Object.values(next.units).filter((u) => u.side === "blue");
      expect(blue.length).toBeLessThanOrEqual(required(next.menuBattle).config.maxWaveSize);
      expect(blue.some((u) => u.type !== "artillery")).toBe(true);
      expect(blue.every((u) => !state.units[u.id] && u.ammo === u.maxAmmo)).toBe(true);
      expect(
        new Set(Object.values(next.units).map((u) => `${u.position.x},${u.position.y}`)).size,
      ).toBe(Object.keys(next.units).length);
      for (const u of Object.values(red)) expect(next.units[u.id]).toBe(u);
    }
  });
  it("uses a full-capacity terminating layout and rejects invalid capacity", () => {
    const config = {
      ...required(createMenuBattle(1).menuBattle).config,
      minWaveSize: 16,
      maxWaveSize: 16,
    };
    const state = createMenuBattle(1, config);
    expect(Object.keys(state.units)).toHaveLength(BOTH_SIDES_FULL_CAPACITY);
    expect(() => createMenuBattle(1, { ...config, maxWaveSize: INVALID_CAPACITY })).toThrow();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing test fixture value");
  return value;
}
