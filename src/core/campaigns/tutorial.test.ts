import { expect, it } from "vitest";
import { findPath } from "../pathfinding/find-path";
import { getBuiltInMaps } from "../scenarios/built-in-maps";
import { getPathMovementCost } from "../terrain/terrain-rules";
import { getBuiltInCampaigns } from "./built-in-campaigns";
import { createMissionState, validateCampaignReadiness } from "./validation";

it("ships a ready tutorial requiring movement renewal for either infantry", () => {
  const maps = getBuiltInMaps();
  const tutorial = getBuiltInCampaigns()[0];
  expect(tutorial).toBeDefined();
  if (!tutorial) throw new Error("Tutorial missing");
  expect(validateCampaignReadiness(tutorial, maps)).toEqual([]);
  const mission = tutorial.missions[0];
  const map = maps.find((item) => item.id === mission?.builtInMapId);
  if (!mission || !map || mission.conditions.type !== "standard-match-or-reach-cell")
    throw new Error("Tutorial invalid");
  const state = createMissionState(mission, map);
  expect(Object.values(state.units)).toHaveLength(2);
  for (const unit of Object.values(state.units)) {
    const path = findPath(
      state.board,
      state.units,
      unit.id,
      unit.position,
      mission.conditions.cell,
    );
    expect(path).not.toBeNull();
    expect(getPathMovementCost(state.board, path ?? [])).toBeGreaterThan(unit.maxMovementPoints);
  }
});
