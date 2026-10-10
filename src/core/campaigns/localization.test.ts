import { describe, expect, it } from "vitest";
import { deserializeCampaign, serializeCampaign } from "./definition";
import { campaign, mission } from "./test-fixtures";

const legacy = {
  ...campaign,
  schemaVersion: 1,
  missions: [
    {
      ...mission,
      events: [
        {
          id: "intro",
          type: "dialogue",
          trigger: { type: "mission-start" },
          lines: [
            { speaker: "Guide", text: "Hello" },
            { speaker: "Guide", text: "Next" },
          ],
        },
      ],
    },
  ],
};
describe("campaign translation format", () => {
  it("normalizes v1 deterministically and writes v2 with stable IDs", () => {
    const first = deserializeCampaign(JSON.stringify(legacy));
    expect(first.schemaVersion).toBe(2);
    expect(first.missions[0]?.events[0]?.lines.map((line) => line.id)).toEqual([
      "line-1",
      "line-2",
    ]);
    expect(first).toEqual(deserializeCampaign(JSON.stringify(legacy)));
    expect(deserializeCampaign(serializeCampaign(first))).toEqual(first);
  });
  it("retains partial and unknown language dictionaries across round trips", () => {
    const normalized = deserializeCampaign(JSON.stringify(legacy));
    const event = normalized.missions[0]!.events[0]!;
    const translated = {
      ...normalized,
      missions: [
        {
          ...normalized.missions[0]!,
          events: [
            {
              ...event,
              localizations: { "unknown-pack": { "line-1": { text: "Привет", speaker: " " } } },
            },
          ],
        },
      ],
    };
    expect(deserializeCampaign(serializeCampaign(translated))).toEqual(translated);
  });
  it.each([
    {
      lines: [
        { id: "same", speaker: "A", text: "a" },
        { id: "same", speaker: "B", text: "b" },
      ],
    },
    { lines: [{ speaker: "A", text: "a" }] },
    { localizations: { ru: { missing: { text: "x" } } } },
    { localizations: { ru: { "line-1": { text: 1 } } } },
    { localizations: { "../ru": {} } },
    { localizations: { en: {} } },
  ])("rejects invalid v2 translation structure %j", (patch) => {
    const normalized = deserializeCampaign(JSON.stringify(legacy));
    const invalid = {
      ...normalized,
      missions: [
        {
          ...normalized.missions[0]!,
          events: [{ ...normalized.missions[0]!.events[0]!, ...patch }],
        },
      ],
    };
    expect(() => deserializeCampaign(JSON.stringify(invalid))).toThrow();
  });
});
