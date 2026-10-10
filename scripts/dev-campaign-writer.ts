import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { deserializeCampaign, serializeCampaign } from "../src/core/campaigns/definition";

const ENDPOINT = "/__dev-campaigns";
const DIRECTORY = path.resolve("src/core/campaigns/definitions");
const REGISTRY = "/src/core/campaigns/built-in-campaigns.ts";
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BYTES_PER_KILOBYTE = 1024;
const MAX_REQUEST_KILOBYTES = 1024;
const MAX_BODY_BYTES = BYTES_PER_KILOBYTE * MAX_REQUEST_KILOBYTES;
const BAD_REQUEST = 400;
const NO_CONTENT = 204;
const METHOD_NOT_ALLOWED = 405;
type Commit = (temporary: string, target: string) => Promise<void>;

export async function writeCampaignDefinition(
  serialized: string,
  directory = DIRECTORY,
  commit: Commit = rename,
): Promise<string> {
  const campaign = deserializeCampaign(serialized);
  if (!SAFE_ID.test(campaign.id)) throw new Error("Campaign ID is not safe for a filename.");
  const root = path.resolve(directory);
  const target = path.resolve(root, `${campaign.id}.json`);
  if (path.dirname(target) !== root)
    throw new Error("Campaign path escapes the definitions directory.");
  await mkdir(root, { recursive: true });
  const temporary = path.join(root, `.${campaign.id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${serializeCampaign(campaign)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await commit(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return target;
}
export function createDevCampaignWriter(): Plugin {
  return {
    name: "ai-war-game-dev-campaign-writer",
    configureServer(server) {
      const refresh = (file: string) => {
        if (path.dirname(file) === DIRECTORY && path.extname(file) === ".json")
          void refreshRegistry(server);
      };
      server.watcher.on("add", refresh);
      server.watcher.on("change", refresh);
      server.watcher.on("unlink", refresh);
      server.middlewares.use(ENDPOINT, async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = METHOD_NOT_ALLOWED;
          response.end();
          return;
        }
        try {
          await writeCampaignDefinition(await readBody(request));
          response.statusCode = NO_CONTENT;
          response.end();
          await refreshRegistry(server);
        } catch (error) {
          response.statusCode = BAD_REQUEST;
          response.end(error instanceof Error ? error.message : "Campaign save failed.");
        }
      });
    },
  };
}
async function refreshRegistry(server: ViteDevServer): Promise<void> {
  const module = await server.moduleGraph.getModuleByUrl(REGISTRY);
  if (module) server.moduleGraph.invalidateModule(module);
  server.ws.send({ type: "full-reload" });
}
function readBody(request: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let failed = false;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        failed = true;
        reject(new Error("Campaign request is too large."));
      }
      if (!failed) chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}
