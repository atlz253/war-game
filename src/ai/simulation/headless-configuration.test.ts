import { describe, expect, it } from "vitest";

import { createHeadlessSimulationConfiguration, mergeEnvironment } from "./headless-configuration";

const BASE_SEED = 42;
const MATCH_COUNT = 3;
const MAX_ACTIONS = 100;

describe("headless simulation configuration", () => {
  it("uses local environment values over committed defaults", () => {
    const environment = mergeEnvironment(
      { SIMULATION_BLUE: "random", SIMULATION_MATCHES: "2" },
      { SIMULATION_BLUE: "heuristic", SIMULATION_MATCHES: "3" },
      {},
    );

    expect(createHeadlessSimulationConfiguration([], environment, "skirmish")).toMatchObject({
      blue: "heuristic",
      matches: MATCH_COUNT,
    });
  });

  it("uses command arguments over environment values", () => {
    const configuration = createHeadlessSimulationConfiguration(
      ["--blue", "random", "--matches", "3", "--seed", "42", "--max-actions", "100"],
      { SIMULATION_BLUE: "heuristic", SIMULATION_MATCHES: "2" },
      "skirmish",
    );

    expect(configuration).toMatchObject({
      blue: "random",
      matches: MATCH_COUNT,
      seed: BASE_SEED,
      maxActions: MAX_ACTIONS,
    });
  });

  it("requires models only for LM Studio participants", () => {
    expect(() =>
      createHeadlessSimulationConfiguration(
        ["--blue", "lm-studio", "--red", "heuristic"],
        {},
        "skirmish",
      ),
    ).toThrow("Blue LM Studio model ID is required.");
  });

  it("accepts a map path, JSONL path, and disabled LM Studio timeout", () => {
    expect(
      createHeadlessSimulationConfiguration(
        [
          "--map",
          "custom.ai-war-map.json",
          "--records",
          "results.jsonl",
          "--lm-timeout",
          "disabled",
        ],
        {},
        "skirmish",
      ),
    ).toMatchObject({
      map: "custom.ai-war-map.json",
      recordsPath: "results.jsonl",
      lmStudio: { timeoutMs: null },
    });
  });
});
