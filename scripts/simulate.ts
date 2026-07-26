import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  runBatchSimulation,
  type SimulationMap,
  type SimulationParticipant,
} from "../src/ai/simulation/batch-simulation";
import {
  createHeadlessSimulationConfiguration,
  type EnvironmentValues,
  mergeEnvironment,
} from "../src/ai/simulation/headless-configuration";
import {
  createGameStateFromMap,
  deserializeMapDefinition,
  isMapReadyForMatch,
} from "../src/core/maps/map-definition";

const BUILT_IN_MAP_SELECTION = "skirmish";
const SKIRMISH_MAP_FILE = "src/core/scenarios/maps/skirmish-12x8.json";
const ENV_DEFAULTS_FILE = ".env";
const ENV_LOCAL_FILE = ".env.local";
const UTF8_ENCODING = "utf8";
const NEW_LINE = "\n";
const ENV_ASSIGNMENT = "=";
const COMMENT_PREFIX = "#";

const environment = mergeEnvironment(
  readEnvironmentFile(ENV_DEFAULTS_FILE),
  readEnvironmentFile(ENV_LOCAL_FILE),
  process.env,
);
const configuration = createHeadlessSimulationConfiguration(
  process.argv.slice(2),
  environment,
  BUILT_IN_MAP_SELECTION,
);
const map = loadSimulationMap(configuration.map);
const result = await runBatchSimulation({
  map,
  blue: createParticipant(
    configuration.blue,
    configuration.lmStudio.baseUrl,
    configuration.lmStudio.blueModelId,
    configuration.lmStudio.timeoutMs,
  ),
  red: createParticipant(
    configuration.red,
    configuration.lmStudio.baseUrl,
    configuration.lmStudio.redModelId,
    configuration.lmStudio.timeoutMs,
  ),
  seed: configuration.seed,
  matches: configuration.matches,
  maxActions: configuration.maxActions,
});

if (configuration.recordsPath) {
  writeRecords(configuration.recordsPath, result.records);
}

console.log(JSON.stringify(result.summary));

function loadSimulationMap(selection: string): SimulationMap {
  if (selection === BUILT_IN_MAP_SELECTION) {
    return createSimulationMapFromFile(SKIRMISH_MAP_FILE);
  }

  return createSimulationMapFromFile(selection);
}

function createSimulationMapFromFile(filePath: string): SimulationMap {
  const map = deserializeMapDefinition(readFileSync(resolve(filePath), UTF8_ENCODING));

  if (!isMapReadyForMatch(map)) {
    throw new Error("The selected map must contain at least one unit for each side.");
  }

  return { id: map.id, name: map.name, createInitialState: () => createGameStateFromMap(map) };
}

function createParticipant(
  kind: SimulationParticipant["kind"],
  baseUrl: string,
  modelId: string,
  timeoutMs: number | null,
): SimulationParticipant {
  return kind === "lm-studio" ? { kind, connection: { baseUrl, modelId, timeoutMs } } : { kind };
}

function readEnvironmentFile(filePath: string): EnvironmentValues {
  if (!existsSync(filePath)) return {};

  return parseEnvironment(readFileSync(filePath, UTF8_ENCODING));
}

function parseEnvironment(content: string): EnvironmentValues {
  return Object.fromEntries(
    content
      .split(NEW_LINE)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith(COMMENT_PREFIX))
      .flatMap(parseEnvironmentLine),
  );
}

function parseEnvironmentLine(line: string): readonly [string, string][] {
  const separatorIndex = line.indexOf(ENV_ASSIGNMENT);
  if (separatorIndex < 0) return [];

  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + ENV_ASSIGNMENT.length).trim();
  return key.length > 0 ? [[key, value]] : [];
}

function writeRecords(
  recordsPath: string,
  records: Awaited<ReturnType<typeof runBatchSimulation>>["records"],
): void {
  const resolvedPath = resolve(recordsPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  const content = records.map(serializeRecord).join(NEW_LINE) + NEW_LINE;
  writeFileSync(resolvedPath, content, UTF8_ENCODING);
}

function serializeRecord(
  record: Awaited<ReturnType<typeof runBatchSimulation>>["records"][number],
): string {
  const { finalState: _finalState, ...serializableRecord } = record;
  return JSON.stringify(serializableRecord);
}
