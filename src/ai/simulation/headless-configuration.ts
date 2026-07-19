export type SimulationParticipantKind = "random" | "heuristic" | "lm-studio";

export interface HeadlessLmStudioConfiguration {
  readonly baseUrl: string;
  readonly blueModelId: string;
  readonly redModelId: string;
  readonly timeoutMs: number | null;
}

export interface HeadlessSimulationConfiguration {
  readonly map: string;
  readonly blue: SimulationParticipantKind;
  readonly red: SimulationParticipantKind;
  readonly matches: number;
  readonly seed: number;
  readonly maxActions: number;
  readonly recordsPath: string | null;
  readonly lmStudio: HeadlessLmStudioConfiguration;
}

export type EnvironmentValues = Readonly<Record<string, string | undefined>>;

const DEFAULT_BLUE_AGENT: SimulationParticipantKind = "heuristic";
const DEFAULT_RED_AGENT: SimulationParticipantKind = "heuristic";
const DEFAULT_MATCH_COUNT = 1;
const DEFAULT_SEED = 2026;
const DEFAULT_MAX_ACTIONS = 400;
const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234/v1";
const DISABLED_TIMEOUT = "disabled";
const AGENT_KINDS: readonly SimulationParticipantKind[] = ["random", "heuristic", "lm-studio"];
const OPTION_PREFIX = "--";

interface RawOptions {
  map?: string;
  blue?: string;
  red?: string;
  matches?: string;
  seed?: string;
  maxActions?: string;
  records?: string;
  lmUrl?: string;
  blueModel?: string;
  redModel?: string;
  lmTimeout?: string;
}

const OPTION_NAMES: Readonly<Record<string, keyof RawOptions>> = {
  "--map": "map",
  "--blue": "blue",
  "--red": "red",
  "--matches": "matches",
  "--seed": "seed",
  "--max-actions": "maxActions",
  "--records": "records",
  "--lm-url": "lmUrl",
  "--blue-model": "blueModel",
  "--red-model": "redModel",
  "--lm-timeout": "lmTimeout",
};

export function mergeEnvironment(
  defaults: EnvironmentValues,
  local: EnvironmentValues,
  processEnvironment: EnvironmentValues,
): EnvironmentValues {
  return { ...defaults, ...local, ...processEnvironment };
}

export function createHeadlessSimulationConfiguration(
  argumentsList: readonly string[],
  environment: EnvironmentValues,
  defaultMap: string,
): HeadlessSimulationConfiguration {
  const options = parseOptions(argumentsList);
  const blue = readParticipant(
    options.blue,
    environment.SIMULATION_BLUE,
    DEFAULT_BLUE_AGENT,
    "Blue",
  );
  const red = readParticipant(options.red, environment.SIMULATION_RED, DEFAULT_RED_AGENT, "Red");
  const lmStudio = createLmStudioConfiguration(options, environment);

  validateLmStudioParticipants(blue, red, lmStudio);

  return {
    map: readString(options.map, environment.SIMULATION_MAP, defaultMap),
    blue,
    red,
    matches: readPositiveInteger(
      options.matches,
      environment.SIMULATION_MATCHES,
      DEFAULT_MATCH_COUNT,
    ),
    seed: readInteger(options.seed, environment.SIMULATION_SEED, DEFAULT_SEED),
    maxActions: readPositiveInteger(
      options.maxActions,
      environment.SIMULATION_MAX_ACTIONS,
      DEFAULT_MAX_ACTIONS,
    ),
    recordsPath: readOptionalString(options.records, environment.SIMULATION_RECORDS) ?? null,
    lmStudio,
  };
}

function parseOptions(argumentsList: readonly string[]): RawOptions {
  const options: Partial<RawOptions> = {};

  for (let index = 0; index < argumentsList.length; index += 2) {
    const option = argumentsList[index];
    const value = argumentsList[index + 1];

    if (!option?.startsWith(OPTION_PREFIX) || value === undefined) {
      throw new Error(`Expected an option and value, received ${option ?? "nothing"}.`);
    }

    const optionName = OPTION_NAMES[option];
    if (!optionName) {
      throw new Error(`Unsupported option: ${option}.`);
    }

    options[optionName] = value;
  }

  return options;
}

function createLmStudioConfiguration(
  options: RawOptions,
  environment: EnvironmentValues,
): HeadlessLmStudioConfiguration {
  return {
    baseUrl: readString(options.lmUrl, environment.LM_STUDIO_BASE_URL, DEFAULT_LM_STUDIO_BASE_URL),
    blueModelId: readString(options.blueModel, environment.LM_STUDIO_BLUE_MODEL, ""),
    redModelId: readString(options.redModel, environment.LM_STUDIO_RED_MODEL, ""),
    timeoutMs: readTimeout(options.lmTimeout, environment.LM_STUDIO_TIMEOUT_MS),
  };
}

function validateLmStudioParticipants(
  blue: SimulationParticipantKind,
  red: SimulationParticipantKind,
  lmStudio: HeadlessLmStudioConfiguration,
): void {
  if (blue === "lm-studio" && lmStudio.blueModelId.length === 0) {
    throw new Error("Blue LM Studio model ID is required.");
  }
  if (red === "lm-studio" && lmStudio.redModelId.length === 0) {
    throw new Error("Red LM Studio model ID is required.");
  }
}

function readParticipant(
  optionValue: string | undefined,
  environmentValue: string | undefined,
  fallback: SimulationParticipantKind,
  label: string,
): SimulationParticipantKind {
  const value = readString(optionValue, environmentValue, fallback);

  if (isParticipantKind(value)) return value;
  throw new Error(`${label} agent must be one of: ${AGENT_KINDS.join(", ")}.`);
}

function readTimeout(
  optionValue: string | undefined,
  environmentValue: string | undefined,
): number | null {
  const value = readOptionalString(optionValue, environmentValue);

  if (value === undefined || value.toLowerCase() === DISABLED_TIMEOUT) return null;
  return parsePositiveInteger(value, "LM Studio timeout");
}

function readPositiveInteger(
  optionValue: string | undefined,
  environmentValue: string | undefined,
  fallback: number,
): number {
  return parsePositiveInteger(readString(optionValue, environmentValue, String(fallback)), "Value");
}

function readInteger(
  optionValue: string | undefined,
  environmentValue: string | undefined,
  fallback: number,
): number {
  const value = Number(readString(optionValue, environmentValue, String(fallback)));

  if (Number.isInteger(value)) return value;
  throw new Error("Seed must be an integer.");
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  throw new Error(`${label} must be a positive integer.`);
}

function readString(
  optionValue: string | undefined,
  environmentValue: string | undefined,
  fallback: string,
): string {
  return optionValue ?? environmentValue ?? fallback;
}

function readOptionalString(
  optionValue: string | undefined,
  environmentValue: string | undefined,
): string | undefined {
  const value = optionValue ?? environmentValue;
  return value && value.trim().length > 0 ? value : undefined;
}

function isParticipantKind(value: string): value is SimulationParticipantKind {
  return AGENT_KINDS.includes(value as SimulationParticipantKind);
}
