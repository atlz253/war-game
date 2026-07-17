import type { GameAction } from "../../core/actions/game-actions";
import { getLegalActions } from "../../core/actions/get-legal-actions";
import type { GameState } from "../../core/model/game-state";
import type { Agent } from "./Agent";

const RANDOM_AGENT_ID = "random";
const INITIAL_NON_ZERO_SEED = 1;
const UINT32_RANGE = 4_294_967_296;
const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;

export class RandomAgent implements Agent {
  public readonly id = RANDOM_AGENT_ID;
  private randomState: number;

  public constructor(seed: number) {
    this.randomState = seed || INITIAL_NON_ZERO_SEED;
  }

  public chooseAction(state: GameState): GameAction {
    const actions = getLegalActions(state);
    const actionIndex = this.nextInteger(actions.length);
    const action = actions[actionIndex];

    if (!action) {
      throw new Error("No legal action is available.");
    }

    return action;
  }

  private nextInteger(maxExclusive: number): number {
    this.randomState = (this.randomState * LCG_MULTIPLIER + LCG_INCREMENT) >>> 0;

    return Math.floor((this.randomState / UINT32_RANGE) * maxExclusive);
  }
}
