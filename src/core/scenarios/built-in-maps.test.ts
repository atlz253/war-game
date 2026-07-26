import { describe, expect, it } from "vitest";

import { createGameStateFromMap, validateMapDefinition } from "../maps/map-definition";
import { getBuiltInMap, getBuiltInMaps } from "./built-in-maps";

describe("built-in maps", () => {
  it("loads validated maps in a stable id order", () => {
    const maps = getBuiltInMaps();

    expect(maps.map((map) => map.id)).toEqual([...maps].map((map) => map.id).sort());
    expect(maps.every((map) => validateMapDefinition(map).isValid)).toBe(true);
  });

  it("exposes Skirmish as a map definition that creates a game state", () => {
    const skirmish = getBuiltInMap("skirmish-12x8");

    expect(skirmish).toMatchObject({ id: "skirmish-12x8", name: "Skirmish 12×8" });
    expect(skirmish).toBeDefined();
    if (!skirmish) throw new Error("Skirmish map is missing.");
    expect(createGameStateFromMap(skirmish)).toMatchObject({
      scenarioId: "skirmish-12x8",
      board: { width: 12, height: 8 },
    });
  });
});
