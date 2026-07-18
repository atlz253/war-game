import { describe, expect, it } from "vitest";

import {
  calculateAnchoredScroll,
  calculateNextZoom,
  INITIAL_MAP_ZOOM,
  MAX_MAP_ZOOM,
  MIN_MAP_ZOOM,
  WHEEL_ZOOM_STEP,
} from "./camera-zoom";

const INITIAL_ZOOM = 1;
const CAMERA_SCROLL_X = 400;
const CAMERA_SCROLL_Y = 200;
const POINTER_X = 600;
const POINTER_Y = 300;
const WHEEL_NOTCH_DELTA = 100;
const ZOOMED_OUT_VALUE = 0.9;

describe("calculateNextZoom", () => {
  it("starts the map at the widest supported view", () => {
    expect(INITIAL_MAP_ZOOM).toBe(MIN_MAP_ZOOM);
  });

  it("zooms out by a wheel step without passing the minimum", () => {
    expect(calculateNextZoom(INITIAL_ZOOM, WHEEL_NOTCH_DELTA)).toBeCloseTo(ZOOMED_OUT_VALUE);
    expect(calculateNextZoom(MIN_MAP_ZOOM, WHEEL_NOTCH_DELTA)).toBe(MIN_MAP_ZOOM);
  });

  it("zooms in by a wheel step without passing the maximum", () => {
    expect(calculateNextZoom(ZOOMED_OUT_VALUE, -WHEEL_NOTCH_DELTA)).toBeCloseTo(INITIAL_ZOOM);
    expect(calculateNextZoom(MAX_MAP_ZOOM, -WHEEL_NOTCH_DELTA)).toBe(MAX_MAP_ZOOM);
  });
});

describe("calculateAnchoredScroll", () => {
  it("keeps the world point below the cursor stable after zooming", () => {
    const nextZoom = INITIAL_ZOOM - WHEEL_ZOOM_STEP * WHEEL_NOTCH_DELTA;
    const nextScroll = calculateAnchoredScroll({
      scrollX: CAMERA_SCROLL_X,
      scrollY: CAMERA_SCROLL_Y,
      pointerX: POINTER_X,
      pointerY: POINTER_Y,
      previousZoom: INITIAL_ZOOM,
      nextZoom,
    });

    expect(nextScroll.x + POINTER_X / nextZoom).toBeCloseTo(CAMERA_SCROLL_X + POINTER_X);
    expect(nextScroll.y + POINTER_Y / nextZoom).toBeCloseTo(CAMERA_SCROLL_Y + POINTER_Y);
  });
});
