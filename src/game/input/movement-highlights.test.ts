import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { getMovementHighlightPositions } from "./movement-highlights";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";
const UNIT_AT_START = { x: 1, y: 1 };
const ADJACENT_DESTINATION = { x: 2, y: 1 };
const FOREST_DESTINATION = { x: 2, y: 1 };

describe("getMovementHighlightPositions", () => {
  it("returns only legal move destinations for the selected blue unit", () => {
    const state = createSkirmishGameState();

    const positions = getMovementHighlightPositions(state, BLUE_INFANTRY_ID, false);

    expect(positions).toContainEqual(ADJACENT_DESTINATION);
    expect(positions).not.toContainEqual(UNIT_AT_START);
    expect(positions).not.toContainEqual({ x: 10, y: 1 });
  });

  it("respects movement points and diagonal corner blocking", () => {
    const state = createSkirmishGameState();
    const unit = state.units[BLUE_INFANTRY_ID];

    const constrainedState = {
      ...state,
      board: {
        ...state.board,
        blockedCells: [
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ],
      },
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: {
          ...unit,
          movementPoints: 1,
        },
      },
    };

    const positions = getMovementHighlightPositions(constrainedState, BLUE_INFANTRY_ID, false);

    expect(positions).not.toContainEqual({ x: 2, y: 2 });
    expect(positions).not.toContainEqual({ x: 3, y: 1 });
  });

  it("does not highlight a forest cell when its entry cost exceeds movement points", () => {
    const state = createSkirmishGameState();
    const unit = state.units[BLUE_INFANTRY_ID];
    const constrainedState = {
      ...state,
      board: {
        ...state.board,
        terrain: [{ type: "forest" as const, position: FOREST_DESTINATION }],
      },
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: { ...unit, movementPoints: 1 },
      },
    };

    expect(
      getMovementHighlightPositions(constrainedState, BLUE_INFANTRY_ID, false),
    ).not.toContainEqual(FOREST_DESTINATION);
  });

  it("returns no positions without a selectable blue unit", () => {
    const state = createSkirmishGameState();

    expect(getMovementHighlightPositions(state, null, false)).toEqual([]);
    expect(getMovementHighlightPositions(state, RED_INFANTRY_ID, false)).toEqual([]);
    expect(getMovementHighlightPositions(state, BLUE_INFANTRY_ID, true)).toEqual([]);
  });

  it("returns legal destinations for the active Red human unit", () => {
    const state = {
      ...createSkirmishGameState(),
      activeSide: "red" as const,
    };

    expect(getMovementHighlightPositions(state, RED_INFANTRY_ID, false)).toContainEqual({
      x: 9,
      y: 1,
    });
  });
});
