import { describe, expect, it } from "vitest";

import { createMapDefinition, serializeMapDefinition } from "../../core/maps/map-definition";
import { BrowserMapLibrary, type StorageLike } from "./map-library";

const MAP_ID = "map";
const MAP_NAME = "My Map";
const WIDTH = 8;
const HEIGHT = 6;

describe("BrowserMapLibrary", () => {
  it("saves, loads, copies and deletes local maps", () => {
    const library = new BrowserMapLibrary(new MemoryStorage());
    const map = createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT);

    library.save(map);
    const copy = library.copy(map.id);

    expect(library.list().map((item) => item.name)).toEqual([MAP_NAME, `${MAP_NAME} Copy`]);
    expect(copy.id).not.toBe(map.id);

    library.delete(map.id);
    expect(library.list()).toEqual([copy]);
  });

  it("imports a map as a unique local record when identifiers or names collide", () => {
    const library = new BrowserMapLibrary(new MemoryStorage());
    const map = createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT);

    library.save(map);
    const imported = library.import(serializeMapDefinition(map));

    expect(imported.id).toBe("map-2");
    expect(imported.name).toBe("My Map 2");
    expect(library.list()).toHaveLength(2);
  });

  it("reports whether a map name is available without conflicting with another map", () => {
    const library = new BrowserMapLibrary(new MemoryStorage());
    const map = createMapDefinition(MAP_ID, MAP_NAME, WIDTH, HEIGHT);
    const otherMap = createMapDefinition("other", "Other Map", WIDTH, HEIGHT);

    library.save(map);
    library.save(otherMap);

    expect(library.isNameAvailable(map.id, MAP_NAME)).toBe(true);
    expect(library.isNameAvailable(map.id, otherMap.name)).toBe(false);
    expect(library.isNameAvailable(map.id, "   ")).toBe(false);
  });
});

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
