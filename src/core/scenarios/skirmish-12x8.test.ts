import { describe, expect, it } from "vitest";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  createSkirmishGameState,
  SKIRMISH_SCENARIO_ID,
} from "./skirmish-12x8";

const INITIAL_TURN = 1;
const BLUE_INFANTRY_HEALTH = 10;
const BLUE_INFANTRY_MOVEMENT = 4;
const BLUE_TANK_HEALTH = 16;
const BLUE_TANK_MOVEMENT = 5;
const BLUE_ARTILLERY_HEALTH = 8;
const BLUE_ARTILLERY_MOVEMENT = 3;
const BLUE_ARTILLERY_MINIMUM_RANGE = 2;
const BLUE_ARTILLERY_MAXIMUM_RANGE = 4;
const CONTROL_POINT_COUNT = 2;
const BLUE_UNIT_COUNT = 5;
const RED_UNIT_COUNT = 5;
const INITIAL_SCORES = { blue: 0, red: 0 };
const STARTING_MOUNTAINS = [
  { type: "mountain", position: { x: 4, y: 2 } },
  { type: "mountain", position: { x: 7, y: 5 } },
];

describe("createSkirmishGameState", () => {
  it("creates the documented deterministic v1 setup", () => {
    const state = createSkirmishGameState();

    expect(state.scenarioId).toBe(SKIRMISH_SCENARIO_ID);
    expect(state.board).toEqual({
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      blockedCells: [],
      terrain: STARTING_MOUNTAINS,
    });
    expect(state.turn).toBe(INITIAL_TURN);
    expect(state.activeSide).toBe("blue");
    expect(state.winner).toBeNull();
    expect(state.scores).toEqual(INITIAL_SCORES);
    expect(state.units["blue-infantry-1"]?.position).toEqual({ x: 1, y: 1 });
    expect(state.units["red-infantry-1"]?.position).toEqual({ x: 10, y: 1 });
    expect(state.units["blue-infantry-1"]?.health).toBe(BLUE_INFANTRY_HEALTH);
    expect(state.units["blue-infantry-1"]?.movementPoints).toBe(BLUE_INFANTRY_MOVEMENT);
    expect(state.units["blue-infantry-1"]?.baseDefence).toBe(0);
    expect(state.units["blue-tank-1"]?.health).toBe(BLUE_TANK_HEALTH);
    expect(state.units["blue-tank-1"]?.movementPoints).toBe(BLUE_TANK_MOVEMENT);
    expect(state.units["blue-tank-1"]?.baseDefence).toBe(2);
    expect(state.units["blue-artillery-1"]?.position).toEqual({ x: 2, y: 0 });
    expect(state.units["red-artillery-1"]?.position).toEqual({ x: 9, y: 7 });
    expect(state.units["blue-artillery-1"]?.health).toBe(BLUE_ARTILLERY_HEALTH);
    expect(state.units["blue-artillery-1"]?.movementPoints).toBe(BLUE_ARTILLERY_MOVEMENT);
    expect(state.units["blue-artillery-1"]?.baseDefence).toBe(0);
    expect(state.units["blue-artillery-1"]?.minAttackRange).toBe(BLUE_ARTILLERY_MINIMUM_RANGE);
    expect(state.units["blue-artillery-1"]?.attackRange).toBe(BLUE_ARTILLERY_MAXIMUM_RANGE);
    expect(Object.keys(state.controlPoints)).toHaveLength(CONTROL_POINT_COUNT);
    expect(Object.values(state.units).filter((unit) => unit.side === "blue")).toHaveLength(
      BLUE_UNIT_COUNT,
    );
    expect(Object.values(state.units).filter((unit) => unit.side === "red")).toHaveLength(
      RED_UNIT_COUNT,
    );
  });
});
