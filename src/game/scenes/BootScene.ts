import Phaser from "phaser";

import { assetManifest } from "../assets/asset-manifest";
import { BATTLE_SCENE_KEY, MAIN_MENU_SCENE_KEY } from "./scene-keys";

const DEBUG_SCENE_PARAMETER = "scene";
const DEBUG_BATTLE_SCENE_VALUE = "battle";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("boot");
  }

  public preload(): void {
    for (const definition of Object.values(assetManifest.terrain)) {
      this.load.image(definition.textureKey, definition.path);
    }

    for (const definition of Object.values(assetManifest.units)) {
      this.load.image(definition.textureKey, definition.path);
    }
  }

  public create(): void {
    const requestedScene = new URLSearchParams(window.location.search).get(DEBUG_SCENE_PARAMETER);
    const sceneKey =
      import.meta.env.DEV && requestedScene === DEBUG_BATTLE_SCENE_VALUE
        ? BATTLE_SCENE_KEY
        : MAIN_MENU_SCENE_KEY;

    this.scene.start(sceneKey);
  }
}
