import { describe, expect, it } from "vitest";
import { campaign, mission } from "../../core/campaigns/test-fixtures";
import { CampaignEditorModel } from "./editor-model";

const source = {
  ...campaign,
  schemaVersion: 1,
  missions: [
    {
      ...mission,
      events: [
        {
          id: "intro",
          type: "dialogue" as const,
          trigger: { type: "mission-start" as const },
          lines: [{ speaker: "Guide", text: "Hello" }],
        },
      ],
    },
  ],
};
describe("campaign dialogue translations", () => {
  it("starts in English and links only available non-English locales once", () => {
    const model = new CampaignEditorModel(source);
    expect(model.dialogueLocaleId).toBe("en");
    expect(() => model.addLocalization("en", ["en", "ru"])).toThrow();
    expect(() => model.addLocalization("fr", ["en", "ru"])).toThrow();
    model.addLocalization("ru", ["en", "ru"]);
    expect(() => model.addLocalization("ru", ["en", "ru"])).toThrow();
    model.updateLine({ text: "Привет" });
    expect(model.line?.text).toBe("Hello");
    expect(model.presentedLine?.text).toBe("Привет");
    expect(model.presentedLine?.speaker).toBe("Guide");
    expect(() => model.addLine()).toThrow();
    expect(() => model.moveLine(1)).toThrow();
    expect(() => model.deleteLine()).toThrow();
  });
  it("retains translations through reorder, English edits, new lines and deletion", () => {
    const model = new CampaignEditorModel(source);
    model.addLocalization("ru", ["en", "ru"]);
    model.updateLine({ text: "Привет" });
    const id = model.line?.id;
    model.dialogueLocaleId = "en";
    model.addLine();
    expect(model.line?.id).not.toBe(id);
    model.updateLine({ text: "New", speaker: "Other" });
    model.moveLine(-1);
    expect(model.event?.localizations?.ru?.[id ?? ""]?.text).toBe("Привет");
    model.dialogueLocaleId = "ru";
    expect(model.presentedLine?.text).toBe("New");
    model.dialogueLocaleId = "en";
    model.lineIndex = 1;
    model.updateLine({ text: "Changed English" });
    expect(model.event?.localizations?.ru?.[id ?? ""]?.text).toBe("Привет");
    model.deleteLine();
    expect(model.event?.localizations?.ru?.[id ?? ""]).toBeUndefined();
  });
});
