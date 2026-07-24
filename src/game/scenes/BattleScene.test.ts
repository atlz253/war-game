import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
  },
}));

import { BattleScene } from "./BattleScene";

describe("BattleScene", () => {
  it("forgets the previous pause menu before a scene instance starts another match", () => {
    const scene = new BattleScene();
    const stalePauseMenu = {};
    const sceneState = scene as unknown as {
      pauseMenu?: typeof stalePauseMenu;
      resetRenderingState: () => void;
    };

    sceneState.pauseMenu = stalePauseMenu;
    sceneState.resetRenderingState();

    expect(sceneState.pauseMenu).toBeUndefined();
  });
});
