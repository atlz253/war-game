import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { getAttackHighlightPositions } from "./attack-highlights";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const BLUE_ARTILLERY_ID = "blue-artillery-1";
const RED_INFANTRY_ID = "red-infantry-1";

describe("getAttackHighlightPositions", () => {
  it("returns positions of legal enemy targets for the selected unit", () => {
    const state = withUnitPosition(createSkirmishGameState(), RED_INFANTRY_ID, { x: 2, y: 1 });

    expect(getAttackHighlightPositions(state, BLUE_INFANTRY_ID, false)).toEqual([{ x: 2, y: 1 }]);
  });

  it("excludes diagonal enemy targets", () => {
    const state = withUnitPosition(createSkirmishGameState(), RED_INFANTRY_ID, { x: 2, y: 2 });

    expect(getAttackHighlightPositions(state, BLUE_INFANTRY_ID, false)).toEqual([]);
  });

  it("includes diagonal targets within artillery range", () => {
    const state = createSkirmishGameState();
    const artillery = state.units[BLUE_ARTILLERY_ID];
    const target = state.units[RED_INFANTRY_ID];
    const artilleryState = {
      ...state,
      units: {
        [BLUE_ARTILLERY_ID]: { ...artillery, position: { x: 1, y: 1 } },
        [RED_INFANTRY_ID]: { ...target, position: { x: 3, y: 3 } },
      },
    };

    expect(getAttackHighlightPositions(artilleryState, BLUE_ARTILLERY_ID, false)).toEqual([
      { x: 3, y: 3 },
    ]);
  });

  it("excludes targets outside attack range, inside artillery minimum range, and behind mountains", () => {
    const state = withUnitsAndTerrain(createSkirmishGameState());

    expect(getAttackHighlightPositions(state, BLUE_ARTILLERY_ID, false)).toEqual([{ x: 4, y: 1 }]);
  });

  it("returns no positions after artillery has moved this turn", () => {
    const state = withUnitsAndTerrain(createSkirmishGameState());
    const artillery = state.units[BLUE_ARTILLERY_ID];
    const movedState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_ARTILLERY_ID]: { ...artillery, hasMovedThisTurn: true },
      },
    };

    expect(getAttackHighlightPositions(movedState, BLUE_ARTILLERY_ID, false)).toEqual([]);
  });

  it("returns no positions for unavailable selections", () => {
    const state = withUnitPosition(createSkirmishGameState(), RED_INFANTRY_ID, { x: 2, y: 1 });
    const selectedUnit = state.units[BLUE_INFANTRY_ID];
    const completedActionState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: { ...selectedUnit, hasTakenMainAction: true },
      },
    };

    expect(getAttackHighlightPositions(state, null, false)).toEqual([]);
    expect(getAttackHighlightPositions(state, RED_INFANTRY_ID, false)).toEqual([]);
    expect(getAttackHighlightPositions(state, BLUE_INFANTRY_ID, true)).toEqual([]);
    expect(getAttackHighlightPositions(completedActionState, BLUE_INFANTRY_ID, false)).toEqual([]);
  });
});

function withUnitPosition(
  state: ReturnType<typeof createSkirmishGameState>,
  unitId: string,
  position: { x: number; y: number },
) {
  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: { ...state.units[unitId], position },
    },
  };
}

function withUnitsAndTerrain(state: ReturnType<typeof createSkirmishGameState>) {
  return {
    ...state,
    board: {
      ...state.board,
      terrain: [...state.board.terrain, { type: "mountain" as const, position: { x: 1, y: 2 } }],
    },
    units: {
      ...state.units,
      [BLUE_ARTILLERY_ID]: { ...state.units[BLUE_ARTILLERY_ID], position: { x: 1, y: 1 } },
      "red-infantry-1": { ...state.units["red-infantry-1"], position: { x: 2, y: 1 } },
      "red-infantry-2": { ...state.units["red-infantry-2"], position: { x: 4, y: 1 } },
      "red-infantry-3": { ...state.units["red-infantry-3"], position: { x: 1, y: 4 } },
    },
  };
}
