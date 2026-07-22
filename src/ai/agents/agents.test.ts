import { describe, expect, it } from "vitest";

import { getLegalActions } from "../../core/actions/get-legal-actions";
import { validateAction } from "../../core/rules/validate-action";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { HeuristicAgent } from "./HeuristicAgent";
import { RandomAgent } from "./RandomAgent";

const RANDOM_SEED = 12345;
const BLUE_INFANTRY_ID = "blue-infantry-1";
const BLUE_ARTILLERY_ID = "blue-artillery-1";
const RED_INFANTRY_ID = "red-infantry-1";
const ADJACENT_ENEMY_POSITION = { x: 2, y: 2 };

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
});
