import { describe, expect, it } from "vitest";

import type { Agent } from "../../ai/agents/Agent";
import { decideAiAction } from "../../ai/agents/decide-ai-action";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";

const END_TURN = { type: "end-turn" as const };

describe("decideAiAction", () => {
  it("uses the requested agent action when it is legal", async () => {
    const agent = createAgent(async () => END_TURN);
    const fallback = createAgent(async () => END_TURN);

    await expect(
      decideAiAction(createSkirmishGameState(), { actionsThisTurn: [] }, agent, fallback),
    ).resolves.toEqual({ action: END_TURN, usedFallback: false });
  });

  it("uses the Heuristic fallback when a remote agent rejects its request", async () => {
    const agent = createAgent(async () => Promise.reject(new Error("offline")));
    const fallback = createAgent(async () => END_TURN);

    await expect(
      decideAiAction(createSkirmishGameState(), { actionsThisTurn: [] }, agent, fallback),
    ).resolves.toEqual({ action: END_TURN, usedFallback: true });
  });
});

function createAgent(chooseAction: Agent["chooseAction"]): Agent {
  return { id: "test", chooseAction };
}
