import { describe, expect, it } from "vitest";

import { replayActions } from "../../core/replay/replay-actions";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { HeuristicAgent } from "../agents/HeuristicAgent";
import { runSimulation } from "./run-simulation";

const SIMULATION_SEED = 2026;
const MAX_ACTIONS = 400;
const REPLAYED_TURN = 3;
const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";
const BLUE_WAIT_ACTION = { type: "wait" as const, unitId: BLUE_INFANTRY_ID };
const END_TURN_ACTION = { type: "end-turn" as const };
const RED_WAIT_ACTION = { type: "wait" as const, unitId: RED_INFANTRY_ID };
const RECORDED_ACTIONS = [BLUE_WAIT_ACTION, END_TURN_ACTION, RED_WAIT_ACTION, END_TURN_ACTION];

describe("runSimulation", () => {
  it("plays a deterministic complete match through the public action API", async () => {
    const result = await runSimulation({
      seed: SIMULATION_SEED,
      maxActions: MAX_ACTIONS,
      createInitialState: createSkirmishGameState,
      agents: { blue: new HeuristicAgent(), red: new HeuristicAgent() },
    });

    expect(result.finalState.winner).not.toBeNull();
    expect(result.replay.seed).toBe(SIMULATION_SEED);
    expect(result.replay.actions).not.toHaveLength(0);
  });

  it("replays an agent-generated record to the exact final state", async () => {
    const result = await runSimulation({
      seed: SIMULATION_SEED,
      maxActions: MAX_ACTIONS,
      createInitialState: createSkirmishGameState,
      agents: { blue: new HeuristicAgent(), red: new HeuristicAgent() },
    });

    expect(replayActions(createSkirmishGameState, result.replay.actions)).toEqual(
      result.finalState,
    );
  });
});

describe("replayActions", () => {
  it("reproduces the state from a recorded accepted action sequence", () => {
    const replayedState = replayActions(createSkirmishGameState, RECORDED_ACTIONS);

    expect(replayedState.turn).toBe(REPLAYED_TURN);
    expect(replayedState.activeSide).toBe("blue");
    expect(replayedState.units[BLUE_INFANTRY_ID]?.hasTakenMainAction).toBe(false);
  });
});
