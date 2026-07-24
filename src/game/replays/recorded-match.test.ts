import { describe, expect, it } from "vitest";

import { createMapDefinition } from "../../core/maps/map-definition";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import {
  createRecordedMatch,
  deserializeRecordedMatch,
  serializeRecordedMatch,
} from "./recorded-match";

const MAP_WIDTH = 4;
const MAP_HEIGHT = 2;
const FINAL_TURN = 5;
const MAP = {
  ...createMapDefinition("replay-map", "Replay map", MAP_WIDTH, MAP_HEIGHT),
  units: [
    { side: "blue" as const, type: "tank" as const, position: { x: 0, y: 0 } },
    { side: "red" as const, type: "infantry" as const, position: { x: 1, y: 0 } },
  ],
};

describe("RecordedMatch", () => {
  it("serializes a self-contained completed replay with match configuration snapshot", () => {
    const recorded = createRecordedMatch({
      id: "replay-1",
      name: "Blue victory",
      mapDefinition: MAP,
      matchConfiguration: {
        ...createDefaultMatchConfiguration(),
        red: "lm-studio-ai",
        lmStudioConnections: {
          blue: { baseUrl: "", modelId: "" },
          red: { baseUrl: "/lm-studio-api/v1", modelId: "red-model" },
        },
      },
      actions: [
        { type: "attack", unitId: "blue-tank-1", targetUnitId: "red-infantry-1" },
        { type: "end-turn" },
        { type: "end-turn" },
        { type: "attack", unitId: "blue-tank-1", targetUnitId: "red-infantry-1" },
        { type: "end-turn" },
        { type: "end-turn" },
        { type: "attack", unitId: "blue-tank-1", targetUnitId: "red-infantry-1" },
      ],
      savedAt: "2026-07-19T12:00:00.000Z",
    });

    const restored = deserializeRecordedMatch(serializeRecordedMatch(recorded));

    expect(restored.winner).toBe("blue");
    expect(restored.turn).toBe(FINAL_TURN);
    expect(restored.mapDefinition).toEqual(MAP);
    expect(restored.matchConfiguration.lmStudioConnections.red.modelId).toBe("red-model");
  });

  it("rejects imports whose actions cannot be replayed", () => {
    const malformed = JSON.stringify({
      schemaVersion: 1,
      id: "bad",
      name: "Bad",
      savedAt: "2026-07-19T12:00:00.000Z",
      winner: "blue",
      turn: 1,
      mapDefinition: MAP,
      matchConfiguration: createDefaultMatchConfiguration(),
      replay: { scenarioId: MAP.id, seed: 0, actions: [{ type: "end-turn" }] },
    });

    expect(() => deserializeRecordedMatch(malformed)).toThrow("not a supported completed replay");
  });
});
