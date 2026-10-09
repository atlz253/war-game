import { expect, it } from "vitest";
import { campaign } from "../../core/campaigns/test-fixtures";
import { BrowserCampaignLibrary } from "./library";

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
