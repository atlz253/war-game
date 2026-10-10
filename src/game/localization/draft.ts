import { LOCALE_SCHEMA_VERSION, type LocaleDefinition, parseLocale } from "./locale";
export function createLocale(
  id: string,
  name: string,
  locales: readonly LocaleDefinition[],
): LocaleDefinition {
  if (locales.some((locale) => locale.id === id)) throw new Error("Locale ID already exists.");
  return parseLocale({ schemaVersion: LOCALE_SCHEMA_VERSION, id, name, strings: {} });
}
export class LocaleDraft {
  private current: LocaleDefinition;
  private baseline: LocaleDefinition;
  public externalChange = false;
  public constructor(
    value: LocaleDefinition,
    private english: LocaleDefinition,
  ) {
    this.current = structuredClone(value);
    this.baseline = structuredClone(value);
  }
  public get value(): LocaleDefinition {
    return structuredClone(this.current);
  }
  public get dirty(): boolean {
    return JSON.stringify(this.current) !== JSON.stringify(this.baseline);
  }
  public rename(name: string): void {
    this.update({ ...this.current, name });
  }
  public edit(key: string, value: string): void {
    const source = this.current.id === "en" ? this.current : this.english;
    if (!Object.hasOwn(source.strings, key)) throw new Error("Unknown English key.");
    this.update({ ...this.current, strings: { ...this.current.strings, [key]: value } });
  }
  public addKey(key: string, value: string): void {
    if (this.current.id !== "en") throw new Error("Only English can add keys.");
    if (!key.trim() || Object.hasOwn(this.current.strings, key))
      throw new Error("Key must be unique and nonempty.");
    this.update({ ...this.current, strings: { ...this.current.strings, [key]: value } });
  }
  private update(value: LocaleDefinition): void {
    this.current = parseLocale(value, this.english);
  }
  public saved(snapshot: LocaleDefinition): void {
    this.baseline = structuredClone(snapshot);
    this.externalChange = false;
  }
  public discard(): void {
    this.current = structuredClone(this.baseline);
    this.externalChange = false;
  }
  public refresh(value: LocaleDefinition, english: LocaleDefinition): void {
    const dirty = this.dirty;
    this.english = structuredClone(english);
    this.baseline = structuredClone(value);
    if (dirty) this.externalChange = true;
    else this.current = structuredClone(value);
  }
}
