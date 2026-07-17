import Phaser from "phaser";

import { createGameConfig } from "./game/config/game-config";
import { BootScene } from "./game/scenes/BootScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";

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
  scene: [BootScene, MainMenuScene],
};

new Phaser.Game(gameConfig);
