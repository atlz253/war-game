import { describe, expect, it } from "vitest";

import { calculateWorldViewportWidth } from "./battle-presentation";
import { calculateCameraCenterLimits } from "./camera-presentation";

const CANVAS_WIDTH = 2560;
const HUD_WIDTH = 704;
const SCALE = 0.5;
const WORLD_VIEWPORT_WIDTH = 2208;
const BOARD_WIDTH = 6144;
const BOARD_HEIGHT = 4096;
const SMALL_VIEWPORT_WIDTH = 1024;
const LARGE_VIEWPORT_WIDTH = 8192;
const LARGE_VIEWPORT_HEIGHT = 8192;
const BOARD_LEFT = 0;
const BOARD_TOP = 56;
const SMALL_VIEWPORT_HEIGHT = 768;
const REQUESTED_CENTER_X = 10000;
const REQUESTED_CENTER_Y = -10000;
const EXPECTED_CENTER_X = 5632;
const EXPECTED_CENTER_Y = 2104;

describe("battle presentation", () => {
  it("reserves the right-aligned HUD width for the world camera", () => {
    expect(calculateWorldViewportWidth(CANVAS_WIDTH, HUD_WIDTH, SCALE)).toBe(WORLD_VIEWPORT_WIDTH);
  });

  it("locks both axes at the board centre when the board fits", () => {
    expect(
      calculateCameraCenterLimits({
        requestedCenterX: REQUESTED_CENTER_X,
        requestedCenterY: REQUESTED_CENTER_Y,
        boardLeft: BOARD_LEFT,
        boardTop: BOARD_TOP,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        visibleWidth: LARGE_VIEWPORT_WIDTH,
        visibleHeight: LARGE_VIEWPORT_HEIGHT,
      }),
    ).toEqual({
      centerX: 3072,
      centerY: EXPECTED_CENTER_Y,
      canPanHorizontally: false,
      canPanVertically: false,
    });
  });

  it("clamps only the axis where the board exceeds the viewport", () => {
    expect(
      calculateCameraCenterLimits({
        requestedCenterX: REQUESTED_CENTER_X,
        requestedCenterY: REQUESTED_CENTER_Y,
        boardLeft: BOARD_LEFT,
        boardTop: BOARD_TOP,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        visibleWidth: SMALL_VIEWPORT_WIDTH,
        visibleHeight: LARGE_VIEWPORT_HEIGHT,
      }),
    ).toEqual({
      centerX: EXPECTED_CENTER_X,
      centerY: EXPECTED_CENTER_Y,
      canPanHorizontally: true,
      canPanVertically: false,
    });
  });

  it("clamps both axes when the board exceeds both viewport dimensions", () => {
    expect(
      calculateCameraCenterLimits({
        requestedCenterX: REQUESTED_CENTER_X,
        requestedCenterY: REQUESTED_CENTER_Y,
        boardLeft: BOARD_LEFT,
        boardTop: BOARD_TOP,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        visibleWidth: SMALL_VIEWPORT_WIDTH,
        visibleHeight: SMALL_VIEWPORT_HEIGHT,
      }),
    ).toEqual({
      centerX: EXPECTED_CENTER_X,
      centerY: 440,
      canPanHorizontally: true,
      canPanVertically: true,
    });
  });
});
