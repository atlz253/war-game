import type Phaser from "phaser";
import type { MenuBackgroundBattleScene } from "../scenes/MenuBackgroundBattleScene";
import { configureMenuBackdrop } from "./menu-backdrop";
import {
  MENU_BATTLE_FOREGROUNDS,
  MENU_BATTLE_SCENE_KEY,
  MenuBattleLifecycle,
} from "./menu-battle-lifecycle";

/** Game owns the coordinator; the background scene owns the retained simulation. */
export function installMenuBattle(game: Phaser.Game): void {
  const lifecycle = new MenuBattleLifecycle();
  const scenes = game.scene.scenes;
  const coordinate = (keys: readonly string[]) => {
    const state = lifecycle.reconcile(keys);
    if (state.start) game.scene.run(MENU_BATTLE_SCENE_KEY);
    if (!game.scene.isActive(MENU_BATTLE_SCENE_KEY)) return;
    const background = game.scene.getScene(MENU_BATTLE_SCENE_KEY) as MenuBackgroundBattleScene;
    background.setMenuActive(state.active);
    game.scene.sendToBack(MENU_BATTLE_SCENE_KEY);
  };
  const created = (scene: Phaser.Scene) => {
    const key = scene.sys.settings.key;
    if (key === MENU_BATTLE_SCENE_KEY) return;
    if (MENU_BATTLE_FOREGROUNDS.includes(key)) configureMenuBackdrop(scene);
    coordinate([key]);
  };
  for (const scene of scenes) scene.events.on("create", created);
  const reconcile = () =>
    coordinate(game.scene.getScenes(true).map((scene) => scene.sys.settings.key));
  game.events.on("prestep", reconcile);
  game.events.once("destroy", () => {
    game.events.off("prestep", reconcile);
    for (const scene of scenes) scene.events.off("create", created);
  });
}
