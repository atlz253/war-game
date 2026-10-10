import type { StorageLike } from "../lm-studio/lm-studio-settings";
import { ENGLISH_LOCALE_ID, LOCALE_SCHEMA_VERSION } from "./locale";
export const LOCALE_SETTINGS_KEY = "ai-war-game.locale.v1";
export class LocaleSettings {
  private localeId = ENGLISH_LOCALE_ID;
  private sessionOnly = false;
  public constructor(private readonly storage?: StorageLike) {}
  public load(available: readonly string[]): string {
    if (!this.sessionOnly) {
      try {
        const raw = this.storage?.getItem(LOCALE_SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        this.localeId =
          parsed?.schemaVersion === LOCALE_SCHEMA_VERSION && typeof parsed.localeId === "string"
            ? parsed.localeId
            : ENGLISH_LOCALE_ID;
      } catch {
        this.sessionOnly = true;
      }
    }
    if (!available.includes(this.localeId)) this.localeId = ENGLISH_LOCALE_ID;
    return this.localeId;
  }
  public save(localeId: string, available: readonly string[]): boolean {
    if (!available.includes(localeId)) return false;
    this.localeId = localeId;
    try {
      if (!this.storage) throw new Error("Storage unavailable.");
      this.storage.setItem(
        LOCALE_SETTINGS_KEY,
        JSON.stringify({ schemaVersion: LOCALE_SCHEMA_VERSION, localeId }),
      );
      return true;
    } catch {
      this.sessionOnly = true;
      return false;
    }
  }
}
