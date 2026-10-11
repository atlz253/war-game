import { beforeEach, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Scale: { Events: { RESIZE: "resize" } },
    Scenes: { Events: { SHUTDOWN: "shutdown" } },
    Input: {
      Events: {
        POINTER_DOWN: "pointerdown",
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
      },
    },
  },
}));

import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { getBrowserLmStudioSettings } from "../lm-studio/lm-studio-settings";
import { t } from "../localization/runtime";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import { LmStudioSettingsScene } from "./LmStudioSettingsScene";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
it("saves LM Studio settings and returns the pending setup to SETTINGS", () => {
  const f = canvasFixture();
  const scene = Object.assign(new LmStudioSettingsScene(), f.props);
  const data = {
    view: "settings" as const,
    selectedMapKey: "local:pending",
    matchConfiguration: { ...createDefaultMatchConfiguration(), blue: "lm-studio-ai" as const },
  };
  scene.create(data);
  const internals = scene as unknown as {
    settings: ReturnType<ReturnType<typeof getBrowserLmStudioSettings>["load"]>;
    presentationContainer: Parameters<typeof f.click>[0];
  };
  internals.settings = {
    ...internals.settings,
    blueModelId: "chosen-blue",
    redModelId: "chosen-red",
  };
  f.click(internals.presentationContainer, t("lm-studio-settings.save.back"));
  expect(getBrowserLmStudioSettings().load().blueModelId).toBe("chosen-blue");
  expect(f.start).toHaveBeenCalledWith("main-menu", data);
});
