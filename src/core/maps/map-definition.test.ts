import { describe, expect, it } from "vitest";

import {
  createGameStateFromMap,
  createMapDefinition,
  deserializeMapDefinition,
  isMapReadyForMatch,
  resizeMapDefinition,
  serializeMapDefinition,
  validateMapDefinition,
} from "./map-definition";

const MAP_ID = "custom-map";
const MAP_NAME = "Custom Map";
const WIDTH = 6;
const HEIGHT = 4;
const RESIZED_WIDTH = 4;
const RESIZED_HEIGHT = 3;
const INFANTRY_MAX_HEALTH = 10;
const TANK_MAX_HEALTH = 16;
const MOUNTAIN_POSITION = { x: 2, y: 2 };
const SECOND_MOUNTAIN_POSITION = { x: 3, y: 2 };
const INITIAL_SCORES = { blue: 0, red: 0 };

describe("map definitions", () => {
  it("allows incomplete draft maps but requires both sides to launch", () => {
    const draft = createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT);
    const readyMap = {
      ...draft,
      units: [
        { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 0 } },
        { side: "red" as const, type: "tank" as const, position: { x: 5, y: 3 } },
      ],
    };

    expect(validateMapDefinition(draft).isValid).toBe(true);
    expect(isMapReadyForMatch(draft)).toBe(false);
    expect(isMapReadyForMatch(readyMap)).toBe(true);
  });

  it("rejects out-of-bounds positions and duplicate unit or control point cells", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      units: [
        { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 0 } },
        { side: "red" as const, type: "tank" as const, position: { x: 0, y: 0 } },
      ],
      controlPoints: [
        { owner: null, position: { x: 6, y: 0 } },
        { owner: "blue" as const, position: { x: 6, y: 0 } },
      ],
    };

    expect(validateMapDefinition(map)).toEqual({
      isValid: false,
      errors: [
        "duplicate-unit-position",
        "control-point-out-of-bounds",
        "control-point-out-of-bounds",
      ],
    });
  });

  it("keeps unit and control point placement on the same cell valid", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      units: [{ side: "blue" as const, type: "infantry" as const, position: { x: 1, y: 1 } }],
      controlPoints: [{ owner: "red" as const, position: { x: 1, y: 1 } }],
    };

    expect(validateMapDefinition(map)).toEqual({ isValid: true, errors: [] });
  });
});

describe("terrain map definitions", () => {
  it("validates mountains, their conflicts, and tank placement", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      terrain: [
        { type: "mountain" as const, position: MOUNTAIN_POSITION },
        { type: "mountain" as const, position: MOUNTAIN_POSITION },
        { type: "mountain" as const, position: { x: WIDTH, y: 0 } },
      ],
      units: [{ side: "blue" as const, type: "tank" as const, position: MOUNTAIN_POSITION }],
      controlPoints: [{ owner: null, position: MOUNTAIN_POSITION }],
    };

    expect(validateMapDefinition(map)).toEqual({
      isValid: false,
      errors: [
        "duplicate-terrain-position",
        "terrain-out-of-bounds",
        "mountain-control-point-conflict",
        "tank-on-mountain",
      ],
    });
  });

  it("creates the same deterministic game state from the same map", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      units: [
        { side: "red" as const, type: "tank" as const, position: { x: 5, y: 3 } },
        { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 0 } },
      ],
      controlPoints: [{ owner: null, position: { x: 2, y: 2 } }],
      terrain: [{ type: "mountain" as const, position: SECOND_MOUNTAIN_POSITION }],
    };

    expect(createGameStateFromMap(map)).toEqual(createGameStateFromMap(map));
    expect(createGameStateFromMap(map).units["blue-infantry-1"]?.maxHealth).toBe(
      INFANTRY_MAX_HEALTH,
    );
    expect(createGameStateFromMap(map).units["red-tank-1"]?.maxHealth).toBe(TANK_MAX_HEALTH);
    expect(createGameStateFromMap(map).board.terrain).toEqual(map.terrain);
    expect(createGameStateFromMap(map).scores).toEqual(INITIAL_SCORES);
  });

  it("serializes, parses and trims placements after a resize", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      units: [{ side: "blue" as const, type: "infantry" as const, position: { x: 5, y: 3 } }],
      controlPoints: [{ owner: null, position: { x: 4, y: 3 } }],
      terrain: [{ type: "mountain" as const, position: { x: 5, y: 3 } }],
    };

    expect(deserializeMapDefinition(serializeMapDefinition(map))).toEqual(map);
    expect(resizeMapDefinition(map, RESIZED_WIDTH, RESIZED_HEIGHT)).toEqual({
      ...map,
      width: RESIZED_WIDTH,
      height: RESIZED_HEIGHT,
      units: [],
      controlPoints: [],
      terrain: [],
    });
  });

  it("migrates schema-v1 maps to terrain-free schema-v2 maps", () => {
    const legacyMap = {
      schemaVersion: 1,
      id: MAP_ID,
      name: MAP_NAME,
      width: WIDTH,
      height: HEIGHT,
      units: [],
      controlPoints: [],
    };

    const parsedMap = deserializeMapDefinition(JSON.stringify(legacyMap));

    expect(parsedMap.schemaVersion).toBe(2);
    expect(parsedMap.terrain).toEqual([]);
  });
});
