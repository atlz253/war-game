import { describe, expect, it } from "vitest";
import { createBuiltInMapId, getBuiltInMapFileName } from "./built-in-map-file";
import { createMapDefinition } from "./map-definition";

const MAP_ID = "map-123e4567-e89b-12d3-a456-426614174000";
const MAP_NAME = "Tactical Valley";
const MAP_SIZE = 8;
const MAP = createMapDefinition(MAP_ID, MAP_NAME, MAP_SIZE, MAP_SIZE);

describe("built-in map file naming", () => {
  it("creates a UUID-based map id", () => {
    expect(createBuiltInMapId(() => "123e4567-e89b-12d3-a456-426614174000")).toBe(MAP_ID);
  });

  it("uses a readable map-name slug and unique id in the JSON filename", () => {
    expect(getBuiltInMapFileName(MAP)).toBe(`${"tactical-valley"}--${MAP_ID}.json`);
  });

  it("keeps non-Latin map names readable in filenames", () => {
    expect(getBuiltInMapFileName({ ...MAP, name: "Карта для теста" })).toBe(
      `карта-для-теста--${MAP_ID}.json`,
    );
  });
});
