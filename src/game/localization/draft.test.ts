import { describe, expect, it } from "vitest";
import { createLocale, LocaleDraft } from "./draft";
import { parseLocale } from "./locale";

const en = parseLocale({ schemaVersion: 1, id: "en", name: "English", strings: { back: "BACK" } });
describe("locale authoring drafts", () => {
  it("creates unique safe IDs and retains identity on rename", () => {
    expect(() => createLocale("en", "Other", [en])).toThrow();
    expect(() => createLocale("../ru", "Русский", [en])).toThrow();
    const draft = new LocaleDraft(createLocale("ru", "Русский", [en]), en);
    draft.rename("Русский язык");
    expect(draft.value.id).toBe("ru");
    expect(draft.dirty).toBe(true);
    draft.edit("back", "НАЗАД");
    expect(draft.value.strings.back).toBe("НАЗАД");
    expect(() => draft.addKey("new", "NEW")).toThrow();
    expect(() => draft.edit("unknown", "x")).toThrow();
    expect(() => draft.rename(" ")).toThrow();
  });
  it("adds canonical English keys, rejects duplicate/blank values and discards changes", () => {
    const draft = new LocaleDraft(en, en);
    draft.addKey("new", "NEW");
    expect(draft.value.strings.new).toBe("NEW");
    expect(() => draft.addKey("new", "x")).toThrow();
    expect(() => draft.addKey(" ", "x")).toThrow();
    expect(() => draft.edit("back", " ")).toThrow();
    expect(() => draft.addKey("empty", " ")).toThrow();
    draft.discard();
    expect(draft.dirty).toBe(false);
    expect(draft.value.strings.new).toBeUndefined();
  });
  it("marks only submitted snapshots saved, retaining newer changes", () => {
    const draft = new LocaleDraft(en, en);
    draft.edit("back", "RETURN");
    const snapshot = draft.value;
    draft.edit("back", "BACK AGAIN");
    draft.saved(snapshot);
    expect(draft.dirty).toBe(true);
    expect(draft.value.strings.back).toBe("BACK AGAIN");
    draft.discard();
    expect(draft.value.strings.back).toBe("RETURN");
    expect(draft.dirty).toBe(false);
  });
  it("refreshes clean drafts and retains dirty drafts on external change", () => {
    const draft = new LocaleDraft(en, en);
    draft.refresh({ ...en, name: "English updated" }, en);
    expect(draft.value.name).toBe("English updated");
    draft.rename("Unsaved");
    draft.refresh({ ...en, name: "External" }, en);
    expect(draft.value.name).toBe("Unsaved");
    expect(draft.externalChange).toBe(true);
    draft.discard();
    expect(draft.value.name).toBe("External");
  });
});
