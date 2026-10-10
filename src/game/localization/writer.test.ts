import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDevLocaleWriter,
  MAX_LOCALE_BODY_BYTES,
  readLocaleBody,
  writeLocaleDefinition,
} from "../../../scripts/dev-locale-writer";

const en = { schemaVersion: 1, id: "en", name: "English", strings: { back: "BACK" } };
const ru = { schemaVersion: 1, id: "ru", name: "Русский", strings: { back: "НАЗАД" } };
const directories: string[] = [];
async function directory() {
  const root = await mkdtemp(path.join(tmpdir(), "war-locales-"));
  directories.push(root);
  await writeFile(path.join(root, "en.json"), JSON.stringify(en));
  return root;
}
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
describe("DEV locale source writer", () => {
  it("creates and updates validated canonical files without temporary residue", async () => {
    const root = await directory();
    await writeLocaleDefinition(JSON.stringify({ operation: "create", locale: ru }), root);
    await writeLocaleDefinition(
      JSON.stringify({ operation: "update", locale: { ...ru, name: "Renamed" } }),
      root,
    );
    expect(JSON.parse(await readFile(path.join(root, "ru.json"), "utf8")).name).toBe("Renamed");
    expect((await readdir(root)).sort()).toEqual(["en.json", "ru.json"]);
    await expect(
      writeLocaleDefinition(JSON.stringify({ operation: "create", locale: ru }), root),
    ).rejects.toThrow();
    await expect(
      writeLocaleDefinition(
        JSON.stringify({ operation: "update", locale: { ...ru, id: "fr" } }),
        root,
      ),
    ).rejects.toThrow();
  });
  it("rejects invalid IDs, unknown keys, malformed payloads and oversized requests", async () => {
    const root = await directory();
    for (const locale of [
      { ...ru, id: "../escape" },
      { ...ru, strings: { unknown: "x" } },
      { ...ru, strings: { back: 1 } },
    ]) {
      await expect(
        writeLocaleDefinition(JSON.stringify({ operation: "create", locale }), root),
      ).rejects.toThrow();
    }
    await expect(writeLocaleDefinition("{}", root)).rejects.toThrow();
    await expect(
      readLocaleBody(Readable.from([Buffer.alloc(MAX_LOCALE_BODY_BYTES + 1)])),
    ).rejects.toThrow("large");
    expect(await readLocaleBody(Readable.from([Buffer.from("hello")]))).toBe("hello");
    expect(await readdir(root)).toEqual(["en.json"]);
  });
  it("preserves prior source on commit failure and protects existing English keys", async () => {
    const root = await directory();
    const before = await readFile(path.join(root, "en.json"), "utf8");
    await expect(
      writeLocaleDefinition(
        JSON.stringify({ operation: "update", locale: { ...en, name: "Changed" } }),
        root,
        async () => {
          throw new Error("disk failed");
        },
      ),
    ).rejects.toThrow("disk failed");
    expect(await readFile(path.join(root, "en.json"), "utf8")).toBe(before);
    await expect(
      writeLocaleDefinition(
        JSON.stringify({ operation: "update", locale: { ...en, strings: {} } }),
        root,
      ),
    ).rejects.toThrow();
    expect(await readdir(root)).toEqual(["en.json"]);
  });
  it("uses a serve-only plugin with custom notifications instead of full reload", () => {
    const plugin = createDevLocaleWriter();
    expect(plugin.apply).toBe("serve");
    const send = vi.fn();
    const watchers = new Map<string, (file: string) => void>();
    const server = {
      watcher: {
        on: (event: string, callback: (file: string) => void) => watchers.set(event, callback),
      },
      middlewares: { use: vi.fn() },
      ws: { send },
    };
    (plugin.configureServer as (server: unknown) => void)(server);
    watchers.get("change")!(path.resolve("src/game/localization/locales/en.json"));
    expect(send).toHaveBeenCalledWith({ type: "custom", event: "localizations:changed", data: {} });
    expect(plugin.hotUpdate).toBeDefined();
    const hook = plugin.hotUpdate as {
      handler: (context: { file: string; type: string }) => unknown;
    };
    for (const type of ["create", "update", "delete"]) {
      expect(
        hook.handler({
          type,
          file: path.resolve("src/game/localization/locales/en.json").replaceAll("\\", "/"),
        }),
      ).toEqual([]);
    }
  });
});
