import { expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));
const saved = vi.hoisted(() => vi.fn());
vi.mock("../replays/replay-library", () => ({ getBrowserReplayLibrary: () => ({ save: saved }) }));

import type { GameAction } from "../../core/actions/game-actions";
import type { MissionDefinition } from "../../core/campaigns/definition";
import { createMissionState } from "../../core/campaigns/validation";
import { createMapDefinition } from "../../core/maps/map-definition";
import { MissionDialogueController } from "../campaigns/dialogue-controller";
import { startRun } from "../campaigns/playthrough";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import { getMovementSettings } from "../presentation/movement-settings";
import { BattleScene } from "./BattleScene";

const DUEL_WIDTH = 4;
const DUEL_HEIGHT = 2;
const MAP = {
  ...createMapDefinition("duel", "Duel", DUEL_WIDTH, DUEL_HEIGHT),
  units: [
    { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 0 } },
    { side: "red" as const, type: "tank" as const, position: { x: 1, y: 0 } },
  ],
};
const MISSION: MissionDefinition = {
  id: "duel",
  name: "Duel",
  builtInMapId: MAP.id,
  conditions: { type: "standard-match" },
  events: [
    {
      id: "ending",
      type: "dialogue",
      trigger: { type: "mission-end" },
      lines: [{ speaker: "Commander", text: "The battle is over." }],
    },
  ],
};
function battle() {
  const scene = new BattleScene();
  const start = vi.fn();
  const harness = scene as unknown as {
    createPresenter(): void;
    applyAcceptedAction(action: GameAction, publish: boolean): void;
    checkForResult(): boolean;
    exitToMainMenu(): void;
    gameState: ReturnType<typeof createMissionState>;
  };
  const controller = new MissionDialogueController(MISSION, () => harness.checkForResult());
  Object.assign(scene, {
    gameState: createMissionState(MISSION, MAP),
    displayedState: createMissionState(MISSION, MAP),
    campaignRun: startRun({ schemaVersion: 1, id: "c", name: "C", missions: [MISSION] }, [MAP]),
    narrative: controller,
    matchConfiguration: createDefaultMatchConfiguration(),
    mapDefinition: MAP,
    replayMapDefinition: MAP,
    renderGameState: vi.fn(),
    updateHud: vi.fn(),
    scene: { start, isActive: () => true },
    time: { delayedCall: () => ({ remove: vi.fn() }) },
    mapRenderer: { clearMovementPositions: vi.fn(), setMovementPosition: vi.fn() },
  });
  getMovementSettings().save(0);
  harness.createPresenter();
  return { harness, controller, start };
}
it("defers defeat saving/navigation until ending dialogue and transitions once", () => {
  saved.mockClear();
  const { harness, controller, start } = battle();
  const attack: GameAction = {
    type: "attack",
    unitId: "red-tank-1",
    targetUnitId: "blue-infantry-1",
  };
  const MAX_DUEL_ROUNDS = 4;
  harness.applyAcceptedAction({ type: "end-turn" }, false);
  for (let round = 0; round < MAX_DUEL_ROUNDS && !harness.gameState.winner; round++) {
    harness.applyAcceptedAction(attack, false);
    if (harness.gameState.winner) break;
    harness.applyAcceptedAction({ type: "end-turn" }, false);
    harness.applyAcceptedAction({ type: "end-turn" }, false);
  }
  expect(harness.gameState.winner).toBe("red");
  expect(controller.current?.text).toBe("The battle is over.");
  expect(saved).not.toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();
  controller.next();
  harness.checkForResult();
  expect(saved).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledWith(
    "result",
    expect.objectContaining({ winner: "red", campaignRun: expect.any(Object) }),
  );
});
it("disposes dialogue continuation on manual exit and never emits mission-end", () => {
  saved.mockClear();
  const { harness, controller, start } = battle();
  harness.exitToMainMenu();
  controller.next();
  expect(controller.journal.occurrences).toEqual([]);
  expect(saved).not.toHaveBeenCalled();
  expect(start).toHaveBeenCalledTimes(1);
  expect(harness.checkForResult()).toBe(false);
});
