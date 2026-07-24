import Phaser from "phaser";

import { createMapDefinitionFromState } from "../../core/maps/create-map-definition-from-state";
import { createGameStateFromMap, type MapDefinition } from "../../core/maps/map-definition";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { getBrowserMapLibrary } from "../maps/map-library";
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
  private readonly maps = getBrowserMapLibrary();
  private selectedMapId: string | null = null;
  private codeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private startButton!: Button;
  private peerConnected = false;
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private transferringToBattle = false;

  public constructor() {
    super("multiplayer-host");
  }
  public create(): void {
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    const title = this.add
      .text(CENTER_X, TITLE_Y, "HOST MULTIPLAYER — BLUE", textStyle(uiTheme.font.titleSize))
      .setOrigin(CENTER);
    this.codeText = this.add
      .text(CENTER_X, CODE_Y, "CREATING ROOM…", textStyle(uiTheme.font.titleSize))
      .setOrigin(CENTER);
    this.statusText = this.add
      .text(CENTER_X, STATUS_Y, "CONNECTING…", textStyle(uiTheme.font.normalSize))
      .setOrigin(CENTER);
    this.mapText = this.add
      .text(CENTER_X, MAP_Y, "", textStyle(uiTheme.font.normalSize))
      .setOrigin(CENTER);
    const previous = new Button(this, {
      x: PREVIOUS_X,
      y: MAP_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "< MAP",
      onClick: () => this.changeMap(-1),
    });
    const next = new Button(this, {
      x: NEXT_X,
      y: MAP_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "MAP >",
      onClick: () => this.changeMap(1),
    });
    this.startButton = new Button(this, {
      x: START_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "START MATCH",
      enabled: false,
      onClick: () => this.startMatch(),
    });
    const back = new Button(this, {
      x: BACK_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "MENU",
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
    this.session.setEvents({
      onRoomCreated: (roomCode) => this.codeText.setText(`ROOM CODE: ${roomCode}`),
      onStatus: (status) => this.statusText.setText(status),
      onPeerConnected: () => {
        this.peerConnected = this.session.isConnected;
        this.statusText.setText("CLIENT CONNECTED — CHOOSE MAP AND START");
        this.startButton.setEnabled(this.peerConnected);
      },
      onDisconnect: () => {
        this.peerConnected = false;
        this.statusText.setText("CLIENT DISCONNECTED");
        this.startButton.setEnabled(false);
      },
    });
    this.session.host();
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
  private changeMap(direction: number): void {
    const maps = this.maps.list();
    const index = this.selectedMapId
      ? maps.findIndex((map) => map.id === this.selectedMapId) + 1
      : 0;
    const next = (index + direction + maps.length + 1) % (maps.length + 1);
    this.selectedMapId = next === 0 ? null : (maps[next - 1]?.id ?? null);
    this.refreshMap();
  }
  private refreshMap(): void {
    this.mapText.setText(
      this.getMap()?.name ? `MAP: ${this.getMap()?.name}` : "MAP: Skirmish 12×8",
    );
  }
  private getMap(): MapDefinition | null {
    return this.selectedMapId
      ? (this.maps.list().find((map) => map.id === this.selectedMapId) ?? null)
      : null;
  }
  private startMatch(): void {
    if (!this.session.isConnected) return;
    const state = this.getMap()
      ? createGameStateFromMap(this.getMap() as MapDefinition)
      : createSkirmishGameState();
    const map = this.getMap() ?? createMapDefinitionFromState(state, "Skirmish 12×8");
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
    this.scene.start(MAIN_MENU_SCENE_KEY);
  }
}
function textStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
  return { color: uiTheme.colors.text, fontFamily: uiTheme.font.family, fontSize: `${fontSize}px` };
}
