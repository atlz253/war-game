import { describe, expect, it } from "vitest";

import { createMapDefinition } from "../../core/maps/map-definition";
import { MapCatalog } from "./map-catalog";

const MAP_SIZE = 4;
const BUILT_IN_MAP = createMapDefinition("shared-id", "Built-in", MAP_SIZE, MAP_SIZE);
const LOCAL_MAP = createMapDefinition("shared-id", "Local", MAP_SIZE, MAP_SIZE);

describe("MapCatalog", () => {
  it("keeps built-in and local maps distinct when ids collide", () => {
    const catalog = new MapCatalog({ list: () => [LOCAL_MAP] }, () => [BUILT_IN_MAP]);

    expect(catalog.list()).toEqual([
      { source: "built-in", map: BUILT_IN_MAP },
      { source: "local", map: LOCAL_MAP },
    ]);
    expect(catalog.get("built-in", "shared-id")?.map.name).toBe("Built-in");
    expect(catalog.get("local", "shared-id")?.map.name).toBe("Local");
  });

  it("checks names only within the selected source", () => {
    const catalog = new MapCatalog({ list: () => [LOCAL_MAP] }, () => [BUILT_IN_MAP]);

    expect(catalog.isNameAvailable("built-in", "new", "Local")).toBe(true);
    expect(catalog.isNameAvailable("local", "new", "Local")).toBe(false);
  });
});
