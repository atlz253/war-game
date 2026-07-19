import { describe, expect, it } from "vitest";

import { createMapDefinition } from "../../core/maps/map-definition";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import { createRecordedMatch, serializeRecordedMatch } from "./recorded-match";
import { BrowserReplayLibrary } from "./replay-library";

const MAP = {
  ...createMapDefinition("replay-map", "Replay map", 2, 1),
  units: [
    { side: "blue" as const, type: "tank" as const, position: { x: 0, y: 0 } },
    { side: "red" as const, type: "infantry" as const, position: { x: 1, y: 0 } },
  ],
};

function createReplay(id = "replay", name = "Blue victory") {
  return createRecordedMatch({
    id,
    name,
    savedAt: "2026-07-19T12:00:00.000Z",
    mapDefinition: MAP,
    matchConfiguration: createDefaultMatchConfiguration(),
    actions: [
      { type: "attack", unitId: "blue-tank-1", targetUnitId: "red-infantry-1" },
      { type: "end-turn" },
      { type: "end-turn" },
      { type: "attack", unitId: "blue-tank-1", targetUnitId: "red-infantry-1" },
    ],
  });
}

describe("BrowserReplayLibrary", () => {
  it("saves, loads, deletes, imports and exports completed replays", () => {
    const library = new BrowserReplayLibrary(new MemoryStorage());
    const replay = createReplay();

    library.save(replay);
    expect(library.get(replay.id)).toEqual(replay);
    expect(library.export(replay.id)).toBe(serializeRecordedMatch(replay));

    const imported = library.import(serializeRecordedMatch(replay));
    expect(imported.id).toBe("replay-2");
    expect(imported.name).toBe("Blue victory 2");

    library.delete(replay.id);
    expect(library.list()).toEqual([imported]);
  });
});

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
