import type { GameAction } from "../../core/actions/game-actions";
import { getLegalActions } from "../../core/actions/get-legal-actions";
import type { GameState } from "../../core/model/game-state";
import {
  LmStudioClient,
  type LmStudioConnection,
  type LmStudioDecisionClient,
} from "../lm-studio/lm-studio-client";
import type { Agent, AgentContext } from "./Agent";

const LM_STUDIO_AGENT_ID = "lm-studio";
const ACTION_ID_PREFIX = "action-";

export class LmStudioAgent implements Agent {
  public readonly id = LM_STUDIO_AGENT_ID;

  public constructor(
    private readonly connection: LmStudioConnection,
    private readonly client: LmStudioDecisionClient = new LmStudioClient(),
  ) {}

  public async chooseAction(state: GameState, context: AgentContext): Promise<GameAction> {
    const legalActions = getLegalActions(state);
    const offeredActions = legalActions.map((action, index) => ({
      id: `${ACTION_ID_PREFIX}${index}`,
      action,
    }));
    const actionId = await this.client.chooseActionId({
      ...this.connection,
      state,
      actionsThisTurn: context.actionsThisTurn,
      legalActions: offeredActions,
    });
    const selectedAction = offeredActions.find((offer) => offer.id === actionId)?.action;

    if (!selectedAction) {
      throw new Error("LM Studio selected an action that was not offered.");
    }

    return selectedAction;
  }
}
