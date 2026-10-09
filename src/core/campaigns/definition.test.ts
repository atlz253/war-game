import { describe, expect, it } from "vitest";
import type { DialogueTrigger } from "./definition";
import { deserializeCampaign, serializeCampaign } from "./definition";
import { campaign, map, mission } from "./test-fixtures";

it("round-trips all six trigger forms, stable IDs and empty dialogue drafts", () => {
  const triggers: DialogueTrigger[] = [
    { type: "mission-start" },
    { type: "turn", number: 2 },
    { type: "unit-selected", unit: { type: "any" }, mapBinding: map.id },
    {
      type: "unit-moved",
      unit: { type: "specific", unitId: "blue-infantry-1" },
      mapBinding: map.id,
    },
    { type: "unit-arrived", unit: { type: "any" }, cell: { x: 2, y: 1 }, mapBinding: map.id },
    { type: "mission-end" },
  ];
  const draft = {
    ...campaign,
    missions: [
      {
        ...mission,
        events: triggers.map((trigger, index) => ({
          id: `event-${index}`,
          type: "dialogue" as const,
          trigger,
          lines: [],
        })),
      },
    ],
  };
  expect(deserializeCampaign(serializeCampaign(draft))).toEqual(draft);
  const invalid = structuredClone(draft);
  Object.assign(invalid.missions[0]?.events[0] ?? {}, { type: "unknown" });
  expect(() => deserializeCampaign(JSON.stringify(invalid))).toThrow();
});

describe("campaign format", () => {
  it("round-trips incomplete drafts without replacing identities", () => {
    const draft = { schemaVersion: 1, id: "draft", name: "", missions: [] };
    expect(deserializeCampaign(serializeCampaign(draft))).toEqual(draft);
  });
  it.each([
    { schemaVersion: 2, id: "draft", name: "", missions: [] },
    {
      schemaVersion: 1,
      id: "draft",
      name: "",
      missions: [
        { id: "m", name: "", builtInMapId: "map", conditions: { type: "unknown" }, events: [] },
      ],
    },
  ])("rejects unknown versions and discriminants", (draft) => {
    expect(() => deserializeCampaign(JSON.stringify(draft))).toThrow();
  });
});
