import Phaser from "phaser";
import { MenuBattleController } from "../../ai/menu-battle-controller";
import { createMenuBattle, MENU_BATTLE_CONFIG } from "../../core/menu-battle/menu-battle";
import type { GameState } from "../../core/model/game-state";
import { BattleMapRenderer } from "../board/BattleMapRenderer";
import { menuBattleFocus, menuBattleLayout } from "../menu/menu-battle-layout";
import { MENU_BATTLE_SCENE_KEY } from "../menu/menu-battle-lifecycle";
import { MenuBattleRunner } from "../presentation/menu-battle-runner";
import { getMovementSettings, movementDuration } from "../presentation/movement-settings";
import { menuBattleUi } from "../ui/theme/menu-battle-ui";

export class MenuBackgroundBattleScene extends Phaser.Scene {
  private runner?: MenuBattleRunner;
  private boardRenderer?: BattleMapRenderer;
  private menuActive = false;
  private displayedState?: GameState;
  public constructor() {
    super(MENU_BATTLE_SCENE_KEY);
  }
  public create(): void {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    const controller = new MenuBattleController(createMenuBattle(seed));
    this.displayedState = controller.state;
    const world = this.add.container();
    this.boardRenderer = new BattleMapRenderer(this, world, {
      boardOriginX: 0,
      boardOriginY: 0,
      tileSize: menuBattleUi.tileSize,
      initialZoom: 1,
      ambient: true,
    });
    this.resize();
    this.boardRenderer.createTerrain(controller.state);
    this.boardRenderer.renderState(controller.state);
    const renderer = this.boardRenderer;
    this.runner = new MenuBattleRunner(
      controller,
      {
        render: (state) => {
          renderer.renderState(state);
          this.displayedState = state;
          this.resize();
        },
        position: (id, position) => renderer.setMovementPosition(id, position),
        clear: () => renderer.clearMovementPositions(),
        settled: () => {},
      },
      () => movementDuration(getMovementSettings().load()),
    );
    this.input.enabled = false;
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    document.addEventListener("visibilitychange", this.visibilityChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.synchronize();
  }
  public setMenuActive(active: boolean): void {
    this.menuActive = active;
    this.synchronize();
  }
  public update(_time: number, delta: number): void {
    this.runner?.update(delta);
  }
  private visibilityChanged = (): void => {
    this.synchronize();
  };
  private synchronize(): void {
    this.scene.setVisible(this.menuActive);
    this.runner?.setActive(this.menuActive && !document.hidden);
  }
  private resize(): void {
    const config = this.runner?.controller.state.menuBattle?.config;
    // The initial factory and scene always use the same named default configuration.
    const layout = menuBattleLayout(
      this.scale.width,
      this.scale.height,
      config ?? MENU_BATTLE_CONFIG,
      this.displayedState ? menuBattleFocus(this.displayedState) : undefined,
    );
    const camera = this.cameras.main;
    camera.setViewport(0, 0, this.scale.width, this.scale.height).setZoom(layout.zoom);
    // Phaser zooms around viewport center, so convert the desired visible top-left to scroll.
    camera.setScroll(
      layout.left - (camera.width - camera.width / layout.zoom) / 2,
      layout.top - (camera.height - camera.height / layout.zoom) / 2,
    );
    this.boardRenderer?.updateHealthLabelScales(layout.zoom);
  }
  private shutdown(): void {
    this.runner?.dispose();
    this.runner = undefined;
    this.boardRenderer?.reset();
    this.boardRenderer = undefined;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    document.removeEventListener("visibilitychange", this.visibilityChanged);
  }
}
