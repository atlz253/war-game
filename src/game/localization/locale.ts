export const LOCALE_SCHEMA_VERSION = 1;
export const ENGLISH_LOCALE_ID = "en";
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_FILE_ID = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/;
const PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
export interface LocaleDefinition {
  schemaVersion: typeof LOCALE_SCHEMA_VERSION;
  id: string;
  name: string;
  strings: Record<string, string>;
}
export interface LocaleCatalog {
  locales: LocaleDefinition[];
  diagnostics: string[];
}
export function isLocaleId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value) && !RESERVED_FILE_ID.test(value);
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseLocale(value: unknown, english?: LocaleDefinition): LocaleDefinition {
  if (!record(value) || value.schemaVersion !== LOCALE_SCHEMA_VERSION || !isLocaleId(value.id))
    throw new Error("Invalid locale schema or ID.");
  if (typeof value.name !== "string" || !value.name.trim() || !record(value.strings))
    throw new Error("Invalid locale name or dictionary.");
  const strings: Record<string, string> = Object.create(null);
  for (const [key, text] of Object.entries(value.strings)) {
    if (!key.trim() || typeof text !== "string") throw new Error(`Invalid string: ${key}`);
    if (value.id === ENGLISH_LOCALE_ID && !text.trim())
      throw new Error(`Empty English string: ${key}`);
    if (english && value.id !== ENGLISH_LOCALE_ID) validateTranslation(english, key, text);
    strings[key] = text;
  }
  return { schemaVersion: LOCALE_SCHEMA_VERSION, id: value.id, name: value.name, strings };
}
function placeholders(text: string): string {
  return [...new Set(Array.from(text.matchAll(PLACEHOLDER), (match) => match[1]))].sort().join(",");
}
function validateTranslation(english: LocaleDefinition, key: string, text: string): void {
  if (!Object.hasOwn(english.strings, key)) throw new Error(`Unknown English key: ${key}`);
  if (text.trim() && placeholders(text) !== placeholders(english.strings[key]!))
    throw new Error(`Incompatible placeholders: ${key}`);
}
function filename(file: string): string {
  return file.replaceAll("\\", "/").split("/").at(-1) ?? file;
}
export function buildLocaleCatalog(files: Record<string, unknown>): LocaleCatalog {
  const englishFiles = Object.entries(files).filter(([file]) => filename(file) === "en.json");
  if (englishFiles.length !== 1) throw new Error("Exactly one en.json is required.");
  const english = parseLocale(englishFiles[0]![1]);
  if (english.id !== ENGLISH_LOCALE_ID) throw new Error("en.json must define English.");
  const candidates: { file: string; locale: LocaleDefinition }[] = [];
  const diagnostics: string[] = [];
  for (const [file, value] of Object.entries(files)) {
    if (file === englishFiles[0]![0]) continue;
    try {
      const locale = parseLocale(value, english);
      if (filename(file) !== `${locale.id}.json`)
        throw new Error("Filename does not match locale ID.");
      if (locale.id === ENGLISH_LOCALE_ID) throw new Error("Duplicate English ID.");
      candidates.push({ file, locale });
    } catch (error) {
      diagnostics.push(`${file}: ${String(error)}`);
    }
  }
  const locales = [english];
  for (const candidate of candidates) {
    if (candidates.filter(({ locale }) => locale.id === candidate.locale.id).length > 1)
      diagnostics.push(`${candidate.file}: Duplicate locale ID ${candidate.locale.id}`);
    else locales.push(candidate.locale);
  }
  locales.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return { locales, diagnostics };
}
export function resolveText(
  catalog: LocaleCatalog,
  localeId: string,
  key: string,
  parameters: Readonly<Record<string, string | number>> = {},
  diagnostic?: (message: string) => void,
): string {
  const english = catalog.locales.find((locale) => locale.id === ENGLISH_LOCALE_ID);
  const source = english?.strings[key];
  if (source === undefined) {
    diagnostic?.(`Missing English key: ${key}`);
    return key;
  }
  const translated = catalog.locales.find((locale) => locale.id === localeId)?.strings[key];
  const template = translated?.trim() ? translated : source;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.hasOwn(parameters, name) ? String(parameters[name]) : match,
  );
}
