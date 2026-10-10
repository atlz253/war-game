import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { writeCampaignDefinition } from "../../../scripts/dev-campaign-writer";
import { deserializeCampaign, serializeCampaign } from "../../core/campaigns/definition";
import { campaign, mission } from "../../core/campaigns/test-fixtures";
import { BrowserCampaignLibrary } from "./library";

it("keeps legacy storage untouched until save and preserves translations through every destination", async () => {
  const legacy = {
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
  };
  let stored = JSON.stringify({ schemaVersion: 1, campaigns: [legacy] });
  const previous = stored;
  const setItem = vi.fn((_key: string, value: string) => {
    stored = value;
  });
  const library = new BrowserCampaignLibrary({ getItem: () => stored, setItem });
  const loaded = library.list().value[0];
  expect(loaded?.schemaVersion).toBe(2);
  expect(stored).toBe(previous);
  expect(setItem).not.toHaveBeenCalled();
  const translated = deserializeCampaign(
    JSON.stringify({
      ...loaded,
      missions: [
        {
          ...loaded?.missions[0],
          events: [
            {
              ...loaded?.missions[0]?.events[0],
              localizations: { "unknown-pack": { "line-1": { text: "Привет" } } },
            },
          ],
        },
      ],
    }),
  );
  expect(library.save(translated).value).toBe(true);
  const exported = library.export(translated.id).value;
  expect(deserializeCampaign(exported ?? "")).toEqual(translated);
  const imported = library.import(exported ?? "").value;
  expect(imported?.id).not.toBe(translated.id);
  expect(imported?.missions).toEqual(translated.missions);
  const directory = await mkdtemp(path.join(tmpdir(), "localized-campaign-"));
  try {
    const target = await writeCampaignDefinition(serializeCampaign(translated), directory);
    expect(deserializeCampaign(await readFile(target, "utf8"))).toEqual(translated);
    const source = await readFile(target, "utf8");
    await expect(
      writeCampaignDefinition(
        serializeCampaign({ ...translated, name: "Changed" }),
        directory,
        async () => {
          throw new Error("disk failed");
        },
      ),
    ).rejects.toThrow("disk failed");
    expect(await readFile(target, "utf8")).toBe(source);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
