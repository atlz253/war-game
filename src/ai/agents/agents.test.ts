import { describe, expect, it } from "vitest";

import { getLegalActions } from "../../core/actions/get-legal-actions";
import { validateAction } from "../../core/rules/validate-action";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { HeuristicAgent } from "./HeuristicAgent";
import { RandomAgent } from "./RandomAgent";

const RANDOM_SEED = 12345;
const BLUE_INFANTRY_ID = "blue-infantry-1";
const BLUE_INFANTRY_TWO_ID = "blue-infantry-2";
const BLUE_INFANTRY_THREE_ID = "blue-infantry-3";
const BLUE_ARTILLERY_ID = "blue-artillery-1";
const RED_INFANTRY_ID = "red-infantry-1";
const ADJACENT_ENEMY_POSITION = { x: 2, y: 1 };
const ARTILLERY_TARGET_POSITION = { x: 6, y: 0 };
const ARTILLERY_FIRING_POSITION = { x: 4, y: 0 };
const SUPPLY_POINT_POSITION = { x: 0, y: 4 };
const ARTILLERY_ATTACK_TARGET_POSITION = { x: 2, y: 2 };

describe("getLegalActions", () => {
  it("returns only orders accepted by the shared validation path", () => {
    const state = createSkirmishGameState();
    const actions = getLegalActions(state);

    expect(actions).not.toHaveLength(0);
    expect(actions.every((action) => validateAction(state, action).isValid)).toBe(true);
  });
});

describe("RandomAgent", () => {
  it("returns the same legal action sequence for the same seed", async () => {
    const firstAgent = new RandomAgent(RANDOM_SEED);
    const secondAgent = new RandomAgent(RANDOM_SEED);
    const state = createSkirmishGameState();

    const firstActions = [
      await firstAgent.chooseAction(state, { actionsThisTurn: [] }),
      await firstAgent.chooseAction(state, { actionsThisTurn: [] }),
    ];
    const secondActions = [
      await secondAgent.chooseAction(state, { actionsThisTurn: [] }),
      await secondAgent.chooseAction(state, { actionsThisTurn: [] }),
    ];

    expect(firstActions).toEqual(secondActions);
    expect(firstActions.every((action) => validateAction(state, action).isValid)).toBe(true);
  });
});

describe("HeuristicAgent", () => {
  it("moves a unit without ammunition toward an owned control point before attacking", async () => {
    const state = createSkirmishGameState();
    const resupplyState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], ammo: 0 },
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: ARTILLERY_ATTACK_TARGET_POSITION,
        },
      },
    };
    const agent = new HeuristicAgent();
    const action = await agent.chooseAction(resupplyState, { actionsThisTurn: [] });

    expect(action).toEqual({
      type: "move",
      unitId: BLUE_INFANTRY_ID,
      destination: SUPPLY_POINT_POSITION,
    });
    expect(validateAction(resupplyState, action)).toEqual({ isValid: true });
  });

  it("keeps its existing priority when no owned control point is available for resupply", async () => {
    const state = createSkirmishGameState();
    const fallbackState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], ammo: 0 },
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: ARTILLERY_ATTACK_TARGET_POSITION,
        },
      },
      controlPoints: Object.fromEntries(
        Object.entries(state.controlPoints).map(([controlPointId, controlPoint]) => [
          controlPointId,
          { ...controlPoint, owner: null },
        ]),
      ),
    };
    const agent = new HeuristicAgent();

    await expect(agent.chooseAction(fallbackState, { actionsThisTurn: [] })).resolves.toEqual({
      type: "attack",
      unitId: BLUE_ARTILLERY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });
  });
});

describe("HeuristicAgent baseline behavior", () => {
  it("prioritizes a legal adjacent attack", async () => {
    const state = createSkirmishGameState();
    const combatState = {
      ...state,
      units: {
        ...state.units,
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: ADJACENT_ENEMY_POSITION,
        },
        [BLUE_ARTILLERY_ID]: {
          ...state.units[BLUE_ARTILLERY_ID],
          hasTakenMainAction: true,
        },
      },
    };
    const agent = new HeuristicAgent();

    await expect(agent.chooseAction(combatState, { actionsThisTurn: [] })).resolves.toEqual({
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });
  });

  it("keeps artillery at or beyond its minimum attack range while moving", async () => {
    const state = createSkirmishGameState();
    const artillery = state.units[BLUE_ARTILLERY_ID];
    const movementState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], hasTakenMainAction: true },
        [BLUE_INFANTRY_TWO_ID]: {
          ...state.units[BLUE_INFANTRY_TWO_ID],
          hasTakenMainAction: true,
        },
        [BLUE_INFANTRY_THREE_ID]: {
          ...state.units[BLUE_INFANTRY_THREE_ID],
          hasTakenMainAction: true,
        },
        "blue-tank-1": { ...state.units["blue-tank-1"], hasTakenMainAction: true },
        [BLUE_ARTILLERY_ID]: { ...artillery, hasMovedThisTurn: true },
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: ARTILLERY_TARGET_POSITION,
        },
      },
    };
    const agent = new HeuristicAgent();
    const action = await agent.chooseAction(movementState, { actionsThisTurn: [] });

    expect(action).toEqual({
      type: "move",
      unitId: BLUE_ARTILLERY_ID,
      destination: ARTILLERY_FIRING_POSITION,
    });
    expect(validateAction(movementState, action)).toEqual({ isValid: true });
  });
});
