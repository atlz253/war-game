import { describe, expect, it } from "vitest";

import { calculatePresentationViewport } from "./presentation-layout";

const FULL_HD_WIDTH = 1920;
const FULL_HD_HEIGHT = 1080;
const LOGICAL_CANVAS_WIDTH = 3840;
const ULTRAWIDE_WIDTH = 2560;
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;
const ULTRAWIDE_SIDE_FIELD_WIDTH = 320;
const PORTRAIT_TOP_FIELD_HEIGHT = 656;
const PORTRAIT_SAFE_HEIGHT = 608;
const PORTRAIT_SCALE = PORTRAIT_WIDTH / LOGICAL_CANVAS_WIDTH;

describe("calculatePresentationViewport", () => {
  it("uses the entire Canvas on a 16:9 viewport", () => {
    expect(calculatePresentationViewport(FULL_HD_WIDTH, FULL_HD_HEIGHT)).toEqual({
      x: 0,
      y: 0,
      width: FULL_HD_WIDTH,
      height: FULL_HD_HEIGHT,
      scale: 0.5,
    });
  });

  it("centres a 16:9 safe area inside a wider Canvas", () => {
    expect(calculatePresentationViewport(ULTRAWIDE_WIDTH, FULL_HD_HEIGHT)).toEqual({
      x: ULTRAWIDE_SIDE_FIELD_WIDTH,
      y: 0,
      width: FULL_HD_WIDTH,
      height: FULL_HD_HEIGHT,
      scale: 0.5,
    });
  });

  it("centres a 16:9 safe area inside a taller Canvas", () => {
    expect(calculatePresentationViewport(PORTRAIT_WIDTH, PORTRAIT_HEIGHT)).toEqual({
      x: 0,
      y: PORTRAIT_TOP_FIELD_HEIGHT,
      width: PORTRAIT_WIDTH,
      height: PORTRAIT_SAFE_HEIGHT,
      scale: PORTRAIT_SCALE,
    });
  });
});
