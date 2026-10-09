import { expect, it } from "vitest";
import { campaign, map, mission } from "../../core/campaigns/test-fixtures";
import { advanceRun, launchMission, startRun } from "./playthrough";

it("snapshots all maps and definitions, retries fresh and advances only on victory", () => {
  const authored = { ...campaign, missions: [mission, { ...mission, id: "second" }] };
  const run = startRun(authored, [map]);
  expect(advanceRun(run, "red").index).toBe(0);
  const next = advanceRun(run, "blue");
  expect(next.index).toBe(1);
  expect(advanceRun(next, "blue").complete).toBe(true);
  expect(run.campaign).not.toBe(authored);
  const first = launchMission(run);
  const retry = launchMission(run);
  expect(first.initialState).toEqual(retry.initialState);
  expect(first.initialState).not.toBe(retry.initialState);
  expect(first.matchConfiguration).toMatchObject({ blue: "human", red: "heuristic-ai" });
});
