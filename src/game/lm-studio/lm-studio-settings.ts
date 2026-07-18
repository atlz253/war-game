import type { LmStudioConnection } from "../../ai/lm-studio/lm-studio-client";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LmStudioSettings = LmStudioConnection;

const STORAGE_KEY = "ai-war-game.lm-studio-settings.v1";
const DEFAULT_BASE_URL = "/lm-studio-api/v1";
const LEGACY_DIRECT_LOCAL_BASE_URL = "http://127.0.0.1:1234/v1";
const EMPTY_MODEL_ID = "";

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
  return { baseUrl: DEFAULT_BASE_URL, modelId: EMPTY_MODEL_ID };
}

export function isLmStudioSettingsReady(settings: LmStudioSettings): boolean {
  return settings.baseUrl.trim().length > 0 && settings.modelId.trim().length > 0;
}

export function getBrowserLmStudioSettings(): BrowserLmStudioSettings {
  return new BrowserLmStudioSettings(window.localStorage);
}

function isLmStudioSettings(value: unknown): value is LmStudioSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    "baseUrl" in value &&
    "modelId" in value &&
    typeof value.baseUrl === "string" &&
    typeof value.modelId === "string"
  );
}

function migrateLmStudioSettings(settings: LmStudioSettings): LmStudioSettings {
  return settings.baseUrl === LEGACY_DIRECT_LOCAL_BASE_URL
    ? { ...settings, baseUrl: DEFAULT_BASE_URL }
    : settings;
}
