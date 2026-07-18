import { describe, expect, it } from "vitest";

import {
  createGameConfig,
  GAME_CANVAS_BACKGROUND_COLOR,
  GAME_CANVAS_HEIGHT,
  GAME_CANVAS_PARENT,
  GAME_CANVAS_WIDTH,
} from "./game-config";

const EXPECTED_CANVAS_WIDTH = 3840;
const EXPECTED_CANVAS_HEIGHT = 2160;

describe("createGameConfig", () => {
  it("creates the fixed pixel-art Canvas configuration", () => {
    const config = createGameConfig();

    expect(config.parent).toBe(GAME_CANVAS_PARENT);
    expect(config.width).toBe(GAME_CANVAS_WIDTH);
    expect(config.height).toBe(GAME_CANVAS_HEIGHT);
    expect(GAME_CANVAS_WIDTH).toBe(EXPECTED_CANVAS_WIDTH);
    expect(GAME_CANVAS_HEIGHT).toBe(EXPECTED_CANVAS_HEIGHT);
    expect(config.pixelArt).toBe(true);
    expect(config.roundPixels).toBe(true);
    expect(config.scale).toMatchObject({
      mode: "RESIZE",
    });
    expect(config.backgroundColor).toBe(GAME_CANVAS_BACKGROUND_COLOR);
  });
});
