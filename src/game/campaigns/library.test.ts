import { expect, it } from "vitest";
import { campaign } from "../../core/campaigns/test-fixtures";
import { BrowserCampaignLibrary } from "./library";

it("imports local copies collision-safely, preserves nested IDs and exports single definitions", () => {
  let raw: string | null = null;
  const library = new BrowserCampaignLibrary({
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  });
  const imported = library.import(JSON.stringify(campaign), [campaign.id]);
  expect(imported.value?.id).toBe("c-2");
  expect(imported.value?.missions).toEqual(campaign.missions);
  expect(library.import(JSON.stringify(campaign), [campaign.id]).value?.id).toBe("c-3");
  const exported = library.export("c-2");
  expect(JSON.parse(exported.value ?? "{}")).toEqual({ ...campaign, id: "c-2" });
  const before = raw;
  for (const input of [
    "invalid",
    JSON.stringify({ ...campaign, schemaVersion: 9 }),
    JSON.stringify({ schemaVersion: 1, campaigns: [campaign] }),
  ])
    expect(library.import(input).error).toBeTruthy();
  expect(raw).toBe(before);
  expect(
    library.import(JSON.stringify({ ...campaign, id: "draft", missions: [] })).error,
  ).toBeNull();
  expect(
    library.import(
      JSON.stringify({
        ...campaign,
        id: "missing",
        missions: campaign.missions.map((m) => ({ ...m, builtInMapId: "missing" })),
      }),
    ).error,
  ).toBeNull();
});
it("returns import storage failures without a false success or changing existing data", () => {
  const raw = JSON.stringify({ schemaVersion: 1, campaigns: [campaign] });
  const library = new BrowserCampaignLibrary({
    getItem: () => raw,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(library.import(JSON.stringify(campaign))).toMatchObject({ value: null, error: "quota" });
  expect(library.list().value).toEqual([campaign]);
});

it("persists CRUD and preserves corrupt data on save", () => {
  let stored: string | null = null;
  const storage = {
    getItem: () => stored,
    setItem: (_: string, value: string) => {
      stored = value;
    },
  };
  const library = new BrowserCampaignLibrary(storage);
  expect(library.save(campaign).error).toBeNull();
  expect(new BrowserCampaignLibrary(storage).list().value).toEqual([campaign]);
  library.delete(campaign.id);
  expect(library.list().value).toEqual([]);
  stored = "corrupt";
  expect(library.save(campaign).error).toBeTruthy();
  expect(stored).toBe("corrupt");
});
it("returns storage exceptions without losing a draft", () => {
  const library = new BrowserCampaignLibrary({
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(library.save(campaign).error).toContain("quota");
  expect(campaign.name).toBe("Lessons");
});

it("round-trips Unicode dialogue and strips runtime metadata from definition exports", () => {
  let raw: string | null = null;
  const library = new BrowserCampaignLibrary({
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  });
  const definition = {
    ...campaign,
    name: "Обучение — 日本語",
    missions: [
      {
        ...campaign.missions[0],
        events: [
          {
            id: "greeting",
            type: "dialogue",
            trigger: { type: "mission-start" },
            lines: [{ speaker: "Командир", text: "Выберите юнит.\nДойдите до края карты." }],
          },
        ],
      },
    ],
    progress: { missionIndex: 3 },
    replay: { actions: [] },
  };
  const imported = library.import(JSON.stringify(definition));
  expect(imported.error).toBeNull();
  const exported = JSON.parse(library.export(campaign.id).value ?? "{}");
  expect(exported.name).toBe(definition.name);
  expect(exported.missions).toEqual(definition.missions);
  expect(Object.keys(exported).sort()).toEqual(["id", "missions", "name", "schemaVersion"]);
});
