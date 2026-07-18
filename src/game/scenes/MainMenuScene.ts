import Phaser from "phaser";

import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { Button } from "../ui/components/Button";
import { uiTheme } from "../ui/theme/ui-theme";
import { BATTLE_SCENE_KEY } from "./scene-keys";

const MENU_CENTER_X = 1920;
const MENU_PANEL_CENTER_Y = 1080;
const MENU_PANEL_WIDTH = 2400;
const MENU_PANEL_HEIGHT = 1200;
const MENU_PANEL_BORDER_WIDTH = 8;
const MENU_TITLE_Y = 712;
const MENU_OPPONENT_Y = 976;
const MENU_START_BUTTON_Y = 1240;
const MENU_START_BUTTON_WIDTH = 1120;
const MENU_START_BUTTON_HEIGHT = 176;
const CENTER_ORIGIN = 0.5;
const TOP_ORIGIN = 0;

export class MainMenuScene extends Phaser.Scene {
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;

  public constructor() {
    super("main-menu");
  }

  public create(): void {
    const { colors, font, spacing } = uiTheme;
    const centerX = MENU_CENTER_X;
    const panel = this.add
      .rectangle(centerX, MENU_PANEL_CENTER_Y, MENU_PANEL_WIDTH, MENU_PANEL_HEIGHT, colors.panel)
      .setStrokeStyle(MENU_PANEL_BORDER_WIDTH, colors.panelBorder);
    const title = this.add
      .text(centerX, MENU_TITLE_Y, "AI WAR GAME", {
        color: colors.text,
        fontFamily: font.family,
        fontSize: `${font.titleSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const opponent = this.add
      .text(centerX, MENU_OPPONENT_Y, "Opponent: Heuristic AI", {
        color: colors.text,
        fontFamily: font.family,
        fontSize: `${font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const startButton = new Button(this, {
      x: centerX,
      y: MENU_START_BUTTON_Y,
      width: MENU_START_BUTTON_WIDTH,
      height: MENU_START_BUTTON_HEIGHT,
      label: "START MATCH",
      onClick: () => this.scene.start(BATTLE_SCENE_KEY),
    });
    const instructions = this.add
      .text(
        centerX,
        MENU_START_BUTTON_Y + MENU_START_BUTTON_HEIGHT + spacing.sm,
        "Click Start Match to command the Blue army.",
        {
          color: colors.mutedText,
          fontFamily: font.family,
          fontSize: `${font.smallSize}px`,
        },
      )
      .setOrigin(CENTER_ORIGIN, TOP_ORIGIN);

    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add.rectangle(0, 0, 0, 0, colors.background).setOrigin(0);
    this.presentationContainer = this.add.container(0, 0, [
      panel,
      title,
      opponent,
      startButton.container,
      instructions,
    ]);
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindPresentationResize, this);
  }

  private updatePresentationViewport(): void {
    const { x, y, width, height, scale } = calculatePresentationViewport(
      this.scale.width,
      this.scale.height,
    );

    this.cameras.main
      .setViewport(0, 0, this.scale.width, this.scale.height)
      .setScroll(0, 0)
      .setZoom(1);
    this.safeAreaBackground.setPosition(x, y).setSize(width, height);
    this.presentationContainer.setPosition(x, y).setScale(scale);
  }

  private unbindPresentationResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
