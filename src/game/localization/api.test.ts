import { readFile } from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { refreshLocales, saveLocale } from "./dev-locale-api";
import { parseLocale } from "./locale";
import { getLocaleCatalog } from "./runtime";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("validates requests and rejects production authoring without a network request", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);
  const locale = parseLocale({
    schemaVersion: 1,
    id: "fr",
    name: "Français",
    strings: { "common.back": "RETOUR" },
  });
  vi.stubEnv("DEV", false);
  await expect(saveLocale(locale, true)).rejects.toThrow("DEV");
  expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv("DEV", true);
  await saveLocale(locale, true);
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({ operation: "create", locale });
  await expect(saveLocale({ ...locale, strings: { unknown: "x" } }, true)).rejects.toThrow();
});
it("refreshes discovered catalog from the server", async () => {
  const original = getLocaleCatalog();
  const added = { schemaVersion: 1, id: "zz", name: "Test", strings: {} };
  vi.stubEnv("DEV", true);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...original, locales: [...original.locales, added] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => original }),
  );
  await refreshLocales();
  expect(getLocaleCatalog().locales.some((locale) => locale.id === "zz")).toBe(true);
  await refreshLocales();
});
it("validates the documented example against the shipped English source", async () => {
  const documentation = await readFile("docs/localization.md", "utf8");
  const example = documentation.match(/```json\s+([\s\S]+?)```/)?.[1];
  expect(example).toBeDefined();
  expect(() =>
    parseLocale(
      JSON.parse(example ?? ""),
      getLocaleCatalog().locales.find((locale) => locale.id === "en"),
    ),
  ).not.toThrow();
});
