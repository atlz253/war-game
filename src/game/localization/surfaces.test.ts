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
vi.mock("../ui/components/MovementSlider", () => ({
  MovementSlider: class {
    container = { list: [], destroy: vi.fn() };
    blur = vi.fn();
  },
}));

import { mission } from "../../core/campaigns/test-fixtures";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { ReplayDialogue } from "../campaigns/replay-dialogue";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { CampaignModal } from "../ui/components/CampaignModal";
import { translateCoreReason } from "./core-reasons";
import { getLocaleCatalog, replaceLocaleCatalog, selectLocale } from "./runtime";

const original = getLocaleCatalog();
afterEach(() => {
  replaceLocaleCatalog(original);
  selectLocale("en");
});
function translatedViewer() {
  replaceLocaleCatalog({
    ...original,
    locales: [
      ...original.locales,
      {
        schemaVersion: 1,
        id: "qa",
        name: "Test",
        strings: {
          "main-menu.movement.settings": "Настройки движения",
          "common.back": "Назад",
          "campaign-modal.next.close": "Далее / закрыть",
          "reason.emptyDialogue": "Диалог пуст",
        },
      },
    ],
  });
  selectLocale("qa");
}
it("translates settings and core error presentation without altering the underlying reasons", () => {
  translatedViewer();
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: vi.fn() } });
  const fixture = canvasFixture();
  const scene = Object.assign(new MainMenuScene(), fixture.props);
  scene.create({ view: "settings" });
  const root = (scene as unknown as { presentationContainer: Parameters<typeof fixture.click>[0] })
    .presentationContainer;
  expect(fixture.descendants(root).some((o) => o.text === "Настройки движения")).toBe(true);
  fixture.click(root, "Назад");
  expect(fixture.descendants(root).some((o) => o.text === "AI WAR GAME")).toBe(true);
  const reason = "missions[0].events: dialogue is empty";
  expect(translateCoreReason(reason)).toBe("missions[0].events: Диалог пуст");
  expect(reason).toBe("missions[0].events: dialogue is empty");
  expect(translateCoreReason("external disk detail")).toBe("external disk detail");
});
it("uses the recorded narrative language with independent viewer controls and seek cancellation", () => {
  translatedViewer();
  const replay = new ReplayDialogue({
    campaignId: "c",
    campaignName: "C",
    localeId: "ru",
    mission: {
      ...mission,
      events: [
        {
          id: "intro",
          type: "dialogue",
          trigger: { type: "mission-start" },
          lines: [{ id: "line-1", speaker: "Guide", text: "Hello" }],
          localizations: { ru: { "line-1": { text: "Записанный текст" } } },
        },
      ],
    },
    occurrences: [
      { eventId: "intro", sequence: 0, afterActionCount: 1, signal: { type: "mission-start" } },
    ],
  });
  replay.forward(1);
  const fixture = canvasFixture();
  const modal = new CampaignModal(fixture.props as never, replay.controller);
  expect(
    fixture.descendants(modal.container as never).some((o) => o.text === "Записанный текст"),
  ).toBe(true);
  fixture.click(modal.container as never, "Далее / закрыть");
  expect(replay.controller.blocked).toBe(false);
  replay.seek(0);
  replay.forward(1);
  expect(replay.controller.current?.text).toBe("Записанный текст");
  modal.refresh();
  replay.seek(0);
  expect(replay.controller.current).toBeUndefined();
});
