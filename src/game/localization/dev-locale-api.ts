import { type LocaleDefinition, parseLocale } from "./locale";
import { getLocaleCatalog, replaceLocaleCatalog } from "./runtime";

const ENDPOINT = "/__dev-localizations";
let refreshGeneration = 0;
export async function saveLocale(value: LocaleDefinition, create: boolean): Promise<void> {
  if (!import.meta.env.DEV) throw new Error("Locale authoring requires DEV mode.");
  const english = getLocaleCatalog().locales.find((locale) => locale.id === "en")!;
  const locale = parseLocale(value, english);
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: create ? "create" : "update", locale }),
  });
  if (!response.ok) throw new Error(await response.text());
}
export async function refreshLocales(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const generation = ++refreshGeneration;
  const response = await fetch(ENDPOINT);
  if (!response.ok) throw new Error("Locale catalog refresh failed.");
  const catalog = await response.json();
  if (generation === refreshGeneration) replaceLocaleCatalog(catalog);
}
if (import.meta.hot) {
  import.meta.hot.on("localizations:changed", () => {
    void refreshLocales().catch(console.warn);
  });
}
