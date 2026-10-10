import { afterEach, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Input: {
      Events: {
        POINTER_DOWN: "pointerdown",
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
      },
    },
  },
}));

import { campaign, mission } from "../../core/campaigns/test-fixtures";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { getLocaleCatalog, replaceLocaleCatalog } from "../localization/runtime";
import { CampaignEditorScene } from "./CampaignEditorScene";

const original = getLocaleCatalog();
afterEach(() => {
  replaceLocaleCatalog(original);
  vi.unstubAllGlobals();
});
it("authors English first, adds catalog-linked translations and warns about unknown packs", () => {
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: vi.fn() } });
  replaceLocaleCatalog({
    ...original,
    locales: [...original.locales, { schemaVersion: 1, id: "ru", name: "Русский", strings: {} }],
  });
  const fixture = canvasFixture();
  const scene = Object.assign(new CampaignEditorScene(), fixture.props);
  scene.create({
    campaign: {
      ...campaign,
      missions: [
        {
          ...mission,
          events: [
            {
              id: "intro",
              type: "dialogue",
              trigger: { type: "mission-start" },
              lines: [{ speaker: "Guide", text: "Hello" }],
            },
          ],
        },
      ],
    },
  });
  const internals = scene as unknown as {
    model: import("../campaigns/editor-model").CampaignEditorModel;
    root: Parameters<typeof fixture.click>[0];
    eventsMode: boolean;
    refresh(): void;
  };
  internals.eventsMode = true;
  internals.refresh();
  expect(internals.model.dialogueLocaleId).toBe("en");
  fixture.click(internals.root, "LANGUAGE: English");
  fixture.click(internals.root, "ADD: Русский");
  expect(internals.model.dialogueLocaleId).toBe("ru");
  expect(
    fixture.descendants(internals.root).some((object) => object.text.includes("English fallback")),
  ).toBe(true);
  internals.model.updateLine({ text: "Привет" });
  expect(internals.model.line?.text).toBe("Hello");
  internals.model.updateEvent({
    localizations: { ...internals.model.event?.localizations, zz: {} },
  });
  internals.model.dialogueLocaleId = "zz";
  internals.refresh();
  expect(
    fixture.descendants(internals.root).some((object) => object.text.includes("unavailable")),
  ).toBe(true);
});
