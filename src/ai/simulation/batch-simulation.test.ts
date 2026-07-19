import { describe, expect, it } from "vitest";

import { createGameStateFromMap, createMapDefinition } from "../../core/maps/map-definition";
import { replayActions } from "../../core/replay/replay-actions";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { runBatchSimulation } from "./batch-simulation";

const BASE_SEED = 10;
const MATCH_COUNT = 2;
const MAX_ACTIONS = 400;
const CUSTOM_MAP_ID = "headless-custom";
const CUSTOM_MAP_NAME = "Headless custom";
const CUSTOM_MAP_WIDTH = 3;
const CUSTOM_MAP_HEIGHT = 1;
const ONE_ACTION = 1;

describe("runBatchSimulation", () => {
  it("runs reproducible seeded local-agent matches and aggregates results", async () => {
    const options = {
      map: {
        id: "skirmish-12x8",
        name: "Skirmish 12×8",
        createInitialState: createSkirmishGameState,
      },
      blue: { kind: "heuristic" as const },
      red: { kind: "random" as const },
      seed: BASE_SEED,
      matches: MATCH_COUNT,
      maxActions: MAX_ACTIONS,
    };

    const first = await runBatchSimulation(options);
    const second = await runBatchSimulation(options);

    expect(first).toEqual(second);
    expect(first.records).toHaveLength(MATCH_COUNT);
    expect(first.records.map((record) => record.seed)).toEqual([BASE_SEED, BASE_SEED + 1]);
    expect(first.summary.completed + first.summary.incomplete).toBe(MATCH_COUNT);
  });

  it("stores accepted actions that replay to the recorded final match state", async () => {
    const result = await runBatchSimulation({
      map: {
        id: "skirmish-12x8",
        name: "Skirmish 12×8",
        createInitialState: createSkirmishGameState,
      },
      blue: { kind: "heuristic" },
      red: { kind: "heuristic" },
      seed: BASE_SEED,
      matches: 1,
      maxActions: MAX_ACTIONS,
    });
    const record = result.records[0];

    expect(record).toBeDefined();
    expect(replayActions(createSkirmishGameState, record.actions)).toEqual(record.finalState);
  });

  it("initializes a selected custom map without Phaser or browser storage", async () => {
    const map = {
      ...createMapDefinition(CUSTOM_MAP_ID, CUSTOM_MAP_NAME, CUSTOM_MAP_WIDTH, CUSTOM_MAP_HEIGHT),
      units: [
        { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 0 } },
        { side: "red" as const, type: "infantry" as const, position: { x: 2, y: 0 } },
      ],
    };
    const result = await runBatchSimulation({
      map: { id: map.id, name: map.name, createInitialState: () => createGameStateFromMap(map) },
      blue: { kind: "heuristic" },
      red: { kind: "heuristic" },
      seed: BASE_SEED,
      matches: ONE_ACTION,
      maxActions: ONE_ACTION,
    });

    expect(result.summary.mapId).toBe(CUSTOM_MAP_ID);
    expect(result.records[0]?.finalState.board.width).toBe(CUSTOM_MAP_WIDTH);
  });
});
