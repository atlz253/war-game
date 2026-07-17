import type { GameAction } from "../actions/game-actions";
import type { GameState } from "../model/game-state";
import { applyAction } from "../rules/apply-action";

export interface ReplayRecord {
  readonly scenarioId: string;
  readonly seed: number;
  readonly actions: readonly GameAction[];
}

export function replayActions(
  createInitialState: () => GameState,
  actions: readonly GameAction[],
): GameState {
  let state = createInitialState();

  for (const action of actions) {
    const result = applyAction(state, action);

    if (!result.accepted) {
      throw new Error(`Replay action was rejected: ${action.type}`);
    }

    state = result.state;
  }

  return state;
}
