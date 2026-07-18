import { describe, expect, it } from "vitest";

import {
  BrowserLmStudioSettings,
  createDefaultLmStudioSettings,
  isLmStudioSettingsReady,
} from "./lm-studio-settings";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("LM Studio settings", () => {
  it("uses the local OpenAI-compatible endpoint by default", () => {
    expect(createDefaultLmStudioSettings()).toEqual({
      baseUrl: "/lm-studio-api/v1",
      modelId: "",
    });
  });

  it("requires a selected model before an LM Studio match can start", () => {
    expect(isLmStudioSettingsReady(createDefaultLmStudioSettings())).toBe(false);
    expect(isLmStudioSettingsReady({ baseUrl: "/lm-studio-api/v1", modelId: "model" })).toBe(true);
  });

  it("persists settings independently from map data", () => {
    const settings = new BrowserLmStudioSettings(new MemoryStorage());
    const saved = { baseUrl: "/lm-studio-api/v1", modelId: "model" };

    settings.save(saved);

    expect(settings.load()).toEqual(saved);
  });
});
