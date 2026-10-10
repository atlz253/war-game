import { afterEach, expect, it, vi } from "vitest";

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

import { getBuiltInMaps } from "../../core/scenarios/built-in-maps";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { getLocaleCatalog, replaceLocaleCatalog, selectLocale } from "./runtime";

const original = getLocaleCatalog();
afterEach(() => {
  replaceLocaleCatalog(original);
  selectLocale("en");
  vi.unstubAllGlobals();
});
it("offers a translated menu entry and carries commander/map configuration through navigation", () => {
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: vi.fn() } });
  replaceLocaleCatalog({
    ...original,
    locales: [
      ...original.locales,
      {
        schemaVersion: 1,
        id: "qa",
        name: "Test",
        strings: {
          "language.title": "ЯЗЫК",
          "main-menu.start.match": "НАЧАТЬ БОЙ",
          "main-menu.model": "МОДЕЛЬ: {value1}",
        },
      },
    ],
  });
  selectLocale("qa");
  const fixture = canvasFixture();
  const scene = Object.assign(new MainMenuScene(), fixture.props);
  const selectedMapKey = `built-in:${getBuiltInMaps()[0]?.id}`;
  const matchConfiguration = {
    ...createDefaultMatchConfiguration(),
    blue: "heuristic-ai" as const,
  };
  scene.create({ selectedMapKey, matchConfiguration });
  const root = (scene as unknown as { presentationContainer: Parameters<typeof fixture.click>[0] })
    .presentationContainer;
  fixture.click(root, "ЯЗЫК");
  expect(fixture.start).toHaveBeenCalledWith("language", { selectedMapKey, matchConfiguration });
  expect(fixture.descendants(root).some((object) => object.text === "НАЧАТЬ БОЙ")).toBe(true);
});
