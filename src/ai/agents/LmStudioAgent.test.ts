import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { LmStudioAgent } from "./LmStudioAgent";

const MODEL_ID = "local-model";
const FIRST_ACTION_ID = "action-0";

describe("LmStudioAgent", () => {
  it("resolves a model choice only from the supplied legal action list", async () => {
    const client = { chooseActionId: async () => FIRST_ACTION_ID };
    const agent = new LmStudioAgent(
      { baseUrl: "http://127.0.0.1:1234/v1", modelId: MODEL_ID },
      client,
    );

    await expect(
      agent.chooseAction(createSkirmishGameState(), { actionsThisTurn: [] }),
    ).resolves.toEqual(expect.objectContaining({ type: "move" }));
  });

  it("rejects an action ID that was not offered to the model", async () => {
    const client = { chooseActionId: async () => "not-offered" };
    const agent = new LmStudioAgent(
      { baseUrl: "http://127.0.0.1:1234/v1", modelId: MODEL_ID },
      client,
    );

    await expect(
      agent.chooseAction(createSkirmishGameState(), { actionsThisTurn: [] }),
    ).rejects.toThrow("LM Studio selected an action that was not offered.");
  });
});
