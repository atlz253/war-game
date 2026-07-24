import { describe, expect, it } from "vitest";

import { ASSET_FRAME_SIZE } from "../assets/asset-manifest";
import {
  calculateBackgroundTileStep,
  calculateWorldBackgroundBounds,
  WORLD_BACKGROUND_BRIGHTNESS_TINT,
} from "./world-background";

const BACKGROUND_SCALE = 2;
const SCALED_BACKGROUND_TILE_SIZE = ASSET_FRAME_SIZE * BACKGROUND_SCALE;
const TWENTY_PERCENT_BRIGHTNESS_TINT = 0x222222;

describe("calculateWorldBackgroundBounds", () => {
  it("uses a 20 percent brightness tint", () => {
    expect(WORLD_BACKGROUND_BRIGHTNESS_TINT).toBe(TWENTY_PERCENT_BRIGHTNESS_TINT);
  });

  it("uses double-sized background tiles", () => {
    expect(calculateBackgroundTileStep(ASSET_FRAME_SIZE, ASSET_FRAME_SIZE)).toEqual({
      width: SCALED_BACKGROUND_TILE_SIZE,
      height: SCALED_BACKGROUND_TILE_SIZE,
    });
  });

  it("covers the entire visible camera area around a small board", () => {
    expect(
      calculateWorldBackgroundBounds({
        boardLeft: 0,
        boardTop: 56,
        boardWidth: 512,
        boardHeight: 512,
        visibleWidth: 2048,
        visibleHeight: 1536,
      }),
    ).toEqual({ x: 256, y: 312, width: 2048, height: 1536 });
  });

  it("covers a large board without allocating an extra viewport margin", () => {
    expect(
      calculateWorldBackgroundBounds({
        boardLeft: 128,
        boardTop: 256,
        boardWidth: 6144,
        boardHeight: 4096,
        visibleWidth: 1024,
        visibleHeight: 768,
      }),
    ).toEqual({ x: 3200, y: 2304, width: 6144, height: 4096 });
  });
});
