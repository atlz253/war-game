import type { GameAction } from "../actions/game-actions";
import type { GameEvent } from "../model/game-events";
import type { GameState } from "../model/game-state";
import { applyAction } from "../rules/apply-action";

export interface ReplayFrame {
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly events: readonly GameEvent[];
}

export interface ReplayTimeline {
  readonly frames: readonly ReplayFrame[];
  readonly finalState: GameState;
}

export function createReplayTimeline(
  createInitialState: () => GameState,
  actions: readonly GameAction[],
): ReplayTimeline {
  let state = createInitialState();
  const frames: ReplayFrame[] = [{ state, action: null, events: [] }];

  for (const action of actions) {
    const result = applyAction(state, action);

    if (!result.accepted) {
      throw new Error(`Replay action was rejected: ${action.type}`);
    }

    state = result.state;
    frames.push({ state, action, events: result.events });
  }

  return { frames, finalState: state };
}
