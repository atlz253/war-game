import { describe, expect, it } from "vitest";
import { LOCALE_SETTINGS_KEY, LocaleSettings } from "./settings";

describe("locale preference", () => {
  const ids = ["en", "ru"];
  it("stores a versioned preference and reloads it", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
    expect(new LocaleSettings(storage).load(ids)).toBe("en");
    expect(new LocaleSettings(storage).save("ru", ids)).toBe(true);
    expect(JSON.parse(data.get(LOCALE_SETTINGS_KEY)!)).toEqual({
      schemaVersion: 1,
      localeId: "ru",
    });
    expect(new LocaleSettings(storage).load(ids)).toBe("ru");
    expect(new LocaleSettings(storage).load(["en"])).toBe("en");
  });
  it.each([
    "broken",
    "null",
    '{"schemaVersion":2,"localeId":"ru"}',
    '{"schemaVersion":1,"localeId":"xx"}',
  ])("falls back for %s", (raw) => {
    expect(new LocaleSettings({ getItem: () => raw, setItem: () => {} }).load(ids)).toBe("en");
  });
  it("preserves session selection when storage fails or is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("read");
      },
      setItem: () => {
        throw new Error("write");
      },
    };
    const settings = new LocaleSettings(storage);
    expect(settings.load(ids)).toBe("en");
    expect(settings.save("ru", ids)).toBe(false);
    expect(settings.load(ids)).toBe("ru");
    expect(settings.load(["en"])).toBe("en");
    const missing = new LocaleSettings();
    expect(missing.save("ru", ids)).toBe(false);
    expect(missing.load(ids)).toBe("ru");
    expect(missing.save("unsafe", ids)).toBe(false);
    expect(missing.load(ids)).toBe("ru");
  });
});
