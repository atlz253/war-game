import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { getPathMovementCost } from "../terrain/terrain-rules";
import { findPath } from "./find-path";

const UNIT_ID = "blue-infantry-1";
const START = { x: 0, y: 0 };
const DESTINATION = { x: 4, y: 0 };
const LOWEST_COST_ROUTE_COST = 4;

describe("findPath", () => {
  it("selects the deterministic lowest-cost route instead of the first forest route", () => {
    const state = createSkirmishGameState();
    const board = {
      ...state.board,
      width: 5,
      height: 2,
      terrain: [
        { type: "forest" as const, position: { x: 1, y: 0 } },
        { type: "forest" as const, position: { x: 2, y: 0 } },
        { type: "forest" as const, position: { x: 3, y: 0 } },
      ],
    };
    const units = { [UNIT_ID]: { ...state.units[UNIT_ID], position: START } };

    const path = findPath(board, units, UNIT_ID, START, DESTINATION);

    expect(path).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, DESTINATION]);
    expect(path && getPathMovementCost(board, path)).toBe(LOWEST_COST_ROUTE_COST);
  });
});
