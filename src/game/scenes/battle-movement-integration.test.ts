import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));

import type { GameAction } from "../../core/actions/game-actions";
import type { GameState } from "../../core/model/game-state";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import type { MovementPresenter } from "../presentation/MovementPresenter";
import { getMovementSettings } from "../presentation/movement-settings";
import { BattleScene } from "./BattleScene";

const MOVE: GameAction = { type: "move", unitId: "blue-infantry-1", destination: { x: 3, y: 1 } };
const INSTANT_SPEED = 100;
const PARTIAL_DELTA_MS = 50;
const COMPLETION_DELTA_MS = 10000;
interface BattleHarness {
  gameState: GameState;
  displayedState: GameState;
  presenter: MovementPresenter;
  replayActions: GameAction[];
  inputLocked: boolean;
  disconnected: boolean;
  pauseMenu: { isOpen: boolean; close: () => void; open: () => void };
  matchConfiguration: { blue: string; red: string };
  aiDelayEvent?: unknown;
  mapRenderer: {
    setMovementPosition: ReturnType<typeof vi.fn>;
    clearMovementPositions: ReturnType<typeof vi.fn>;
  };
  createPresenter(): void;
  applyAcceptedAction(action: GameAction, publish: boolean): void;
  canHumanIssueOrders(): boolean;
  startAiTurnIfNeeded(): void;
  runAiAction(): void;
  applyRemoteSnapshot(sequence: number, state: GameState): void;
  openPauseMenu(): void;
  resumeFromPause(): void;
  exitToMainMenu(): void;
  applyAiDecision(decision: { action: GameAction; usedFallback: boolean }): void;
  eventLog: { entries: readonly string[] };
  selectedUnitId: string | null;
}
function fixture() {
  const scene = new BattleScene() as unknown as BattleHarness;
  let displayedSelection: string | null = null;
  const render = vi.fn((_: GameState, next: GameState) => {
    scene.displayedState = next;
    displayedSelection = scene.selectedUnitId;
  });
  const delayedCall = vi.fn(() => ({ remove: vi.fn() }));
  Object.assign(scene, {
    gameState: createSkirmishGameState(),
    matchConfiguration: { blue: "human", red: "human" },
    renderGameState: render,
    checkForResult: () => false,
    updateHud: vi.fn(),
    stopCameraMotion: vi.fn(),
    scene: { isActive: () => true, start: vi.fn() },
    time: { delayedCall },
    pauseMenu: {
      isOpen: false,
      open: () => {
        scene.pauseMenu.isOpen = true;
      },
      close: () => {
        scene.pauseMenu.isOpen = false;
      },
    },
    mapRenderer: { setMovementPosition: vi.fn(), clearMovementPositions: vi.fn() },
  });
  getMovementSettings().save(0);
  scene.displayedState = scene.gameState;
  scene.createPresenter();
  return { scene, render, delayedCall, selection: () => displayedSelection };
}
describe("battle accepted movement", () => {
  it("commits and records once while the display follows later; rejection never animates", () => {
    const { scene } = fixture();
    const initial = scene.gameState;
    scene.applyAcceptedAction(MOVE, false);
    expect(scene.gameState.units["blue-infantry-1"]?.position).toEqual({ x: 3, y: 1 });
    expect(scene.displayedState).toBe(initial);
    expect(scene.replayActions).toEqual([MOVE]);
    expect(scene.canHumanIssueOrders()).toBe(false);
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.displayedState).toBe(scene.gameState);
    expect(scene.canHumanIssueOrders()).toBe(true);
    scene.applyAcceptedAction({ ...MOVE, destination: { x: -1, y: -1 } } as GameAction, false);
    expect(scene.replayActions).toEqual([MOVE]);
    expect(scene.presenter.busy).toBe(false);
  });
  it("keeps accepted network actions in display order and resynchronizes immediately", () => {
    const { scene } = fixture();
    scene.applyAcceptedAction(MOVE, false);
    scene.applyAcceptedAction({ type: "end-turn" }, false);
    expect(scene.gameState.activeSide).toBe("red");
    expect(scene.displayedState.activeSide).toBe("blue");
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.displayedState).toBe(scene.gameState);
    scene.applyAcceptedAction({ type: "end-turn" }, false);
    scene.applyAcceptedAction(
      { type: "move", unitId: "blue-infantry-1", destination: { x: 4, y: 1 } },
      false,
    );
    expect(scene.presenter.busy).toBe(true);
    const snapshot = createSkirmishGameState();
    scene.applyRemoteSnapshot(1, snapshot);
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.displayedState).toBe(snapshot);
    expect(scene.presenter.busy).toBe(false);
  });
  it("freezes the current step and uses a changed setting only for the next movement", () => {
    const { scene } = fixture();
    scene.applyAcceptedAction(MOVE, false);
    scene.presenter.update(PARTIAL_DELTA_MS);
    const calls = scene.mapRenderer.setMovementPosition.mock.calls.length;
    scene.openPauseMenu();
    getMovementSettings().save(INSTANT_SPEED);
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.mapRenderer.setMovementPosition).toHaveBeenCalledTimes(calls);
    scene.resumeFromPause();
    expect(scene.presenter.busy).toBe(true);
    scene.presenter.update(COMPLETION_DELTA_MS);
    scene.applyAcceptedAction({ type: "end-turn" }, false);
    scene.applyAcceptedAction({ type: "end-turn" }, false);
    scene.applyAcceptedAction(
      { type: "move", unitId: "blue-infantry-1", destination: { x: 4, y: 1 } },
      false,
    );
    expect(scene.gameState.units["blue-infantry-1"]?.position).toEqual({ x: 4, y: 1 });
    expect(scene.presenter.busy).toBe(false);
  });
});
describe("battle scheduling and overlapping locks", () => {
  it("removes the visible selection when a presented turn ends", () => {
    const { scene, selection } = fixture();
    scene.selectedUnitId = "blue-infantry-1";
    scene.applyAcceptedAction({ type: "end-turn" }, false);
    expect(scene.selectedUnitId).toBeNull();
    expect(selection()).toBeNull();
  });
  it("records AI movement and retains visible LM Studio fallback", () => {
    const { scene } = fixture();
    scene.matchConfiguration.blue = "lm-studio-ai";
    scene.applyAiDecision({ action: MOVE, usedFallback: true });
    expect(scene.replayActions).toEqual([MOVE]);
    expect(scene.presenter.busy).toBe(true);
    expect(scene.eventLog.entries.some((entry) => entry.includes("Heuristic AI order used"))).toBe(
      true,
    );
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.displayedState).toBe(scene.gameState);
  });
  it("cancels exit during movement without scheduling stale AI work", () => {
    const { scene, delayedCall } = fixture();
    scene.matchConfiguration.blue = "heuristic-ai";
    scene.applyAiDecision({ action: MOVE, usedFallback: false });
    scene.exitToMainMenu();
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.presenter.busy).toBe(false);
    expect(delayedCall).not.toHaveBeenCalled();
  });
  it("starts one AI delay after presentation and never duplicates an existing delay", () => {
    const { scene, delayedCall } = fixture();
    scene.matchConfiguration.blue = "heuristic-ai";
    scene.applyAcceptedAction(MOVE, false);
    scene.startAiTurnIfNeeded();
    expect(delayedCall).not.toHaveBeenCalled();
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(delayedCall).toHaveBeenCalledTimes(1);
    scene.startAiTurnIfNeeded();
    expect(delayedCall).toHaveBeenCalledTimes(1);
    expect(scene.canHumanIssueOrders()).toBe(false);
  });
  it("retains disconnect and ownership locks after movement completes", () => {
    const { scene } = fixture();
    Object.assign(scene, { multiplayerSession: { role: "client", localSide: "red" } });
    scene.applyAcceptedAction(MOVE, false);
    scene.disconnected = true;
    scene.presenter.update(COMPLETION_DELTA_MS);
    expect(scene.inputLocked).toBe(true);
    expect(scene.canHumanIssueOrders()).toBe(false);
  });
});
