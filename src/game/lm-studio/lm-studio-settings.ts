import {
  DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS,
  type LmStudioConnection,
} from "../../ai/lm-studio/lm-studio-client";
import type { SideId } from "../../core/model/game-state";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LmStudioSettings {
  readonly baseUrl: string;
  readonly blueModelId: string;
  readonly redModelId: string;
  readonly requestTimeoutMs: number | null;
}

interface LegacyLmStudioSettings {
  readonly baseUrl: string;
  readonly modelId: string;
  readonly requestTimeoutMs?: number;
}

const STORAGE_KEY = "ai-war-game.lm-studio-settings.v1";
const DEFAULT_BASE_URL = "/lm-studio-api/v1";
const LEGACY_DIRECT_LOCAL_BASE_URL = "http://127.0.0.1:1234/v1";
const EMPTY_MODEL_ID = "";
export const MIN_LM_STUDIO_TIMEOUT_MS = 1_000;
export const MAX_LM_STUDIO_TIMEOUT_MS = 300_000;

export class BrowserLmStudioSettings {
  public constructor(private readonly storage: StorageLike) {}

  public load(): LmStudioSettings {
    const stored = this.storage.getItem(STORAGE_KEY);

    if (!stored) {
      return createDefaultLmStudioSettings();
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      return isLmStudioSettings(parsed)
        ? migrateLmStudioSettings(parsed)
        : createDefaultLmStudioSettings();
    } catch {
      return createDefaultLmStudioSettings();
    }
  }

  public save(settings: LmStudioSettings): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}

export function createDefaultLmStudioSettings(): LmStudioSettings {
  return {
    baseUrl: DEFAULT_BASE_URL,
    blueModelId: EMPTY_MODEL_ID,
    redModelId: EMPTY_MODEL_ID,
    requestTimeoutMs: DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS,
  };
}

export function isLmStudioSideReady(settings: LmStudioSettings, side: SideId): boolean {
  return settings.baseUrl.trim().length > 0 && getModelId(settings, side).trim().length > 0;
}

export function createLmStudioConnection(
  settings: LmStudioSettings,
  side: SideId,
): LmStudioConnection {
  return {
    baseUrl: settings.baseUrl,
    modelId: getModelId(settings, side),
    timeoutMs: settings.requestTimeoutMs,
  };
}

export function isValidLmStudioTimeout(timeoutMs: number): boolean {
  return (
    Number.isInteger(timeoutMs) &&
    timeoutMs >= MIN_LM_STUDIO_TIMEOUT_MS &&
    timeoutMs <= MAX_LM_STUDIO_TIMEOUT_MS
  );
}

export function getBrowserLmStudioSettings(): BrowserLmStudioSettings {
  return new BrowserLmStudioSettings(window.localStorage);
}

function isLmStudioSettings(value: unknown): value is LmStudioSettings | LegacyLmStudioSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    "baseUrl" in value &&
    typeof value.baseUrl === "string" &&
    (("blueModelId" in value &&
      "redModelId" in value &&
      typeof value.blueModelId === "string" &&
      typeof value.redModelId === "string") ||
      ("modelId" in value && typeof value.modelId === "string"))
  );
}

function migrateLmStudioSettings(
  settings: LmStudioSettings | LegacyLmStudioSettings,
): LmStudioSettings {
  const baseUrl =
    settings.baseUrl === LEGACY_DIRECT_LOCAL_BASE_URL ? DEFAULT_BASE_URL : settings.baseUrl;
  if (isLegacyLmStudioSettings(settings)) {
    return {
      baseUrl,
      blueModelId: settings.modelId,
      redModelId: settings.modelId,
      requestTimeoutMs: settings.requestTimeoutMs ?? DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS,
    };
  }

  return {
    baseUrl,
    blueModelId: settings.blueModelId,
    redModelId: settings.redModelId,
    requestTimeoutMs: readTimeout(settings),
  };
}

function isLegacyLmStudioSettings(
  settings: LmStudioSettings | LegacyLmStudioSettings,
): settings is LegacyLmStudioSettings {
  return "modelId" in settings;
}

function getModelId(settings: LmStudioSettings, side: SideId): string {
  return side === "blue" ? settings.blueModelId : settings.redModelId;
}

function readTimeout(settings: LmStudioSettings | LegacyLmStudioSettings): number | null {
  const timeoutMs = settings.requestTimeoutMs;

  if (timeoutMs === null) return null;
  return typeof timeoutMs === "number" && isValidLmStudioTimeout(timeoutMs)
    ? timeoutMs
    : DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS;
}
