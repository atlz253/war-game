import Phaser from "phaser";

import { createGameConfig } from "./game/config/game-config";
import { BattleScene } from "./game/scenes/BattleScene";
import { BootScene } from "./game/scenes/BootScene";
import { LmStudioSettingsScene } from "./game/scenes/LmStudioSettingsScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { MapEditorScene } from "./game/scenes/MapEditorScene";
import { MultiplayerHostScene } from "./game/scenes/MultiplayerHostScene";
import { MultiplayerJoinScene } from "./game/scenes/MultiplayerJoinScene";
import { ReplayLibraryScene } from "./game/scenes/ReplayLibraryScene";
import { ReplayScene } from "./game/scenes/ReplayScene";
import { ResultScene } from "./game/scenes/ResultScene";
import "./style.css";

const canvasConfig = createGameConfig();

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: canvasConfig.parent,
  width: canvasConfig.width,
  height: canvasConfig.height,
  pixelArt: canvasConfig.pixelArt,
  roundPixels: canvasConfig.roundPixels,
  backgroundColor: canvasConfig.backgroundColor,
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [
    BootScene,
    MainMenuScene,
    MultiplayerHostScene,
    MultiplayerJoinScene,
    MapEditorScene,
    LmStudioSettingsScene,
    BattleScene,
    ResultScene,
    ReplayLibraryScene,
    ReplayScene,
  ],
};

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  window.__AI_WAR_GAME__ = game;
}
