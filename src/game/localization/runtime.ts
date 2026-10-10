import { buildLocaleCatalog, type LocaleCatalog, resolveText } from "./locale";
import { LocaleSettings } from "./settings";

const modules = import.meta.glob("./locales/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});
const files = Object.fromEntries(
  Object.entries(modules).map(([file, source]) => {
    try {
      return [file, JSON.parse(String(source))];
    } catch {
      return [file, null];
    }
  }),
);
let catalog = buildLocaleCatalog(files);
let settings: LocaleSettings;
try {
  settings = new LocaleSettings(globalThis.localStorage);
} catch {
  settings = new LocaleSettings();
}
const listeners = new Set<() => void>();
export function getLocaleCatalog(): LocaleCatalog {
  return structuredClone(catalog);
}
export function getLocaleId(): string {
  return settings.load(catalog.locales.map((locale) => locale.id));
}
export function selectLocale(id: string): boolean {
  const saved = settings.save(
    id,
    catalog.locales.map((locale) => locale.id),
  );
  for (const listener of listeners) listener();
  return saved;
}
export function replaceLocaleCatalog(next: LocaleCatalog): void {
  catalog = structuredClone(next);
  for (const listener of listeners) listener();
}
export function onLocaleCatalogChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function t(key: string, parameters: Readonly<Record<string, string | number>> = {}): string {
  return resolveText(
    catalog,
    getLocaleId(),
    key,
    parameters,
    import.meta.env.DEV ? console.warn : undefined,
  );
}
/** Marks indirect production references for the build-time key audit. */
export function localeKey(key: string): string {
  return key;
}
