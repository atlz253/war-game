import { describe, expect, it } from "vitest";

import {
  BrowserLmStudioSettings,
  createDefaultLmStudioSettings,
  createLmStudioConnection,
  isLmStudioSideReady,
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
      blueModelId: "",
      redModelId: "",
    });
  });

  it("requires a selected model only for the LM Studio-controlled side", () => {
    const settings = { baseUrl: "/lm-studio-api/v1", blueModelId: "blue-model", redModelId: "" };

    expect(isLmStudioSideReady(settings, "blue")).toBe(true);
    expect(isLmStudioSideReady(settings, "red")).toBe(false);
    expect(createLmStudioConnection(settings, "blue")).toEqual({
      baseUrl: "/lm-studio-api/v1",
      modelId: "blue-model",
    });
  });

  it("migrates the legacy single model to both competitors", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "ai-war-game.lm-studio-settings.v1",
      JSON.stringify({ baseUrl: "/lm-studio-api/v1", modelId: "model" }),
    );
    const settings = new BrowserLmStudioSettings(storage);

    expect(settings.load()).toEqual({
      baseUrl: "/lm-studio-api/v1",
      blueModelId: "model",
      redModelId: "model",
    });
  });

  it("persists separate model selections independently from map data", () => {
    const settings = new BrowserLmStudioSettings(new MemoryStorage());
    const saved = {
      baseUrl: "/lm-studio-api/v1",
      blueModelId: "blue-model",
      redModelId: "red-model",
    };

    settings.save(saved);

    expect(settings.load()).toEqual(saved);
  });
});
