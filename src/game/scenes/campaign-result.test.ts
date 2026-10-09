import { expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Scale: { Events: { RESIZE: "resize" } },
    Scenes: { Events: { SHUTDOWN: "shutdown" } },
    Input: {
      Events: {
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
        POINTER_DOWN: "pointerdown",
      },
    },
  },
}));

import { campaign, map, mission } from "../../core/campaigns/test-fixtures";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { startRun } from "../campaigns/playthrough";
import { ResultScene } from "./ResultScene";

it.each(["blue", "red"] as const)("offers the correct campaign continuation for %s", (winner) => {
  const run = startRun({ ...campaign, missions: [mission, { ...mission, id: "second" }] }, [map]);
  const fixture = canvasFixture();
  const scene = new ResultScene();
  Object.assign(scene, fixture.props);
  scene.create({ winner, turn: 1, campaignRun: run });
  const root = (scene as unknown as { presentationContainer: Parameters<typeof fixture.click>[0] })
    .presentationContainer;
  fixture.click(root, winner === "blue" ? "NEXT MISSION" : "RETRY");
  expect(fixture.start).toHaveBeenCalledWith(
    "battle",
    expect.objectContaining({
      campaignRun: expect.objectContaining({ index: winner === "blue" ? 1 : 0 }),
      initialState: expect.objectContaining({ winner: null, turn: 1 }),
    }),
  );
});
it("keeps standalone Play Again and disables nonexistent final missions", () => {
  const fixture = canvasFixture();
  const scene = new ResultScene();
  Object.assign(scene, fixture.props);
  scene.create({ winner: "blue", turn: 1 });
  let root = (scene as unknown as { presentationContainer: Parameters<typeof fixture.click>[0] })
    .presentationContainer;
  fixture.click(root, "PLAY AGAIN");
  expect(fixture.start).toHaveBeenCalledWith(
    "battle",
    expect.not.objectContaining({ campaignRun: expect.anything() }),
  );
  fixture.start.mockClear();
  scene.create({ winner: "blue", turn: 1, campaignRun: startRun(campaign, [map]) });
  root = (scene as unknown as { presentationContainer: Parameters<typeof fixture.click>[0] })
    .presentationContainer;
  fixture.click(root, "COMPLETE");
  expect(fixture.start).not.toHaveBeenCalled();
  expect(fixture.descendants(root).some((item) => item.text === "CAMPAIGN COMPLETE")).toBe(true);
});
