import { describe, expect, it } from "vitest";

import {
  createGameConfig,
  GAME_CANVAS_HEIGHT,
  GAME_CANVAS_PARENT,
  GAME_CANVAS_WIDTH,
} from "./game-config";

describe("createGameConfig", () => {
  it("creates the fixed pixel-art Canvas configuration", () => {
    const config = createGameConfig();

    expect(config.parent).toBe(GAME_CANVAS_PARENT);
    expect(config.width).toBe(GAME_CANVAS_WIDTH);
    expect(config.height).toBe(GAME_CANVAS_HEIGHT);
    expect(config.pixelArt).toBe(true);
    expect(config.roundPixels).toBe(true);
    expect(config.scale).toMatchObject({
      mode: "FIT",
      autoCenter: "CENTER_BOTH",
    });
  });
});
