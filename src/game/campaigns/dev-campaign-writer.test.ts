import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createDevCampaignWriter,
  writeCampaignDefinition,
} from "../../../scripts/dev-campaign-writer";
import config from "../../../vite.config";
import { campaign } from "../../core/campaigns/test-fixtures";

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
async function directory() {
  const result = await mkdtemp(path.join(os.tmpdir(), "war-game-campaign-"));
  directories.push(result);
  return result;
}
it("writes canonical JSON atomically and retains the original on a failed replacement", async () => {
  const root = await directory();
  await writeCampaignDefinition(JSON.stringify(campaign), root);
  expect(JSON.parse(await readFile(path.join(root, "c.json"), "utf8"))).toEqual(campaign);
  await expect(
    writeCampaignDefinition(JSON.stringify({ ...campaign, name: "Changed" }), root, async () => {
      throw new Error("Disk full");
    }),
  ).rejects.toThrow("Disk full");
  expect(JSON.parse(await readFile(path.join(root, "c.json"), "utf8"))).toEqual(campaign);
  expect(await readdir(root)).toEqual(["c.json"]);
});
it.each(["../escape", "..", "a/b", "C:\\escape", "UPPER"])(
  "rejects unsafe ID %s before writing",
  async (id) => {
    const root = await directory();
    await expect(
      writeCampaignDefinition(JSON.stringify({ ...campaign, id }), root),
    ).rejects.toThrow();
    expect(await readdir(root)).toEqual([]);
  },
);
it("rejects invalid structure/version", async () => {
  const root = await directory();
  await expect(
    writeCampaignDefinition(JSON.stringify({ ...campaign, schemaVersion: 9 }), root),
  ).rejects.toThrow();
  await expect(writeCampaignDefinition("malformed", root)).rejects.toThrow();
});
it("registers the source writer for serve only", async () => {
  if (typeof config !== "function") throw new Error("Expected Vite config factory");
  const development = await config({ command: "serve", mode: "development" });
  const production = await config({ command: "build", mode: "production" });
  expect(JSON.stringify(development.plugins)).toContain(createDevCampaignWriter().name);
  expect(production.plugins).toEqual([]);
});
