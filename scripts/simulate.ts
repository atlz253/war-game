import { HeuristicAgent } from "../src/ai/agents/HeuristicAgent";
import { runSimulation } from "../src/ai/simulation/run-simulation";
import { createSkirmishGameState } from "../src/core/scenarios/skirmish-12x8";

const SIMULATION_SEED = 2026;
const MAX_ACTIONS = 400;
const EXIT_FAILURE = 1;

const result = runSimulation({
  seed: SIMULATION_SEED,
  maxActions: MAX_ACTIONS,
  createInitialState: createSkirmishGameState,
  agents: { blue: new HeuristicAgent(), red: new HeuristicAgent() },
});

console.log(
  JSON.stringify({
    seed: result.replay.seed,
    winner: result.finalState.winner,
    turn: result.finalState.turn,
    actionCount: result.replay.actions.length,
    completed: result.completed,
  }),
);

if (!result.completed) {
  process.exitCode = EXIT_FAILURE;
}
