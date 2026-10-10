import { expect, it } from "vitest";
import { getBuiltInCampaigns, readBuiltInCampaignModules } from "./built-in-campaigns";
import { campaign } from "./test-fixtures";

it("discovers JSON definitions without manual registration and returns independent copies", () => {
  const modules = { "second.json": { ...campaign, id: "z" }, "first.json": campaign };
  expect(readBuiltInCampaignModules(modules).map((c) => c.id)).toEqual(["c", "z"]);
  const first = getBuiltInCampaigns()[0];
  expect(first?.id).toBe("tutorial");
  if (!first) throw new Error("Missing tutorial");
  first.missions[0]?.events[0]?.lines[0] &&
    Object.assign(first.missions[0].events[0].lines[0], { text: "Edited" });
  expect(getBuiltInCampaigns()[0]?.missions[0]?.events[0]?.lines[0]?.text).not.toBe("Edited");
});
it.each([
  { "broken.json": { ...campaign, schemaVersion: 99 } },
  { "broken.json": { ...campaign, missions: "invalid" } },
  { "first.json": campaign, "second.json": campaign },
])("reports invalid source structure/version and duplicate IDs", (modules) => {
  expect(() => readBuiltInCampaignModules(modules)).toThrow(/\.json/);
});
