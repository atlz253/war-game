import Phaser from "phaser";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { getBrowserLmStudioSettings } from "../lm-studio/lm-studio-settings";
import { t } from "../localization/runtime";
import { getBrowserMapCatalog } from "../maps/map-catalog";
import {
  createDefaultMatchConfiguration,
  withLmStudioSettings,
} from "../match/match-configuration";
import {
  MAIN_MENU_ENTRIES,
  type MainMenuSceneData,
  type MenuView,
  menuReturnData,
  menuView,
} from "../menu/menu-navigation";
import { QuickMatchView } from "../menu/QuickMatchView";
import { Button } from "../ui/components/Button";
import { MovementSlider } from "../ui/components/MovementSlider";
import { menuUi as ui } from "../ui/theme/menu-ui";
import { uiTheme } from "../ui/theme/ui-theme";
import {
  CAMPAIGN_LIBRARY_SCENE_KEY,
  LANGUAGE_SCENE_KEY,
  LM_STUDIO_SETTINGS_SCENE_KEY,
  MAIN_MENU_SCENE_KEY,
  MAP_EDITOR_SCENE_KEY,
  MULTIPLAYER_HOST_SCENE_KEY,
  MULTIPLAYER_JOIN_SCENE_KEY,
  REPLAY_LIBRARY_SCENE_KEY,
} from "./scene-keys";

const CENTER_ORIGIN = 0.5;

export class MainMenuScene extends Phaser.Scene {
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private menuData: MainMenuSceneData = {};
  private quickMatch?: QuickMatchView;
  private movementSlider?: MovementSlider;

  public constructor() {
    super(MAIN_MENU_SCENE_KEY);
  }

  public create(data: MainMenuSceneData = {}): void {
    const settings = getBrowserLmStudioSettings().load();
    this.menuData = {
      ...data,
      matchConfiguration: withLmStudioSettings(
        data.matchConfiguration ?? createDefaultMatchConfiguration(settings),
        settings,
      ),
    };
    this.quickMatch = undefined;
    this.movementSlider = undefined;
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    this.presentationContainer = this.add.container(0, 0).setScrollFactor(0);
    this.showView(menuView(data));
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private showView(view: MenuView): void {
    this.releaseView();
    this.menuData = menuReturnData(this.menuData, view);
    this.presentationContainer.removeAll(true);
    const titleKey =
      view === "main"
        ? "main-menu.ai.war.game"
        : (MAIN_MENU_ENTRIES.find((entry) => entry.view === view)?.label ??
          "main-menu.ai.war.game");
    const panel = this.add
      .rectangle(ui.centerX, ui.panelY, ui.panelWidth, ui.panelHeight, uiTheme.colors.panel)
      .setStrokeStyle(ui.borderWidth, uiTheme.colors.panelBorder);
    this.presentationContainer.add([panel, this.text(titleKey, ui.titleY, uiTheme.font.titleSize)]);
    if (view === "main") this.buildRoot();
    if (view === "quick-match") {
      this.quickMatch = new QuickMatchView(this, this.menuData);
      this.presentationContainer.add(this.quickMatch.children);
    }
    if (view === "multiplayer") this.buildMultiplayer();
    if (view === "settings") this.buildSettings();
    if (view !== "main") this.button("common.back", ui.backY, () => this.showView("main"));
    this.updatePresentationViewport();
  }

  private buildRoot(): void {
    MAIN_MENU_ENTRIES.forEach((entry, index) => {
      this.button(entry.label, ui.rootFirstY + index * ui.rootRowGap, () => {
        if (entry.view) this.showView(entry.view);
        else if (entry.id === "map-editor") this.openMapEditor();
        else
          this.scene.start(
            entry.id === "campaigns" ? CAMPAIGN_LIBRARY_SCENE_KEY : REPLAY_LIBRARY_SCENE_KEY,
          );
      });
    });
  }

  private buildMultiplayer(): void {
    const open = (key: string) =>
      this.scene.start(key, { returnMenu: menuReturnData(this.menuData, "multiplayer") });
    this.button("main-menu.host.p2p", ui.multiplayerHostY, () => open(MULTIPLAYER_HOST_SCENE_KEY));
    this.button("main-menu.join.p2p", ui.multiplayerJoinY, () => open(MULTIPLAYER_JOIN_SCENE_KEY));
  }

  private buildSettings(): void {
    this.presentationContainer.add(this.text("main-menu.movement.settings", ui.movementTitleY));
    this.movementSlider = new MovementSlider(this, ui.centerX, ui.sliderY);
    this.presentationContainer.add(this.movementSlider.container);
    const open = (key: string) => this.scene.start(key, menuReturnData(this.menuData, "settings"));
    this.button("lm-studio-settings.lm.studio.settings", ui.lmStudioY, () =>
      open(LM_STUDIO_SETTINGS_SCENE_KEY),
    );
    this.button("language.title", ui.languageY, () => open(LANGUAGE_SCENE_KEY));
  }

  private button(key: string, y: number, onClick: () => void): void {
    this.presentationContainer.add(
      new Button(this, {
        x: ui.centerX,
        y,
        width: ui.buttonWidth,
        height: ui.buttonHeight,
        label: t(key),
        onClick,
      }).container,
    );
  }

  private text(
    key: string,
    y: number,
    size: number = uiTheme.font.normalSize,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(ui.centerX, y, t(key), {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${size}px`,
        wordWrap: { width: ui.instructionsWidth, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(CENTER_ORIGIN);
  }

  private openMapEditor(): void {
    const maps = getBrowserMapCatalog().list();
    const selected =
      maps.find((entry) => `${entry.source}:${entry.map.id}` === this.menuData.selectedMapKey) ??
      maps[0];
    this.scene.start(MAP_EDITOR_SCENE_KEY, {
      mapId: selected?.map.id,
      mapSource: selected?.source,
      matchConfiguration: this.menuData.matchConfiguration,
    });
  }

  private releaseView(): void {
    if (this.quickMatch) this.menuData = { ...this.menuData, ...this.quickMatch.data };
    this.quickMatch = undefined;
    this.movementSlider?.blur();
    this.movementSlider?.container.destroy();
    this.movementSlider = undefined;
  }

  private updatePresentationViewport(): void {
    const viewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.cameras.main
      .setViewport(0, 0, this.scale.width, this.scale.height)
      .setScroll(0, 0)
      .setZoom(1);
    this.safeAreaBackground.setPosition(0, 0).setSize(viewport.width, viewport.height);
    this.presentationContainer
      .setPosition(viewport.contentX, viewport.contentY)
      .setScale(viewport.scale);
  }

  private shutdown(): void {
    this.releaseView();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
