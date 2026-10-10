import { describe, expect, it, vi } from "vitest";
import { buildLocaleCatalog, parseLocale, resolveText } from "./locale";

const english = {
  schemaVersion: 1,
  id: "en",
  name: "English",
  strings: { start: "START", status: "Turn {turn}: {name}" },
};
const russian = { schemaVersion: 1, id: "ru", name: "Русский", strings: { start: "НАЧАТЬ" } };
describe("locale dictionaries", () => {
  it("discovers partial dictionaries in deterministic order and returns independent data", () => {
    const catalog = buildLocaleCatalog({ "ru.json": russian, "en.json": english });
    expect(catalog.locales.map((locale) => locale.id)).toEqual(["en", "ru"]);
    catalog.locales[0]!.strings.start = "changed";
    expect(english.strings.start).toBe("START");
  });
  it.each(["../ru", "RU", "ru_1", "ru--x", "con"])("rejects unsafe ID %s", (id) => {
    expect(() => parseLocale({ ...russian, id })).toThrow();
  });
  it.each([
    null,
    {},
    { ...english, schemaVersion: 2 },
    { ...english, name: " " },
    { ...english, strings: [] },
    { ...english, strings: { start: 1 } },
    { ...english, strings: { start: " " } },
  ])("rejects malformed English %j", (value) => {
    expect(() => buildLocaleCatalog({ "en.json": value })).toThrow();
  });
  it("requires English", () => expect(() => buildLocaleCatalog({ "ru.json": russian })).toThrow());
  it("diagnoses invalid non-English files without losing English", () => {
    const catalog = buildLocaleCatalog({
      "en.json": english,
      "wrong.json": russian,
      "fr.json": { ...russian, id: "fr", strings: { unknown: "x" } },
      "de.json": { ...russian, id: "de", strings: { status: "Turn {wrong}" } },
    });
    expect(catalog.locales.map((locale) => locale.id)).toEqual(["en"]);
    const invalidFiles = 3;
    expect(catalog.diagnostics).toHaveLength(invalidFiles);
    expect(catalog.diagnostics.join()).toContain("wrong.json");
  });
  it("rejects all duplicate IDs rather than selecting an arbitrary translation", () => {
    const catalog = buildLocaleCatalog({
      "en.json": english,
      "a/ru.json": russian,
      "b/ru.json": russian,
    });
    expect(catalog.locales.map((locale) => locale.id)).toEqual(["en"]);
    expect(catalog.diagnostics.join()).toContain("Duplicate");
  });
  it("accepts reordered placeholder sets and whitespace-only untranslated values", () => {
    expect(
      buildLocaleCatalog({
        "en.json": english,
        "ru.json": { ...russian, strings: { start: " ", status: "{name}: {turn}" } },
      }).locales,
    ).toHaveLength(2);
  });
});
describe("English fallback", () => {
  const catalog = buildLocaleCatalog({ "en.json": english, "ru.json": russian });
  it("resolves each key independently and interpolates supplied data literally", () => {
    expect(resolveText(catalog, "ru", "start")).toBe("НАЧАТЬ");
    expect(resolveText(catalog, "ru", "status", { turn: 2, name: "$& {turn}" })).toBe(
      "Turn 2: $& {turn}",
    );
    expect(resolveText(catalog, "missing", "start")).toBe("START");
  });
  it("uses English for whitespace and diagnoses missing canonical keys", () => {
    const blank = buildLocaleCatalog({
      "en.json": english,
      "ru.json": { ...russian, strings: { start: "\n " } },
    });
    expect(resolveText(blank, "ru", "start")).toBe("START");
    const diagnostic = vi.fn();
    expect(resolveText(catalog, "ru", "absent", {}, diagnostic)).toBe("absent");
    expect(diagnostic).toHaveBeenCalledWith("Missing English key: absent");
  });
});
