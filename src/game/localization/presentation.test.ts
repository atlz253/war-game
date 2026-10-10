import { afterEach, expect, it } from "vitest";
import { getParticipantLabel } from "../match/match-configuration";
import { movementSpeedLabel } from "../ui/components/movement-slider-model";
import { getLocaleCatalog, replaceLocaleCatalog, selectLocale, t } from "./runtime";

const original = getLocaleCatalog();
afterEach(() => {
  replaceLocaleCatalog(original);
  selectLocale("en");
});
it("translates interface labels while keeping participant roles and parameter values unchanged", () => {
  const english = original.locales.find((locale) => locale.id === "en")!;
  const humanKey = Object.entries(english.strings).find(([, text]) => text === "HUMAN")?.[0];
  expect(humanKey).toBeDefined();
  replaceLocaleCatalog({
    locales: [
      ...original.locales,
      {
        schemaVersion: 1,
        id: "ru",
        name: "Русский",
        strings: { [humanKey ?? "missing"]: "ЧЕЛОВЕК", "language.title": "ЯЗЫК" },
      },
    ],
    diagnostics: [],
  });
  selectLocale("ru");
  expect(getParticipantLabel("human")).toBe("ЧЕЛОВЕК");
  expect(t("language.title")).toBe("ЯЗЫК");
  expect(movementSpeedLabel(0)).toContain("400");
});
