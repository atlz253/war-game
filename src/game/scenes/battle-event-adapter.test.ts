import { expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));

import type { GameAction } from "../../core/actions/game-actions";
import type { DialogueEvent } from "../../core/campaigns/definition";
import { initialSignals } from "../../core/campaigns/signals";
import { createMissionState } from "../../core/campaigns/validation";
import { getBuiltInMap } from "../../core/scenarios/built-in-maps";
import { MissionDialogueController } from "../campaigns/dialogue-controller";
import { getMovementSettings } from "../presentation/movement-settings";
import { BattleScene } from "./BattleScene";

function eventBattle() {
  const map = getBuiltInMap("skirmish-12x8");
  if (!map) throw new Error("Missing skirmish");
  const trigger = (id: string, trigger: DialogueEvent["trigger"]): DialogueEvent => ({
    id,
    type: "dialogue",
    trigger,
    lines: [{ speaker: "A", text: id }],
  });
  const mission = {
    id: "m",
    name: "Mission",
    builtInMapId: map.id,
    conditions: {
      type: "standard-match-or-reach-cell" as const,
      unit: { type: "any" as const },
      cell: { x: 3, y: 1 },
      mapBinding: map.id,
    },
    events: [
      trigger("start", { type: "mission-start" }),
      trigger("turn", { type: "turn", number: 2 }),
      trigger("select", { type: "unit-selected", unit: { type: "any" }, mapBinding: map.id }),
      trigger("arrive", {
        type: "unit-arrived",
        unit: { type: "any" },
        cell: { x: 9, y: 1 },
        mapBinding: map.id,
      }),
      trigger("move", { type: "unit-moved", unit: { type: "any" }, mapBinding: map.id }),
      trigger("end", { type: "mission-end" }),
    ],
  };
  const scene = new BattleScene();
  const narrative = new MissionDialogueController(mission, vi.fn());
  const harness = scene as unknown as {
    createPresenter(): void;
    handleBoardClick(p: { x: number; y: number }): void;
    applyAcceptedAction(a: GameAction, publish: boolean): void;
    replayActions: GameAction[];
    gameState: ReturnType<typeof createMissionState>;
  };
  Object.assign(scene, {
    narrative,
    gameState: createMissionState(mission, map),
    displayedState: createMissionState(mission, map),
    matchConfiguration: { blue: "human", red: "heuristic-ai" },
    checkForResult: () => false,
    startAiTurnIfNeeded: vi.fn(),
    scene: { isActive: () => true },
    updateHud: vi.fn(),
    renderGameState: vi.fn(),
    toBoardPosition: (p: unknown) => p,
    cameras: { main: { getWorldPoint: (x: number, y: number) => ({ x, y }) } },
    mapRenderer: { setMovementPosition: vi.fn(), clearMovementPositions: vi.fn() },
  });
  const INSTANT_MOVEMENT = 100;
  getMovementSettings().save(INSTANT_MOVEMENT);
  harness.createPresenter();
  for (const signal of initialSignals(harness.gameState)) narrative.signal(signal, 0);
  narrative.present();
  return { harness, narrative };
}

it("wires all six triggers through startup, human selection and shared accepted actions", () => {
  const { harness, narrative } = eventBattle();
  harness.handleBoardClick({ x: 1, y: 1 });
  expect(narrative.journal.occurrences.map((o) => o.eventId)).toEqual(["start"]);
  narrative.next();
  harness.handleBoardClick({ x: 1, y: 1 });
  narrative.next();
  harness.handleBoardClick({ x: 1, y: 1 });
  expect(harness.replayActions).toEqual([]);
  harness.applyAcceptedAction({ type: "end-turn" }, false);
  expect(narrative.current?.text).toBe("turn");
  narrative.next();
  harness.applyAcceptedAction(
    { type: "move", unitId: "missing", destination: { x: 9, y: 1 } },
    false,
  );
  expect(narrative.blocked).toBe(false);
  harness.applyAcceptedAction(
    { type: "move", unitId: "red-infantry-1", destination: { x: 9, y: 1 } },
    false,
  );
  expect(narrative.current?.text).toBe("arrive");
  narrative.next();
  expect(narrative.current?.text).toBe("move");
  narrative.next();
  harness.applyAcceptedAction({ type: "end-turn" }, false);
  harness.applyAcceptedAction(
    { type: "move", unitId: "blue-infantry-1", destination: { x: 3, y: 1 } },
    false,
  );
  expect(harness.gameState.winner).toBe("blue");
  expect(narrative.current?.text).toBe("end");
  expect(narrative.journal.occurrences.map((o) => o.eventId)).toEqual([
    "start",
    "select",
    "turn",
    "arrive",
    "move",
    "end",
  ]);
});
