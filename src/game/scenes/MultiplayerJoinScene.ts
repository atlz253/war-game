import Phaser from "phaser";
import type { MapDefinition } from "../../core/maps/map-definition";
import type { GameState } from "../../core/model/game-state";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { t } from "../localization/runtime";
import type { MainMenuSceneData, MultiplayerMenuData } from "../menu/menu-navigation";
import { MultiplayerSession } from "../multiplayer/multiplayer-session";
import { Button } from "../ui/components/Button";
import { uiTheme } from "../ui/theme/ui-theme";
import { BATTLE_SCENE_KEY, MAIN_MENU_SCENE_KEY } from "./scene-keys";

const CENTER_X = 1920;
const TITLE_Y = 480;
const INPUT_Y = 900;
const STATUS_Y = 1160;
const BUTTON_Y = 1460;
const BUTTON_WIDTH = 640;
const BUTTON_HEIGHT = 128;
const MAX_CODE_LENGTH = 12;
const CENTER = 0.5;

export class MultiplayerJoinScene extends Phaser.Scene {
  private readonly session = new MultiplayerSession("client");
  private roomCode = "";
  private inputText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private joinButton!: Button;
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private transferringToBattle = false;
  private returnMenu?: MainMenuSceneData;
  public constructor() {
    super("multiplayer-join");
  }
  public create(data: MultiplayerMenuData = {}): void {
    this.returnMenu = data.returnMenu;
    this.transferringToBattle = false;
    this.roomCode = "";
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    const title = this.add
      .text(
        CENTER_X,
        TITLE_Y,
        t("multiplayer-join.join.multiplayer.red"),
        style(uiTheme.font.titleSize),
      )
      .setOrigin(CENTER);
    this.inputText = this.add
      .text(CENTER_X, INPUT_Y, t("multiplayer-join.room.code"), style(uiTheme.font.titleSize))
      .setOrigin(CENTER);
    this.statusText = this.add
      .text(
        CENTER_X,
        STATUS_Y,
        t("multiplayer-join.type.the.host.s.room.code"),
        style(uiTheme.font.normalSize),
      )
      .setOrigin(CENTER);
    this.joinButton = new Button(this, {
      x: CENTER_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("multiplayer-join.join"),
      enabled: false,
      onClick: () => this.join(),
    });
    const back = new Button(this, {
      x: 600,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("campaign-library.menu"),
      onClick: () => this.exit(),
    });
    this.presentationContainer = this.add.container(0, 0, [
      title,
      this.inputText,
      this.statusText,
      this.joinButton.container,
      back.container,
    ]);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKey, this);
    this.session.setEvents({
      onStatus: (status) => this.statusText.setText(status),
      onPeerConnected: () =>
        this.statusText.setText(t("multiplayer-join.connected.waiting.for.host.to.start")),
      onMatchStart: (mapDefinition, state) => this.startBattle(mapDefinition, state),
      onDisconnect: () => this.statusText.setText(t("multiplayer-join.host.disconnected")),
    });
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKey, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
      if (!this.transferringToBattle) this.session.close();
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
  private handleKey(event: KeyboardEvent): void {
    if (event.key === "Backspace") this.roomCode = this.roomCode.slice(0, -1);
    else if (/^[a-zA-Z0-9_-]$/.test(event.key) && this.roomCode.length < MAX_CODE_LENGTH)
      this.roomCode += event.key.toUpperCase();
    else if (event.key === "Enter") this.join();
    else return;
    this.inputText.setText(
      t("multiplayer-host.room.code", { value1: String(this.roomCode || "_") }),
    );
    this.joinButton.setEnabled(this.roomCode.length > 0);
  }
  private join(): void {
    if (this.roomCode.length === 0) return;
    this.joinButton.setEnabled(false);
    this.session.join(this.roomCode);
  }
  private startBattle(mapDefinition: MapDefinition, initialState: GameState): void {
    this.transferringToBattle = true;
    this.scene.start(BATTLE_SCENE_KEY, {
      mapDefinition,
      initialState,
      multiplayerSession: this.session,
    });
  }
  private exit(): void {
    this.session.close();
    if (this.returnMenu) this.scene.start(MAIN_MENU_SCENE_KEY, this.returnMenu);
    else this.scene.start(MAIN_MENU_SCENE_KEY);
  }
}
function style(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
  return { color: uiTheme.colors.text, fontFamily: uiTheme.font.family, fontSize: `${fontSize}px` };
}
