import { expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));

import { campaign, map, mission } from "../../core/campaigns/test-fixtures";
import { createMissionState } from "../../core/campaigns/validation";
import { MissionDialogueController } from "../campaigns/dialogue-controller";
import { getMovementSettings } from "../presentation/movement-settings";
import { BattleScene } from "./BattleScene";

it("resumes paused movement while its queued dialogue continues to block orders", () => {
  const scene = new BattleScene();
  const lesson = {
    ...mission,
    events: [
      {
        id: "move",
        type: "dialogue" as const,
        trigger: {
          type: "unit-moved" as const,
          unit: { type: "any" as const },
          mapBinding: map.id,
        },
        lines: [{ speaker: "Teacher", text: "After animation" }],
      },
    ],
  };
  const narrative = new MissionDialogueController(lesson, vi.fn());
  const harness = scene as unknown as {
    pauseMenu: { isOpen: boolean };
    presenter: { update(delta: number): void };
    createPresenter(): void;
    applyAcceptedAction(
      action: { type: "move"; unitId: string; destination: { x: number; y: number } },
      publish: boolean,
    ): void;
    openPauseMenu(): void;
    resumeFromPause(): void;
    canHumanIssueOrders(): boolean;
  };
  Object.assign(scene, {
    narrative,
    gameState: createMissionState(lesson, map),
    displayedState: createMissionState(lesson, map),
    matchConfiguration: { blue: "human", red: "heuristic-ai" },
    checkForResult: () => false,
    scene: { isActive: () => true },
    updateHud: vi.fn(),
    stopCameraMotion: vi.fn(),
    renderGameState: vi.fn(),
    mapRenderer: { setMovementPosition: vi.fn(), clearMovementPositions: vi.fn() },
    pauseMenu: {
      isOpen: false,
      open: () => {
        harness.pauseMenu.isOpen = true;
      },
      close: () => {
        harness.pauseMenu.isOpen = false;
      },
    },
  });
  getMovementSettings().save(0);
  harness.createPresenter();
  harness.applyAcceptedAction(
    { type: "move", unitId: "blue-infantry-1", destination: { x: 2, y: 1 } },
    false,
  );
  expect(narrative.current).toBeUndefined();
  expect(narrative.blocked).toBe(true);
  harness.openPauseMenu();
  harness.resumeFromPause();
  const FINISH_MS = 10000;
  harness.presenter.update(FINISH_MS);
  expect(narrative.current?.text).toBe("After animation");
  expect(harness.canHumanIssueOrders()).toBe(false);
});

it("queues winning movement narrative before results, and records normal empty Red end-turn", () => {
  const scene = new BattleScene();
  const goalMission = {
    ...mission,
    conditions: {
      type: "standard-match-or-reach-cell" as const,
      unit: { type: "any" as const },
      mapBinding: map.id,
      cell: { x: 2, y: 1 },
    },
    events: [
      {
        id: "end",
        type: "dialogue" as const,
        trigger: { type: "mission-end" as const },
        lines: [{ speaker: "Teacher", text: "Finished" }],
      },
    ],
  };
  const result = vi.fn(() => false);
  const narrative = new MissionDialogueController(goalMission, () => result());
  const harness = scene as unknown as {
    gameState: ReturnType<typeof createMissionState>;
    replayActions: unknown[];
    applyAcceptedAction(
      a:
        | { type: "end-turn" }
        | { type: "move"; unitId: string; destination: { x: number; y: number } },
      publish: boolean,
    ): void;
    createPresenter(): void;
    startAiTurnIfNeeded(): void;
  };
  Object.assign(scene, {
    campaignRun: { campaign, maps: [map], index: 0 },
    narrative,
    gameState: createMissionState(goalMission, map),
    displayedState: createMissionState(goalMission, map),
    matchConfiguration: { blue: "human", red: "heuristic-ai" },
    checkForResult: result,
    scene: { isActive: () => true },
    updateHud: vi.fn(),
    renderGameState: vi.fn(),
    mapRenderer: { setMovementPosition: vi.fn(), clearMovementPositions: vi.fn() },
  });
  const INSTANT = 100;
  getMovementSettings().save(INSTANT);
  harness.createPresenter();
  harness.applyAcceptedAction({ type: "end-turn" }, false);
  expect(harness.gameState.activeSide).toBe("blue");
  expect(harness.replayActions).toHaveLength(2);
  harness.applyAcceptedAction(
    { type: "move", unitId: "blue-infantry-1", destination: { x: 2, y: 1 } },
    false,
  );
  expect(narrative.current?.text).toBe("Finished");
});
