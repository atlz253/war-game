import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { buildLocaleCatalog, parseLocale } from "../src/game/localization/locale";

const TEXT_REFERENCE = /\b(?:t|localeKey)\(\s*["'`]([^"'`]+)["'`]/g;
export function checkEnglishKeys(sources: Record<string, string>, value: unknown): void {
  const english = parseLocale(value);
  if (english.id !== "en") throw new Error("English baseline required.");
  for (const [file, source] of Object.entries(sources)) {
    if (file.endsWith(".test.ts")) continue;
    for (const match of source.matchAll(TEXT_REFERENCE)) {
      if (!Object.hasOwn(english.strings, match[1]!))
        throw new Error(`${file}: Missing English key ${match[1]}`);
    }
  }
}
async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(file) : [file];
    }),
  );
  return files.flat();
}
export function createLocalizationCheck(): Plugin {
  return {
    name: "ai-war-game-localization-check",
    async buildStart() {
      const localeDirectory = path.resolve("src/game/localization/locales");
      const files = (await readdir(localeDirectory)).filter((file) => file.endsWith(".json"));
      const dictionaries: Record<string, unknown> = {};
      for (const file of files) {
        try {
          dictionaries[file] = JSON.parse(await readFile(path.join(localeDirectory, file), "utf8"));
        } catch {
          dictionaries[file] = null;
        }
      }
      const catalog = buildLocaleCatalog(dictionaries);
      for (const message of catalog.diagnostics) this.warn(message);
      const sources: Record<string, string> = {};
      for (const file of await sourceFiles(path.resolve("src/game"))) {
        if (file.endsWith(".ts")) sources[file] = await readFile(file, "utf8");
      }
      checkEnglishKeys(sources, dictionaries["en.json"]);
    },
  };
}
