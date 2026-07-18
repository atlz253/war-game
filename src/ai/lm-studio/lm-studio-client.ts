import type { GameAction } from "../../core/actions/game-actions";
import type { GameState } from "../../core/model/game-state";

export interface LmStudioConnection {
  readonly baseUrl: string;
  readonly modelId: string;
  readonly timeoutMs?: number | null;
}

export interface LmStudioActionRequest extends LmStudioConnection {
  readonly state: GameState;
  readonly actionsThisTurn: readonly GameAction[];
  readonly legalActions: readonly LmStudioActionChoice[];
}

export interface LmStudioActionChoice {
  readonly id: string;
  readonly action: GameAction;
}

export interface LmStudioDecisionClient {
  chooseActionId(request: LmStudioActionRequest): Promise<string>;
}

export type FetchLike = typeof fetch;

const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

const DEFAULT_PROTOCOL = "http://";
const V1_PATH = "/v1";
const MODELS_PATH = "/models";
const CHAT_COMPLETIONS_PATH = "/chat/completions";
const HTTP_METHOD_POST = "POST";
const JSON_CONTENT_TYPE = "application/json";
const TEMPERATURE = 0.2;
const MAX_TOKENS = 64;
export const DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS = 60_000;
const DECISION_SCHEMA_NAME = "ai_war_game_action";
const SYSTEM_PROMPT =
  "You are a turn-based strategy opponent. Select exactly one actionId from legalActions. Return JSON only.";

export class LmStudioClient implements LmStudioDecisionClient {
  public constructor(
    private readonly fetcher: FetchLike = defaultFetch,
    private readonly requestTimeoutMs = DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS,
  ) {}

  public async listModels(
    baseUrl: string,
    timeoutMs: number | null = this.requestTimeoutMs,
  ): Promise<readonly string[]> {
    const response = await this.fetchWithTimeout(
      `${normalizeLmStudioBaseUrl(baseUrl)}${MODELS_PATH}`,
      undefined,
      timeoutMs,
    );
    const body: unknown = await response.json();

    if (!response.ok || !isModelList(body)) {
      throw new Error("LM Studio did not return a valid model list.");
    }

    return body.data.map((model) => model.id);
  }

  public async chooseActionId(request: LmStudioActionRequest): Promise<string> {
    const response = await this.fetchWithTimeout(
      `${normalizeLmStudioBaseUrl(request.baseUrl)}${CHAT_COMPLETIONS_PATH}`,
      createChatRequest(request),
      request.timeoutMs === undefined ? this.requestTimeoutMs : request.timeoutMs,
    );
    const body: unknown = await response.json();

    if (!response.ok) {
      throw new Error("LM Studio request failed.");
    }

    return readActionId(body);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit | undefined,
    timeoutMs: number | null,
  ): Promise<Response> {
    if (timeoutMs === null) {
      return this.fetcher(url, init);
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await this.fetcher(url, { ...init, signal: controller.signal });
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}

export function normalizeLmStudioBaseUrl(baseUrl: string): string {
  const trimmedUrl = baseUrl.trim().replace(/\/+$/, "");
  if (trimmedUrl.startsWith("/")) {
    return trimmedUrl.endsWith(V1_PATH) ? trimmedUrl : `${trimmedUrl}${V1_PATH}`;
  }
  const urlWithProtocol = trimmedUrl.includes("://")
    ? trimmedUrl
    : `${DEFAULT_PROTOCOL}${trimmedUrl}`;

  return urlWithProtocol.endsWith(V1_PATH) ? urlWithProtocol : `${urlWithProtocol}${V1_PATH}`;
}

function createChatRequest(request: LmStudioActionRequest): RequestInit {
  return {
    method: HTTP_METHOD_POST,
    headers: { "Content-Type": JSON_CONTENT_TYPE },
    body: JSON.stringify({
      model: request.modelId,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: DECISION_SCHEMA_NAME,
          strict: true,
          schema: {
            type: "object",
            properties: {
              actionId: { type: "string", enum: request.legalActions.map((choice) => choice.id) },
            },
            required: ["actionId"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            state: request.state,
            actionsThisTurn: request.actionsThisTurn,
            legalActions: request.legalActions,
          }),
        },
      ],
    }),
  };
}

function readActionId(body: unknown): string {
  if (!isChatResponse(body)) {
    throw new Error("LM Studio response did not contain an action ID.");
  }

  const content = body.choices[0]?.message.content;

  if (typeof content !== "string") {
    throw new Error("LM Studio response did not contain an action ID.");
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (isActionIdResponse(parsed)) return parsed.actionId;
  } catch {
    throw new Error("LM Studio response did not contain an action ID.");
  }

  throw new Error("LM Studio response did not contain an action ID.");
}

function isModelList(value: unknown): value is { data: readonly { id: string }[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray(value.data) &&
    value.data.every(
      (model) =>
        typeof model === "object" &&
        model !== null &&
        "id" in model &&
        typeof model.id === "string",
    )
  );
}

function isChatResponse(
  value: unknown,
): value is { choices: readonly { message: { content: unknown } }[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "choices" in value &&
    Array.isArray(value.choices) &&
    value.choices.length > 0 &&
    typeof value.choices[0] === "object" &&
    value.choices[0] !== null &&
    "message" in value.choices[0] &&
    typeof value.choices[0].message === "object" &&
    value.choices[0].message !== null &&
    "content" in value.choices[0].message
  );
}

function isActionIdResponse(value: unknown): value is { actionId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "actionId" in value &&
    typeof value.actionId === "string" &&
    value.actionId.length > 0
  );
}
