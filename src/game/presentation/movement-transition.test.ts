import { describe, expect, it } from "vitest";
import { findPath } from "../../core/pathfinding/find-path";
import { applyAction } from "../../core/rules/apply-action";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { movementRoute } from "./movement-transition";

const ROUTE_DESTINATION_AXIS = 2;

describe("movement route", () => {
  it("traverses legal diagonals and routes around occupants and terrain", () => {
    const initial = createSkirmishGameState();
    const unit = initial.units["blue-infantry-1"];
    if (!unit) throw Error("fixture");
    const state = {
      ...initial,
      board: { ...initial.board, terrain: [], blockedCells: [] },
      units: { [unit.id]: { ...unit, position: { x: 0, y: 0 } } },
    };
    const action = {
      type: "move" as const,
      unitId: unit.id,
      destination: { x: ROUTE_DESTINATION_AXIS, y: ROUTE_DESTINATION_AXIS },
    };
    expect(movementRoute(state, action, true)?.cells).toEqual([
      { x: 1, y: 1 },
      { x: ROUTE_DESTINATION_AXIS, y: ROUTE_DESTINATION_AXIS },
    ]);
    const blocker = { ...unit, id: "blocker", position: { x: 1, y: 1 } };
    const occupied = { ...state, units: { ...state.units, blocker } };
    const occupiedRoute = movementRoute(occupied, action, true)?.cells;
    expect(occupiedRoute).not.toContainEqual(blocker.position);
    expect(occupiedRoute?.at(-1)).toEqual(action.destination);
    const forest = {
      ...state,
      board: { ...state.board, terrain: [{ type: "forest" as const, position: { x: 1, y: 1 } }] },
    };
    const forestRoute = movementRoute(forest, action, true)?.cells;
    expect(forestRoute).toEqual([
      { x: 1, y: 1 },
      { x: ROUTE_DESTINATION_AXIS, y: ROUTE_DESTINATION_AXIS },
    ]);
    const blocked = {
      ...state,
      board: {
        ...state.board,
        blockedCells: [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
      },
    };
    expect(movementRoute(blocked, action, true)).toBeNull();
  });
  it("uses the pre-action snapshot and preserves it", () => {
    const state = createSkirmishGameState();
    const unit = Object.values(state.units).find((u) => u.side === "blue");
    if (!unit) throw Error("fixture");
    const copy = structuredClone(state);
    const action = {
      type: "move" as const,
      unitId: unit.id,
      destination: { x: unit.position.x + ROUTE_DESTINATION_AXIS, y: unit.position.y },
    };
    const result = applyAction(state, action);
    expect(result.accepted).toBe(true);
    expect(movementRoute(state, action, result.accepted)).toEqual({
      unitId: unit.id,
      from: unit.position,
      cells: findPath(state.board, state.units, unit.id, unit.position, action.destination),
    });
    expect(state).toEqual(copy);
    expect(movementRoute(state, action, false)).toBeNull();
    expect(movementRoute(state, { type: "end-turn" }, true)).toBeNull();
    expect(movementRoute(state, { ...action, unitId: "missing" }, true)).toBeNull();
    expect(movementRoute(state, { ...action, destination: { x: -1, y: -1 } }, true)).toBeNull();
  });
});
