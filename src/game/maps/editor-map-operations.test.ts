import { describe, expect, it } from "vitest";

import { createMapDefinition } from "../../core/maps/map-definition";
import {
  applyEditorTool,
  getEditorToolRejection,
  wouldTrimPlacements,
} from "./editor-map-operations";

const WIDTH = 4;
const HEIGHT = 3;

describe("editor map operations", () => {
  it("replaces units on a cell but preserves a control point underneath", () => {
    const map = {
      ...createMapDefinition("map", "Map", WIDTH, HEIGHT),
      controlPoints: [{ owner: null, position: { x: 1, y: 1 } }],
    };

    const result = applyEditorTool(
      map,
      { kind: "unit", side: "blue", unitType: "infantry" },
      { x: 1, y: 1 },
    );

    expect(result.units).toHaveLength(1);
    expect(result.controlPoints).toEqual(map.controlPoints);
  });

  it("erases both editable layers and detects a shrinking resize", () => {
    const map = {
      ...createMapDefinition("map", "Map", WIDTH, HEIGHT),
      units: [{ side: "red" as const, type: "tank" as const, position: { x: 3, y: 2 } }],
      controlPoints: [{ owner: null, position: { x: 3, y: 2 } }],
    };

    expect(wouldTrimPlacements(map, WIDTH - 1, HEIGHT - 1)).toBe(true);
    expect(applyEditorTool(map, { kind: "erase" }, { x: 3, y: 2 })).toEqual({
      ...map,
      units: [],
      controlPoints: [],
      terrain: [],
    });
  });

  it("places mountains for infantry but rejects mountain and control point conflicts", () => {
    const position = { x: 1, y: 1 };
    const infantryMap = {
      ...createMapDefinition("map", "Map", WIDTH, HEIGHT),
      units: [{ side: "blue" as const, type: "infantry" as const, position }],
    };
    const mountainTool = { kind: "terrain" as const, terrainType: "mountain" as const };
    const mountainMap = applyEditorTool(infantryMap, mountainTool, position);

    expect(mountainMap.terrain).toEqual([{ type: "mountain", position }]);
    expect(
      getEditorToolRejection(mountainMap, { kind: "control-point", owner: null }, position),
    ).toBe("control-point-on-mountain");
    expect(
      getEditorToolRejection(
        { ...mountainMap, units: [{ side: "red" as const, type: "tank" as const, position }] },
        mountainTool,
        position,
      ),
    ).toBe("mountain-on-tank");
    expect(
      getEditorToolRejection(
        { ...mountainMap, units: [{ side: "red" as const, type: "artillery" as const, position }] },
        mountainTool,
        position,
      ),
    ).toBe("mountain-on-artillery");
    expect(
      getEditorToolRejection(
        mountainMap,
        { kind: "unit", side: "blue", unitType: "artillery" },
        position,
      ),
    ).toBe("artillery-on-mountain");
  });
});
