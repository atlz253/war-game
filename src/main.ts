import Phaser from "phaser";

import { createGameConfig } from "./game/config/game-config";
import { BattleScene } from "./game/scenes/BattleScene";
import { BootScene } from "./game/scenes/BootScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { ResultScene } from "./game/scenes/ResultScene";

const canvasConfig = createGameConfig();

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: canvasConfig.parent,
  width: canvasConfig.width,
  height: canvasConfig.height,
  pixelArt: canvasConfig.pixelArt,
  roundPixels: canvasConfig.roundPixels,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MainMenuScene, BattleScene, ResultScene],
};

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  window.__AI_WAR_GAME__ = game;
}
