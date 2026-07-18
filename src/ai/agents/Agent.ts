import type { GameAction } from "../../core/actions/game-actions";
import type { GameState } from "../../core/model/game-state";

export interface AgentContext {
  readonly actionsThisTurn: readonly GameAction[];
}

export interface Agent {
  readonly id: string;
  chooseAction(state: GameState, context: AgentContext): Promise<GameAction>;
}
