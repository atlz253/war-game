import type { GameAction } from "../../core/actions/game-actions";
import type { GameState } from "../../core/model/game-state";

export interface Agent {
  readonly id: string;
  chooseAction(state: GameState): GameAction;
}
