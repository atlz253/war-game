import type { GameAction } from "../../core/actions/game-actions";
import type { GameState } from "../../core/model/game-state";
import { validateAction } from "../../core/rules/validate-action";
import type { Agent, AgentContext } from "./Agent";

export interface AiActionDecision {
  readonly action: GameAction;
  readonly usedFallback: boolean;
}

export async function decideAiAction(
  state: GameState,
  context: AgentContext,
  agent: Agent,
  fallbackAgent: Agent,
): Promise<AiActionDecision> {
  try {
    const action = await agent.chooseAction(state, context);

    if (validateAction(state, action).isValid) {
      return { action, usedFallback: false };
    }
  } catch {
    return chooseFallbackAction(state, context, fallbackAgent);
  }

  return chooseFallbackAction(state, context, fallbackAgent);
}

async function chooseFallbackAction(
  state: GameState,
  context: AgentContext,
  fallbackAgent: Agent,
): Promise<AiActionDecision> {
  const action = await fallbackAgent.chooseAction(state, context);

  if (!validateAction(state, action).isValid) {
    throw new Error(`${fallbackAgent.id} returned an invalid fallback action.`);
  }

  return { action, usedFallback: true };
}
