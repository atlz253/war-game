import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { getBuiltInMapFileName } from "./src/core/maps/built-in-map-file";
import { deserializeMapDefinition, serializeMapDefinition } from "./src/core/maps/map-definition";

const LM_STUDIO_PROXY_PATH = "/lm-studio-api";
const LM_STUDIO_SERVER_URL = "http://127.0.0.1:1234";
const PROXY_PATH_PREFIX_PATTERN = /^\/lm-studio-api/;
const DEV_MAP_ENDPOINT = "/__dev-maps";
const MAPS_DIRECTORY = path.resolve("src/core/scenarios/maps");
const BUILT_IN_MAP_REGISTRY_MODULE = "/src/core/scenarios/built-in-maps.ts";
const JSON_FILE_EXTENSION = ".json";
const SAFE_MAP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BYTES_PER_KILOBYTE = 1024;
const MAX_MAP_REQUEST_KILOBYTES = 1024;
const MAX_MAP_REQUEST_BYTES = BYTES_PER_KILOBYTE * MAX_MAP_REQUEST_KILOBYTES;
const METHOD_NOT_ALLOWED_STATUS = 405;
const NO_CONTENT_STATUS = 204;
const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;

export default defineConfig(({ command }) => ({
  plugins: command === "serve" ? [createDevMapWriter()] : [],
  server: {
    proxy: {
      [LM_STUDIO_PROXY_PATH]: {
        target: LM_STUDIO_SERVER_URL,
        changeOrigin: true,
        rewrite: (proxyPath) => proxyPath.replace(PROXY_PATH_PREFIX_PATTERN, ""),
      },
    },
  },
}));

function createDevMapWriter(): Plugin {
  return {
    name: "ai-war-game-dev-map-writer",
    configureServer(server) {
      server.watcher.on("add", (filePath) => void refreshBuiltInMapRegistry(server, filePath));
      server.watcher.on("unlink", (filePath) => void refreshBuiltInMapRegistry(server, filePath));
      server.middlewares.use(DEV_MAP_ENDPOINT, async (request, response) => {
        if (request.method === "DELETE") {
          await handleBuiltInMapDeletion(server, request.url, response);
          return;
        }
        if (request.method !== "POST") {
          response.statusCode = METHOD_NOT_ALLOWED_STATUS;
          response.end();
          return;
        }

        try {
          const serializedMap = await readRequestBody(request);
          const map = deserializeMapDefinition(serializedMap);
          if (!SAFE_MAP_ID.test(map.id)) throw new Error("Map id is not safe for a filename.");

          await mkdir(MAPS_DIRECTORY, { recursive: true });
          const mapFilePath = path.join(MAPS_DIRECTORY, getBuiltInMapFileName(map));
          await writeFile(mapFilePath, `${serializeMapDefinition(map)}\n`, "utf8");
          await removePreviousMapFiles(map.id, mapFilePath);
          await refreshBuiltInMapRegistry(server, mapFilePath);
          response.statusCode = NO_CONTENT_STATUS;
          response.end();
        } catch {
          response.statusCode = BAD_REQUEST_STATUS;
          response.end();
        }
      });
    },
  };
}

async function handleBuiltInMapDeletion(
  server: ViteDevServer,
  requestUrl: string | undefined,
  response: { statusCode: number; end: () => void },
): Promise<void> {
  try {
    const mapId = new URL(requestUrl ?? "", "http://localhost").searchParams.get("id") ?? "";
    if (!SAFE_MAP_ID.test(mapId)) throw new Error("Map id is not safe for deletion.");

    const deletedMapFiles = await removeMapFiles(mapId);
    if (deletedMapFiles.length === 0) {
      response.statusCode = NOT_FOUND_STATUS;
      response.end();
      return;
    }
    await refreshBuiltInMapRegistry(server, path.join(MAPS_DIRECTORY, "deleted-map.json"));
    response.statusCode = NO_CONTENT_STATUS;
    response.end();
  } catch {
    response.statusCode = BAD_REQUEST_STATUS;
    response.end();
  }
}

async function removePreviousMapFiles(mapId: string, currentMapFilePath: string): Promise<void> {
  await Promise.all(
    (await findMapFiles(mapId)).filter((filePath) => filePath !== currentMapFilePath).map(unlink),
  );
}

async function removeMapFiles(mapId: string): Promise<readonly string[]> {
  const mapFiles = await findMapFiles(mapId);
  await Promise.all(mapFiles.map(unlink));
  return mapFiles;
}

async function findMapFiles(mapId: string): Promise<readonly string[]> {
  const entries = await readdir(MAPS_DIRECTORY, { withFileTypes: true });
  const mapFiles = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && path.extname(entry.name) === JSON_FILE_EXTENSION)
      .map((entry) => path.join(MAPS_DIRECTORY, entry.name))
      .map(async (filePath) => ((await readMapId(filePath)) === mapId ? filePath : null)),
  );
  return mapFiles.filter((filePath): filePath is string => filePath !== null);
}

async function readMapId(filePath: string): Promise<string | null> {
  try {
    const map = deserializeMapDefinition(await readFile(filePath, "utf8"));
    return map.id;
  } catch {
    return null;
  }
}

async function refreshBuiltInMapRegistry(server: ViteDevServer, filePath: string): Promise<void> {
  if (path.dirname(filePath) !== MAPS_DIRECTORY || path.extname(filePath) !== JSON_FILE_EXTENSION) {
    return;
  }
  const registryModule = await server.moduleGraph.getModuleByUrl(BUILT_IN_MAP_REGISTRY_MODULE);
  if (registryModule) server.moduleGraph.invalidateModule(registryModule);
  server.ws.send({ type: "full-reload" });
}

function readRequestBody(request: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_MAP_REQUEST_BYTES) {
        reject(new Error("Map request is too large."));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}
