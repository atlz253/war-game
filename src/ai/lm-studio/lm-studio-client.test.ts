import { describe, expect, it, vi } from "vitest";

import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { LmStudioClient, normalizeLmStudioBaseUrl } from "./lm-studio-client";

const MODEL_ID = "local-model";
const ACTION_ID = "action-1";
const DEFAULT_BASE_URL = "http://127.0.0.1:1234/v1";

describe("normalizeLmStudioBaseUrl", () => {
  it("normalizes a local server URL to the OpenAI-compatible v1 base", () => {
    expect(normalizeLmStudioBaseUrl("http://127.0.0.1:1234/")).toBe(DEFAULT_BASE_URL);
  });

  it("preserves a relative proxy path for browser-local LM Studio requests", () => {
    expect(normalizeLmStudioBaseUrl("/lm-studio-api/v1")).toBe("/lm-studio-api/v1");
  });
});

describe("LmStudioClient", () => {
  it("lists model IDs from the OpenAI-compatible models endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: MODEL_ID }] }));
    const client = new LmStudioClient(fetcher);

    await expect(client.listModels(DEFAULT_BASE_URL)).resolves.toEqual([MODEL_ID]);
    expect(fetcher).toHaveBeenCalledWith(`${DEFAULT_BASE_URL}/models`, expect.any(Object));
  });

  it("sends the current-turn action history and resolves the structured action ID", async () => {
    const fetcher = vi.fn().mockResolvedValue(chatResponse(ACTION_ID));
    const client = new LmStudioClient(fetcher);
    const state = createSkirmishGameState();

    await expect(
      client.chooseActionId({
        baseUrl: DEFAULT_BASE_URL,
        modelId: MODEL_ID,
        state,
        actionsThisTurn: [{ type: "wait", unitId: "blue-infantry-1" }],
        legalActions: [{ id: ACTION_ID, action: { type: "end-turn" } }],
      }),
    ).resolves.toBe(ACTION_ID);

    expect(fetcher).toHaveBeenCalledWith(
      `${DEFAULT_BASE_URL}/chat/completions`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.stringify(fetcher.mock.calls[0]?.[1])).toContain("actionsThisTurn");
  });

  it("rejects an unavailable or malformed model response", async () => {
    const client = new LmStudioClient(vi.fn().mockResolvedValue(chatResponse("")));

    await expect(
      client.chooseActionId({
        baseUrl: DEFAULT_BASE_URL,
        modelId: MODEL_ID,
        state: createSkirmishGameState(),
        actionsThisTurn: [],
        legalActions: [{ id: ACTION_ID, action: { type: "end-turn" } }],
      }),
    ).rejects.toThrow("LM Studio response did not contain an action ID.");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function chatResponse(actionId: string): Response {
  return jsonResponse({ choices: [{ message: { content: JSON.stringify({ actionId }) } }] });
}
