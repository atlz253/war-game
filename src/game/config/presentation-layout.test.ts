import { describe, expect, it } from "vitest";

import {
  calculatePresentationViewport,
  calculateRightAlignedContentX,
} from "./presentation-layout";

const FULL_HD_WIDTH = 1920;
const FULL_HD_HEIGHT = 1080;
const SHORT_VIEWPORT_HEIGHT = 1000;
const ULTRAWIDE_WIDTH = 2560;
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;
const LOGICAL_CANVAS_WIDTH = 3840;
const LOGICAL_CANVAS_HEIGHT = 2160;
const FULL_HD_SCALE = 0.5;
const SHORT_VIEWPORT_SCALE = SHORT_VIEWPORT_HEIGHT / LOGICAL_CANVAS_HEIGHT;
const ULTRAWIDE_SCALE = FULL_HD_SCALE;
const PORTRAIT_SCALE = PORTRAIT_WIDTH / LOGICAL_CANVAS_WIDTH;
const ULTRAWIDE_CONTENT_X = 320;
const SHORT_VIEWPORT_CONTENT_X = 71;
const PORTRAIT_CONTENT_Y = 656;
const HUD_RIGHT_EDGE = 3808;

describe("calculatePresentationViewport", () => {
  it("uses the entire Canvas on a 16:9 viewport", () => {
    expect(calculatePresentationViewport(FULL_HD_WIDTH, FULL_HD_HEIGHT)).toEqual({
      x: 0,
      y: 0,
      width: FULL_HD_WIDTH,
      height: FULL_HD_HEIGHT,
      scale: FULL_HD_SCALE,
      contentX: 0,
      contentY: 0,
    });
  });

  it("uses the entire Canvas on an ultrawide viewport", () => {
    expect(calculatePresentationViewport(ULTRAWIDE_WIDTH, FULL_HD_HEIGHT)).toEqual({
      x: 0,
      y: 0,
      width: ULTRAWIDE_WIDTH,
      height: FULL_HD_HEIGHT,
      scale: ULTRAWIDE_SCALE,
      contentX: ULTRAWIDE_CONTENT_X,
      contentY: 0,
    });
  });

  it("scales presentation content to fit a shorter viewport", () => {
    expect(calculatePresentationViewport(FULL_HD_WIDTH, SHORT_VIEWPORT_HEIGHT)).toEqual({
      x: 0,
      y: 0,
      width: FULL_HD_WIDTH,
      height: SHORT_VIEWPORT_HEIGHT,
      scale: SHORT_VIEWPORT_SCALE,
      contentX: SHORT_VIEWPORT_CONTENT_X,
      contentY: 0,
    });
  });

  it("uses the entire Canvas on a portrait viewport", () => {
    expect(calculatePresentationViewport(PORTRAIT_WIDTH, PORTRAIT_HEIGHT)).toEqual({
      x: 0,
      y: 0,
      width: PORTRAIT_WIDTH,
      height: PORTRAIT_HEIGHT,
      scale: PORTRAIT_SCALE,
      contentX: 0,
      contentY: PORTRAIT_CONTENT_Y,
    });
  });
});

describe("calculateRightAlignedContentX", () => {
  it("places a scaled content edge exactly at the Canvas right edge", () => {
    const viewport = calculatePresentationViewport(ULTRAWIDE_WIDTH, FULL_HD_HEIGHT);

    const contentX = calculateRightAlignedContentX(viewport, HUD_RIGHT_EDGE);

    expect(contentX + HUD_RIGHT_EDGE * viewport.scale).toBe(ULTRAWIDE_WIDTH);
  });
});
