import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));

import { createReplayTimeline } from "../../core/replay/replay-timeline";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { MovementPresenter } from "../presentation/MovementPresenter";
import { getReplayDelay } from "../replays/replay-playback";
import { ReplayScene } from "./ReplayScene";

function fixture() {
  const scene = new ReplayScene();
  const state = scene as unknown as {
    timeline: ReturnType<typeof createReplayTimeline>;
    frameIndex: number;
    speed: number;
    isPlaying: boolean;
    presenter: MovementPresenter;
    statusText: { setText: ReturnType<typeof vi.fn> };
    playButton: { setLabel: ReturnType<typeof vi.fn> };
    showFrame: (index: number) => void;
    elapsedPlaybackMs: number;
    pausePlayback: () => void;
    togglePlayback: () => void;
    update: (time: number, delta: number) => void;
  };
  state.timeline = createReplayTimeline(createSkirmishGameState, [
    { type: "move", unitId: "blue-infantry-1", destination: { x: DESTINATION_X, y: 1 } },
  ]);
  state.statusText = { setText: vi.fn() };
  state.playButton = { setLabel: vi.fn() };
  Object.assign(state, {
    pauseMenu: { isOpen: false },
    updateKeyboardCamera: vi.fn(),
    updateInertialZoom: vi.fn(),
  });
  const render = vi.fn();
  state.presenter = new MovementPresenter(
    {
      render,
      position: vi.fn(),
      clear: vi.fn(),
      settled: () => {
        state.elapsedPlaybackMs = 0;
      },
    },
    () => CELL_DURATION_MS / state.speed,
  );
  return { state, render };
}
const CELL_DURATION_MS = 200;
const COMPLETE_MOVEMENT_DELTA_MS = 10000;
const PARTIAL_MOVEMENT_DELTA_MS = 50;
const DESTINATION_X = 3;
const DOUBLE_PLAYBACK_SPEED = 2;

describe("replay movement integration", () => {
  it("waits for completion and a fresh inter-action interval without catching up", () => {
    const { state } = fixture();
    state.timeline = createReplayTimeline(createSkirmishGameState, [
      { type: "move", unitId: "blue-infantry-1", destination: { x: DESTINATION_X, y: 1 } },
      { type: "end-turn" },
    ]);
    state.isPlaying = true;
    state.showFrame(1);
    state.showFrame(DOUBLE_PLAYBACK_SPEED);
    expect(state.frameIndex).toBe(1);
    state.update(0, COMPLETE_MOVEMENT_DELTA_MS);
    expect(state.frameIndex).toBe(1);
    expect(state.elapsedPlaybackMs).toBe(0);
    state.update(0, getReplayDelay(1) - 1);
    expect(state.frameIndex).toBe(1);
    state.update(0, 1);
    expect(state.frameIndex).toBe(DOUBLE_PLAYBACK_SPEED);
    expect(state.isPlaying).toBe(false);
  });
  it("playback pause freezes movement and play resumes from the same progress", () => {
    const { state } = fixture();
    state.isPlaying = true;
    state.showFrame(1);
    state.presenter.update(PARTIAL_MOVEMENT_DELTA_MS);
    state.pausePlayback();
    state.presenter.update(COMPLETE_MOVEMENT_DELTA_MS);
    expect(state.presenter.busy).toBe(true);
    state.togglePlayback();
    state.presenter.update(COMPLETE_MOVEMENT_DELTA_MS);
    expect(state.presenter.busy).toBe(false);
  });
  it("animates forward with 2x duration and finishes before stopping final playback", () => {
    const { state } = fixture();
    state.speed = DOUBLE_PLAYBACK_SPEED;
    state.isPlaying = true;
    state.showFrame(1);
    expect(state.presenter.busy).toBe(true);
    expect(state.isPlaying).toBe(true);
    state.presenter.update(COMPLETE_MOVEMENT_DELTA_MS);
    expect(state.presenter.busy).toBe(false);
    expect(state.isPlaying).toBe(false);
    expect(state.elapsedPlaybackMs).toBe(0);
  });
  it("seeks immediately and cancels pending completions", () => {
    const { state, render } = fixture();
    state.showFrame(1);
    state.presenter.update(PARTIAL_MOVEMENT_DELTA_MS);
    state.showFrame(0);
    expect(state.presenter.busy).toBe(false);
    expect(render).toHaveBeenLastCalledWith(state.timeline.frames[0]?.state);
    const calls = state.statusText.setText.mock.calls.length;
    state.presenter.update(COMPLETE_MOVEMENT_DELTA_MS);
    expect(state.statusText.setText).toHaveBeenCalledTimes(calls);
  });
});
