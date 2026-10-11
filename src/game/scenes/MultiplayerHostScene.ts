import Phaser from "phaser";
import { createGameStateFromMap } from "../../core/maps/map-definition";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { t } from "../localization/runtime";
import { type CatalogMap, formatCatalogMap, getBrowserMapCatalog } from "../maps/map-catalog";
import type { MainMenuSceneData, MultiplayerMenuData } from "../menu/menu-navigation";
import { MultiplayerSession } from "../multiplayer/multiplayer-session";
import { Button } from "../ui/components/Button";
import { uiTheme } from "../ui/theme/ui-theme";
import { BATTLE_SCENE_KEY, MAIN_MENU_SCENE_KEY } from "./scene-keys";

const CENTER_X = 1920;
const TITLE_Y = 480;
const CODE_Y = 780;
const STATUS_Y = 980;
const MAP_Y = 1220;
const BUTTON_Y = 1560;
const BUTTON_WIDTH = 640;
const BUTTON_HEIGHT = 128;
const PREVIOUS_X = 1200;
const NEXT_X = 2640;
const START_X = CENTER_X;
const BACK_X = 600;
const CENTER = 0.5;

export class MultiplayerHostScene extends Phaser.Scene {
  private readonly session = new MultiplayerSession("host");
  private readonly mapCatalog = getBrowserMapCatalog();
  private selectedMapKey: string | null = null;
  private codeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private startButton!: Button;
  private peerConnected = false;
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private transferringToBattle = false;
  private returnMenu?: MainMenuSceneData;

  public constructor() {
    super("multiplayer-host");
  }
  public create(data: MultiplayerMenuData = {}): void {
    this.returnMenu = data.returnMenu;
    this.transferringToBattle = false;
    this.peerConnected = false;
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    const title = this.add
      .text(
        CENTER_X,
        TITLE_Y,
        t("multiplayer-host.host.multiplayer.blue"),
        textStyle(uiTheme.font.titleSize),
      )
      .setOrigin(CENTER);
    this.codeText = this.add
      .text(
        CENTER_X,
        CODE_Y,
        t("multiplayer-host.creating.room"),
        textStyle(uiTheme.font.titleSize),
      )
      .setOrigin(CENTER);
    this.statusText = this.add
      .text(CENTER_X, STATUS_Y, t("common.connecting"), textStyle(uiTheme.font.normalSize))
      .setOrigin(CENTER);
    this.mapText = this.add
      .text(CENTER_X, MAP_Y, "", textStyle(uiTheme.font.normalSize))
      .setOrigin(CENTER);
    const previous = new Button(this, {
      x: PREVIOUS_X,
      y: MAP_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("campaign-editor.map"),
      onClick: () => this.changeMap(-1),
    });
    const next = new Button(this, {
      x: NEXT_X,
      y: MAP_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("campaign-editor.map.2"),
      onClick: () => this.changeMap(1),
    });
    this.startButton = new Button(this, {
      x: START_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("main-menu.start.match"),
      enabled: false,
      onClick: () => this.startMatch(),
    });
    const back = new Button(this, {
      x: BACK_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("campaign-library.menu"),
      onClick: () => this.exit(),
    });
    this.presentationContainer = this.add.container(0, 0, [
      title,
      this.codeText,
      this.statusText,
      this.mapText,
      previous.container,
      next.container,
      this.startButton.container,
      back.container,
    ]);
    this.refreshMap();
    this.bindSessionEvents();
    this.session.host();
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }
  private shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    if (!this.transferringToBattle) this.session.close();
  }
  private bindSessionEvents(): void {
    this.session.setEvents({
      onRoomCreated: (roomCode) =>
        this.codeText.setText(t("multiplayer-host.room.code", { value1: String(roomCode) })),
      onStatus: (status) => this.statusText.setText(status),
      onPeerConnected: () => {
        this.peerConnected = this.session.isConnected;
        this.statusText.setText(t("multiplayer-host.client.connected.choose.map.and.start"));
        this.startButton.setEnabled(this.peerConnected);
      },
      onDisconnect: () => {
        this.peerConnected = false;
        this.statusText.setText(t("multiplayer-host.client.disconnected"));
        this.startButton.setEnabled(false);
      },
    });
  }
  private updatePresentationViewport(): void {
    const { width, height, scale, contentX, contentY } = calculatePresentationViewport(
      this.scale.width,
      this.scale.height,
    );
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height).setZoom(1);
    this.safeAreaBackground.setSize(width, height);
    this.presentationContainer.setPosition(contentX, contentY).setScale(scale);
  }
  private changeMap(direction: number): void {
    const maps = this.mapCatalog.list();
    if (maps.length === 0) return;
    const index = this.selectedMapKey
      ? maps.findIndex((entry) => catalogMapKey(entry) === this.selectedMapKey)
      : 0;
    const next = (index + direction + maps.length) % maps.length;
    this.selectedMapKey = catalogMapKey(maps[next] as CatalogMap);
    this.refreshMap();
  }
  private refreshMap(): void {
    const map = this.getMap();
    this.mapText.setText(
      map
        ? t("main-menu.map", { value1: String(formatCatalogMap(map)) })
        : t("main-menu.map.no.maps.available"),
    );
  }
  private getMap(): CatalogMap | null {
    const maps = this.mapCatalog.list();
    const selected = this.selectedMapKey
      ? maps.find((entry) => catalogMapKey(entry) === this.selectedMapKey)
      : undefined;
    return selected ?? maps[0] ?? null;
  }
  private startMatch(): void {
    if (!this.session.isConnected) return;
    const selectedMap = this.getMap();
    if (!selectedMap) return;
    const map = selectedMap.map;
    const state = createGameStateFromMap(map);
    this.session.startMatch(map, state);
    this.transferringToBattle = true;
    this.scene.start(BATTLE_SCENE_KEY, {
      mapDefinition: map,
      initialState: state,
      multiplayerSession: this.session,
    });
  }
  private exit(): void {
    this.session.close();
    if (this.returnMenu) this.scene.start(MAIN_MENU_SCENE_KEY, this.returnMenu);
    else this.scene.start(MAIN_MENU_SCENE_KEY);
  }
}
function catalogMapKey(entry: CatalogMap): string {
  return `${entry.source}:${entry.map.id}`;
}
function textStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
  return { color: uiTheme.colors.text, fontFamily: uiTheme.font.family, fontSize: `${fontSize}px` };
}
