import { randomUUID } from "node:crypto";
import { link, lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import {
  buildLocaleCatalog,
  type LocaleCatalog,
  parseLocale,
} from "../src/game/localization/locale";

const DIRECTORY = path.resolve("src/game/localization/locales");
const ENDPOINT = "/__dev-localizations";
const BYTES_PER_KILOBYTE = 1024;
const REQUEST_KILOBYTES = 1024;
export const MAX_LOCALE_BODY_BYTES = BYTES_PER_KILOBYTE * REQUEST_KILOBYTES;
const OK = 200;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const METHOD_NOT_ALLOWED = 405;
type Commit = (temporary: string, target: string) => Promise<void>;
const locks = new Map<string, Promise<unknown>>();
export async function readLocaleDirectory(directory = DIRECTORY): Promise<LocaleCatalog> {
  const files: Record<string, unknown> = {};
  for (const file of await readdir(directory)) {
    if (!file.endsWith(".json")) continue;
    try {
      files[file] = JSON.parse(await readFile(path.join(directory, file), "utf8"));
    } catch {
      files[file] = null;
    }
  }
  return buildLocaleCatalog(files);
}
export async function writeLocaleDefinition(
  serialized: string,
  directory = DIRECTORY,
  commit: Commit = rename,
): Promise<string> {
  if (Buffer.byteLength(serialized) > MAX_LOCALE_BODY_BYTES)
    throw new Error("Locale request is too large.");
  const root = path.resolve(directory);
  const prior = locks.get(root) ?? Promise.resolve();
  const operation = prior.catch(() => {}).then(() => commitLocale(serialized, root, commit));
  locks.set(root, operation);
  try {
    return await operation;
  } finally {
    if (locks.get(root) === operation) locks.delete(root);
  }
}
async function commitLocale(serialized: string, root: string, commit: Commit): Promise<string> {
  const request = JSON.parse(serialized);
  if (request?.operation !== "create" && request?.operation !== "update")
    throw new Error("Invalid locale operation.");
  const english = parseLocale(JSON.parse(await readFile(path.join(root, "en.json"), "utf8")));
  const locale = parseLocale(request.locale, english);
  const target = path.resolve(root, `${locale.id}.json`);
  if (path.dirname(target) !== root) throw new Error("Locale path escapes directory.");
  const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (existing?.isSymbolicLink()) throw new Error("Locale target cannot be a symbolic link.");
  if (request.operation === "create" && existing) throw new Error("Locale already exists.");
  if (request.operation === "update" && !existing) throw new Error("Locale no longer exists.");
  if (locale.id === "en") preserveEnglishKeys(english.strings, locale.strings);
  await mkdir(root, { recursive: true });
  const temporary = path.join(root, `.${locale.id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(locale, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    if (request.operation === "create") await link(temporary, target);
    else await commit(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return target;
}
function preserveEnglishKeys(previous: Record<string, string>, next: Record<string, string>): void {
  for (const key of Object.keys(previous)) {
    if (!Object.hasOwn(next, key)) throw new Error("Existing English keys cannot be removed.");
  }
}
export function createDevLocaleWriter(): Plugin {
  const isLocaleFile = (file: string) =>
    path.resolve(path.dirname(file)) === DIRECTORY && path.extname(file) === ".json";
  return {
    name: "ai-war-game-dev-localization-writer",
    apply: "serve",
    hotUpdate: {
      order: "post",
      handler(context) {
        if (isLocaleFile(context.file)) return [];
      },
    },
    configureServer(server) {
      const refresh = (file: string) => {
        if (isLocaleFile(file))
          server.ws.send({ type: "custom", event: "localizations:changed", data: {} });
      };
      server.watcher.on("add", refresh);
      server.watcher.on("change", refresh);
      server.watcher.on("unlink", refresh);
      server.middlewares.use(ENDPOINT, async (request, response) => {
        try {
          if (request.method === "GET") {
            response.statusCode = OK;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(await readLocaleDirectory()));
          } else if (request.method === "POST") {
            await writeLocaleDefinition(await readLocaleBody(request));
            response.statusCode = NO_CONTENT;
            response.end();
            refresh(path.join(DIRECTORY, "en.json"));
          } else {
            response.statusCode = METHOD_NOT_ALLOWED;
            response.end();
          }
        } catch (error) {
          response.statusCode = BAD_REQUEST;
          response.end(error instanceof Error ? error.message : "Locale operation failed.");
        }
      });
    },
  };
}
export async function readLocaleBody(request: NodeJS.ReadableStream): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_LOCALE_BODY_BYTES) throw new Error("Locale request is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
