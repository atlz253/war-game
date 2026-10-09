import { describe, expect, it } from "vitest";
import { createGameStateFromMap, isMapReadyForMatch } from "../maps/map-definition";
import { applyAction } from "../rules/apply-action";
import { campaign, map, mission } from "./test-fixtures";
import {
  createMissionState,
  validateCampaignReadiness,
  validateMissionReadiness,
} from "./validation";

it("rejects unnamed or unidentified mission snapshots independently of the campaign", () => {
  expect(validateMissionReadiness({ ...mission, id: "", name: "" }, [map]).join()).toContain(
    "mission.id",
  );
  expect(() => createMissionState({ ...mission, name: "" }, map)).toThrow("mission.name");
});

describe("mission readiness", () => {
  it("rejects permanently disconnected terrain routes while ignoring temporary occupancy", () => {
    const wall = Array.from({ length: map.height }, (_, y) => ({
      type: "mountain" as const,
      position: { x: 2, y },
    }));
    const blocked = {
      ...map,
      units: [{ side: "blue" as const, type: "tank" as const, position: { x: 0, y: 1 } }],
      terrain: wall,
    };
    expect(validateCampaignReadiness(campaign, [blocked]).join()).toContain("unreachable");
    const occupiedGoal = {
      ...map,
      units: [
        ...map.units,
        { side: "red" as const, type: "infantry" as const, position: { x: 11, y: 2 } },
      ],
    };
    expect(validateCampaignReadiness(campaign, [occupiedGoal])).toEqual([]);
  });
  it("reports invalid event IDs, line content, turns and map bindings", () => {
    const event = {
      id: "same",
      type: "dialogue" as const,
      trigger: { type: "turn" as const, number: 0 },
      lines: [{ speaker: "", text: "" }],
    };
    const invalid = {
      ...mission,
      events: [
        event,
        event,
        {
          ...event,
          id: "binding",
          trigger: {
            type: "unit-selected" as const,
            unit: { type: "specific" as const, unitId: "missing" },
            mapBinding: "old",
          },
        },
      ],
    };
    const errors = validateCampaignReadiness({ ...campaign, missions: [invalid] }, [map]);
    for (const field of [
      "events[0].lines[0]",
      "events[0].trigger.number",
      "events[1].id",
      "events[2].trigger.mapBinding",
      "events[2].trigger.unit",
    ])
      expect(errors.join()).toContain(field);
  });
  it("allows opponent-free objectives but preserves standalone readiness", () => {
    expect(validateCampaignReadiness(campaign, [map])).toEqual([]);
    expect(isMapReadyForMatch(map)).toBe(false);
    expect(createMissionState(mission, map).winner).toBeNull();
    expect(createGameStateFromMap(map).victoryPolicy).toEqual({ type: "standard-match" });
  });
  it("identifies invalid bindings and references by mission path", () => {
    const invalid = { ...mission, conditions: { ...mission.conditions, mapBinding: "old" } };
    expect(validateCampaignReadiness({ ...campaign, missions: [invalid] }, [map]).join()).toContain(
      "missions[0].conditions",
    );
    expect(validateCampaignReadiness(campaign, []).join()).toContain("builtInMapId");
    expect(
      validateCampaignReadiness({ ...campaign, missions: [mission, mission] }, [map]).join(),
    ).toContain("id");
  });
  it("rejects Red objectives, out-of-bounds and impassable goals", () => {
    const tankMap = {
      ...map,
      units: [{ side: "blue" as const, type: "tank" as const, position: { x: 0, y: 1 } }],
      terrain: [{ type: "mountain" as const, position: { x: 11, y: 2 } }],
    };
    expect(validateCampaignReadiness(campaign, [tankMap]).join()).toContain("unreachable");
    const specific = {
      ...mission,
      conditions: {
        type: "standard-match-or-reach-cell" as const,
        unit: { type: "specific" as const, unitId: "red-infantry-1" },
        cell: { x: 12, y: 2 },
        mapBinding: map.id,
      },
    };
    expect(
      validateCampaignReadiness({ ...campaign, missions: [specific] }, [map]).length,
    ).toBeGreaterThan(0);
  });
});
describe("reach-cell action rules", () => {
  it("wins only on exact accepted eligible destination and rejects subsequent actions", () => {
    const closeMission = {
      ...mission,
      conditions: { ...mission.conditions, cell: { x: 2, y: 1 } },
    };
    const state = createMissionState(closeMission, map);
    const rejected = applyAction(state, {
      type: "move",
      unitId: "blue-infantry-1",
      destination: { x: 11, y: 2 },
    });
    expect(rejected.accepted).toBe(false);
    const crossed = applyAction(state, {
      type: "move",
      unitId: "blue-infantry-1",
      destination: { x: 3, y: 1 },
    });
    expect(crossed.state.winner).toBeNull();
    const won = applyAction(state, {
      type: "move",
      unitId: "blue-infantry-1",
      destination: { x: 2, y: 1 },
    });
    expect(won.state.winner).toBe("blue");
    expect(won.events.map((e) => e.type)).toEqual(["unit-moved", "victory-achieved"]);
    expect(won.state.scores).toEqual(state.scores);
    expect(applyAction(won.state, { type: "end-turn" }).accepted).toBe(false);
  });
  it("does not win for initial occupancy or the wrong specific unit", () => {
    const specific = {
      ...mission,
      conditions: {
        type: "standard-match-or-reach-cell" as const,
        unit: { type: "specific" as const, unitId: "blue-infantry-2" },
        cell: { x: 0, y: 3 },
        mapBinding: map.id,
      },
    };
    const state = createMissionState(specific, map);
    expect(state.winner).toBeNull();
    const destination = { x: 1, y: 1 };
    const different = createMissionState(
      { ...specific, conditions: { ...specific.conditions, cell: destination } },
      map,
    );
    expect(
      applyAction(different, { type: "move", unitId: "blue-infantry-1", destination }).state.winner,
    ).toBeNull();
  });
});
