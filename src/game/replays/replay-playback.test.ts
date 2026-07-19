import { describe, expect, it } from "vitest";

import {
  getNextReplayFrameIndex,
  getPreviousReplayFrameIndex,
  getReplayDelay,
} from "./replay-playback";

const FIRST_FRAME = 0;
const SECOND_FRAME = 1;
const LAST_FRAME = 2;
const FRAME_COUNT = 3;
const NORMAL_SPEED = 1;
const DOUBLE_SPEED = 2;
const NORMAL_DELAY = 800;
const DOUBLE_DELAY = 400;

describe("replay playback helpers", () => {
  it("clamps navigation to the first and last frame", () => {
    expect(getPreviousReplayFrameIndex(FIRST_FRAME)).toBe(FIRST_FRAME);
    expect(getNextReplayFrameIndex(FIRST_FRAME, FRAME_COUNT)).toBe(SECOND_FRAME);
    expect(getNextReplayFrameIndex(LAST_FRAME, FRAME_COUNT)).toBe(LAST_FRAME);
  });

  it("uses a shorter delay at 2× playback speed", () => {
    expect(getReplayDelay(NORMAL_SPEED)).toBe(NORMAL_DELAY);
    expect(getReplayDelay(DOUBLE_SPEED)).toBe(DOUBLE_DELAY);
  });
});
