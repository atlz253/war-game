import { describe, expect, it } from "vitest";
import { checkEnglishKeys } from "../../../scripts/localization-check";

describe("canonical English check", () => {
  it("checks direct production references and ignores test-only references", () => {
    expect(() =>
      checkEnglishKeys(
        { "scene.ts": 't("menu.start"); t(`menu.back`);', "scene.test.ts": 't("absent")' },
        {
          schemaVersion: 1,
          id: "en",
          name: "English",
          strings: { "menu.start": "START", "menu.back": "BACK" },
        },
      ),
    ).not.toThrow();
    expect(() =>
      checkEnglishKeys(
        { "scene.ts": 't("absent")' },
        { schemaVersion: 1, id: "en", name: "English", strings: {} },
      ),
    ).toThrow("absent");
    expect(() => checkEnglishKeys({}, undefined)).toThrow();
  });
});
