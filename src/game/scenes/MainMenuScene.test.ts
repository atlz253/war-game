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
const slider = vi.hoisted(() => ({ blur: vi.fn(), container: { list: [], destroy: vi.fn() } }));
vi.mock("../ui/components/MovementSlider", () => ({
  MovementSlider: class {
    container = slider.container;
    blur = slider.blur;
  },
}));
const catalog = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../maps/map-catalog", async (original) => ({
  ...(await original<typeof import("../maps/map-catalog")>()),
  getBrowserMapCatalog: () => catalog,
}));

import { getBuiltInMaps } from "../../core/scenarios/built-in-maps";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import {
  createDefaultLmStudioSettings,
  getBrowserLmStudioSettings,
} from "../lm-studio/lm-studio-settings";
import { selectLocale, t } from "../localization/runtime";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import type { MainMenuSceneData } from "../menu/menu-navigation";
import { MainMenuScene } from "./MainMenuScene";

const maps = getBuiltInMaps().map((map) => ({ source: "built-in", map }));
const defaultConfiguration = createDefaultMatchConfiguration();
function fixture(data: MainMenuSceneData = {}) {
  const canvas = canvasFixture();
  const scene = Object.assign(new MainMenuScene(), canvas.props);
  scene.create(data);
  const root = () =>
    (scene as unknown as { presentationContainer: Parameters<typeof canvas.click>[0] })
      .presentationContainer;
  return {
    ...canvas,
    scene,
    root,
    clickLabel: (label: string) => canvas.click(root(), label),
    texts: () =>
      canvas
        .descendants(root())
        .map((object) => object.text)
        .filter(Boolean),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  const stored = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
  selectLocale("en");
  catalog.list.mockReturnValue(maps);
  getBrowserLmStudioSettings().save(createDefaultLmStudioSettings());
});
it("shows the title and exactly six ordered root buttons", () => {
  const f = fixture();
  expect(f.texts()).toEqual([
    "AI WAR GAME",
    "CAMPAIGNS",
    "QUICK MATCH",
    "MULTIPLAYER",
    "REPLAYS",
    "MAP EDITOR",
    "SETTINGS",
  ]);
});
it("bounds commander and model text to their columns for long translations", () => {
  const f = canvasFixture();
  const text = vi.spyOn(f.props.add, "text");
  const scene = Object.assign(new MainMenuScene(), f.props);
  scene.create({ view: "quick-match" });
  expect(text).toHaveBeenCalledWith(
    expect.any(Number),
    expect.any(Number),
    "BLUE COMMANDER",
    expect.objectContaining({
      wordWrap: expect.objectContaining({ width: expect.any(Number) }),
    }),
  );
  expect(text).toHaveBeenCalledWith(
    expect.any(Number),
    expect.any(Number),
    "",
    expect.objectContaining({
      wordWrap: expect.objectContaining({ width: expect.any(Number) }),
    }),
  );
});
it.each([
  ["CAMPAIGNS", "campaign-library"],
  ["REPLAYS", "replay-library"],
])("opens %s directly", (label, destination) => {
  const f = fixture();
  f.clickLabel(label);
  expect(f.start).toHaveBeenCalledWith(destination);
});
it("keeps selected map/source and commanders for the map editor", () => {
  const map = maps[1];
  if (!map) throw Error("second map missing");
  const f = fixture({
    selectedMapKey: `built-in:${map.map.id}`,
    matchConfiguration: defaultConfiguration,
  });
  f.clickLabel("MAP EDITOR");
  expect(f.start).toHaveBeenCalledWith("map-editor", {
    mapId: map.map.id,
    mapSource: map.source,
    matchConfiguration: defaultConfiguration,
  });
});
it("moves setup to QUICK MATCH and retains choices across BACK", () => {
  const f = fixture();
  f.clickLabel("QUICK MATCH");
  expect(f.texts()).toContain("BLUE COMMANDER");
  expect(f.texts()).toContain("RED COMMANDER");
  expect(f.texts()).toContain(t("main-menu.choose.commanders.and.a.map.then.start.the.match"));
  f.clickLabel(t("match-configuration.human"));
  f.clickLabel(t("campaign-editor.map.2"));
  const setup = f.texts();
  f.clickLabel("BACK");
  f.clickLabel("QUICK MATCH");
  expect(f.texts()).toEqual(setup);
  f.clickLabel("START MATCH");
  expect(f.start).toHaveBeenCalledWith(
    "battle",
    expect.objectContaining({
      mapDefinition: maps[1]?.map,
      matchConfiguration: expect.objectContaining({ blue: "heuristic-ai", red: "heuristic-ai" }),
    }),
  );
});
it("shows model indicators and blocks incomplete LM Studio setup", () => {
  const f = fixture({
    view: "quick-match",
    matchConfiguration: { ...defaultConfiguration, blue: "lm-studio-ai" },
  });
  expect(f.texts()).toContain(t("main-menu.model", { value1: t("common.notSelected") }));
  expect(f.texts()).toContain(
    t("main-menu.open.lm.studio.settings.and.select.a.model.before.starting"),
  );
  f.clickLabel("START MATCH");
  expect(f.start).not.toHaveBeenCalled();
});
it("blocks absent and campaign-only maps and refreshes readiness after map cycling", () => {
  catalog.list.mockReturnValue([]);
  const empty = fixture({ view: "quick-match" });
  empty.clickLabel("START MATCH");
  expect(empty.start).not.toHaveBeenCalled();
  expect(empty.texts()).toContain(
    t("main-menu.no.maps.available.add.a.local.map.or.restore.a.built.in.map.file"),
  );
  const map = maps[0]?.map;
  if (!map) throw Error("map missing");
  const invalid = {
    source: "local",
    map: { ...map, id: "solo", units: map.units.filter((unit) => unit.side === "blue") },
  };
  catalog.list.mockReturnValue([invalid, maps[0]]);
  const f = fixture({ view: "quick-match" });
  expect(f.texts()).toContain(
    t("main-menu.standalone.matches.require.blue.and.red.units.open.campaigns.for"),
  );
  f.clickLabel("START MATCH");
  expect(f.start).not.toHaveBeenCalled();
  f.clickLabel(t("campaign-editor.map.2"));
  f.clickLabel("START MATCH");
  expect(f.start).toHaveBeenCalledWith("battle", expect.objectContaining({ mapDefinition: map }));
});
it("embeds speed in SETTINGS and carries setup through child screens", () => {
  const data = {
    selectedMapKey: "local:pending",
    matchConfiguration: { ...defaultConfiguration, blue: "heuristic-ai" as const },
  };
  const f = fixture(data);
  f.clickLabel("SETTINGS");
  expect(f.texts()).toEqual([
    "SETTINGS",
    "MOVEMENT SETTINGS",
    "LM STUDIO SETTINGS",
    "LANGUAGE",
    "BACK",
  ]);
  expect(f.descendants(f.root())).toContain(slider.container);
  f.clickLabel("LM STUDIO SETTINGS");
  expect(f.start).toHaveBeenCalledWith("lm-studio-settings", { ...data, view: "settings" });
  f.clickLabel("LANGUAGE");
  expect(f.start).toHaveBeenCalledWith("language", { ...data, view: "settings" });
  f.clickLabel("BACK");
  expect(slider.blur).toHaveBeenCalled();
  expect(f.texts()).not.toContain("MOVEMENT SETTINGS");
});
it("refreshes saved model settings on a settings round trip", () => {
  const settings = {
    ...createDefaultLmStudioSettings(),
    blueModelId: "new-blue",
    redModelId: "new-red",
  };
  getBrowserLmStudioSettings().save(settings);
  const f = fixture({
    view: "settings",
    matchConfiguration: { ...defaultConfiguration, blue: "lm-studio-ai" },
  });
  f.clickLabel("BACK");
  f.clickLabel("QUICK MATCH");
  f.clickLabel("START MATCH");
  expect(f.start).toHaveBeenCalledWith(
    "battle",
    expect.objectContaining({
      matchConfiguration: expect.objectContaining({
        blue: "lm-studio-ai",
        lmStudioConnections: expect.objectContaining({
          blue: expect.objectContaining({ modelId: "new-blue" }),
        }),
      }),
    }),
  );
});
it("groups multiplayer routes and retains pending quick match context", () => {
  const data = { selectedMapKey: "local:pending", matchConfiguration: defaultConfiguration };
  const f = fixture(data);
  f.clickLabel("MULTIPLAYER");
  expect(f.texts()).toEqual(["MULTIPLAYER", "HOST P2P", "JOIN P2P", "BACK"]);
  for (const [label, destination] of [
    ["HOST P2P", "multiplayer-host"],
    ["JOIN P2P", "multiplayer-join"],
  ]) {
    f.clickLabel(label as string);
    expect(f.start).toHaveBeenCalledWith(destination, {
      returnMenu: { ...data, view: "multiplayer" },
    });
  }
  f.clickLabel("BACK");
  f.clickLabel("QUICK MATCH");
  f.clickLabel("START MATCH");
  expect(f.start).toHaveBeenCalledWith(
    "battle",
    expect.objectContaining({ matchConfiguration: defaultConfiguration }),
  );
});
