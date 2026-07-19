import type { GameAction } from "../../core/actions/game-actions";
import type { GameState, SideId } from "../../core/model/game-state";
import type { ReplayRecord } from "../../core/replay/replay-actions";
import { applyAction } from "../../core/rules/apply-action";
import type { Agent } from "../agents/Agent";
import { decideAiAction } from "../agents/decide-ai-action";

export interface SimulationOptions {
  readonly seed: number;
  readonly maxActions: number;
  readonly createInitialState: () => GameState;
  readonly agents: Readonly<Record<SideId, Agent>>;
  readonly fallbackAgents?: Readonly<Record<SideId, Agent>>;
}

export interface SimulationResult {
  readonly finalState: GameState;
  readonly replay: ReplayRecord;
  readonly completed: boolean;
  readonly fallbackCount: number;
}

const FIRST_ACTION_COUNT = 0;
const ACTION_INCREMENT = 1;
const FIRST_FALLBACK_COUNT = 0;

export async function runSimulation(options: SimulationOptions): Promise<SimulationResult> {
  let state = options.createInitialState();
  const actions: GameAction[] = [];
  let actionsThisTurn: GameAction[] = [];
  let actionCount = FIRST_ACTION_COUNT;
  let fallbackCount = FIRST_FALLBACK_COUNT;

  while (!state.winner && actionCount < options.maxActions) {
    const agent = options.agents[state.activeSide];
    const fallbackAgent = options.fallbackAgents?.[state.activeSide];
    const decision = fallbackAgent
      ? await decideAiAction(state, { actionsThisTurn }, agent, fallbackAgent)
      : { action: await agent.chooseAction(state, { actionsThisTurn }), usedFallback: false };
    const action = decision.action;
    const result = applyAction(state, action);

    if (!result.accepted) {
      throw new Error(`Agent ${agent.id} returned an invalid ${action.type} action.`);
    }

    actions.push(action);
    fallbackCount += Number(decision.usedFallback);
    actionsThisTurn = action.type === "end-turn" ? [] : [...actionsThisTurn, action];
    state = result.state;
    actionCount += ACTION_INCREMENT;
  }

  return {
    finalState: state,
    replay: { scenarioId: state.scenarioId, seed: options.seed, actions },
    completed: state.winner !== null,
    fallbackCount,
  };
}
