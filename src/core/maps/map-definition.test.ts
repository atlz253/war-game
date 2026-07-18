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

  it("creates the same deterministic game state from the same map", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      units: [
        { side: "red" as const, type: "tank" as const, position: { x: 5, y: 3 } },
        { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 0 } },
      ],
      controlPoints: [{ owner: null, position: { x: 2, y: 2 } }],
    };

    expect(createGameStateFromMap(map)).toEqual(createGameStateFromMap(map));
    expect(createGameStateFromMap(map).units["blue-infantry-1"]?.maxHealth).toBe(
      INFANTRY_MAX_HEALTH,
    );
    expect(createGameStateFromMap(map).units["red-tank-1"]?.maxHealth).toBe(TANK_MAX_HEALTH);
  });

  it("serializes, parses and trims placements after a resize", () => {
    const map = {
      ...createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT),
      units: [{ side: "blue" as const, type: "infantry" as const, position: { x: 5, y: 3 } }],
      controlPoints: [{ owner: null, position: { x: 4, y: 3 } }],
    };

    expect(deserializeMapDefinition(serializeMapDefinition(map))).toEqual(map);
    expect(resizeMapDefinition(map, RESIZED_WIDTH, RESIZED_HEIGHT)).toEqual({
      ...map,
      width: RESIZED_WIDTH,
      height: RESIZED_HEIGHT,
      units: [],
      controlPoints: [],
    });
  });
});
