import Phaser from "phaser";

import { createGameConfig } from "./game/config/game-config";
import { installMenuBattle } from "./game/menu/install-menu-battle";
import { BattleScene } from "./game/scenes/BattleScene";
import { BootScene } from "./game/scenes/BootScene";
import { CampaignEditorScene } from "./game/scenes/CampaignEditorScene";
import { CampaignLibraryScene } from "./game/scenes/CampaignLibraryScene";
import { LanguageScene } from "./game/scenes/LanguageScene";
import { LmStudioSettingsScene } from "./game/scenes/LmStudioSettingsScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { MapEditorScene } from "./game/scenes/MapEditorScene";
import { MenuBackgroundBattleScene } from "./game/scenes/MenuBackgroundBattleScene";
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
  callbacks: { postBoot: installMenuBattle },
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [
    BootScene,
    MenuBackgroundBattleScene,
    MainMenuScene,
    LanguageScene,
    CampaignLibraryScene,
    CampaignEditorScene,
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
