import Phaser from "phaser";

import { uiTheme } from "../ui/theme/ui-theme";

const MENU_CENTER_X = 480;
const MENU_PANEL_CENTER_Y = 270;
const MENU_PANEL_WIDTH = 600;
const MENU_PANEL_HEIGHT = 300;
const MENU_PANEL_BORDER_WIDTH = 2;
const MENU_TITLE_Y = 178;
const MENU_OPPONENT_Y = 244;
const MENU_START_BUTTON_Y = 310;
const MENU_START_BUTTON_WIDTH = 280;
const MENU_START_BUTTON_HEIGHT = 44;
const CENTER_ORIGIN = 0.5;
const TOP_ORIGIN = 0;

export class MainMenuScene extends Phaser.Scene {
  public constructor() {
    super("main-menu");
  }

  public create(): void {
    const { colors, font, spacing } = uiTheme;
    const centerX = MENU_CENTER_X;

    this.cameras.main.setBackgroundColor(colors.background);

    this.add
      .rectangle(centerX, MENU_PANEL_CENTER_Y, MENU_PANEL_WIDTH, MENU_PANEL_HEIGHT, colors.panel)
      .setStrokeStyle(MENU_PANEL_BORDER_WIDTH, colors.panelBorder)
      .setScrollFactor(0);

    this.add
      .text(centerX, MENU_TITLE_Y, "AI WAR GAME", {
        color: colors.text,
        fontFamily: font.family,
        fontSize: `${font.titleSize}px`,
      })
      .setOrigin(CENTER_ORIGIN)
      .setScrollFactor(0);

    this.add
      .text(centerX, MENU_OPPONENT_Y, "Opponent: Heuristic AI", {
        color: colors.text,
        fontFamily: font.family,
        fontSize: `${font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN)
      .setScrollFactor(0);

    this.add
      .rectangle(
        centerX,
        MENU_START_BUTTON_Y,
        MENU_START_BUTTON_WIDTH,
        MENU_START_BUTTON_HEIGHT,
        colors.panelBorder,
      )
      .setScrollFactor(0);

    this.add
      .text(centerX, MENU_START_BUTTON_Y, "START MATCH", {
        color: colors.mutedText,
        fontFamily: font.family,
        fontSize: `${font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN)
      .setScrollFactor(0);

    this.add
      .text(
        centerX,
        MENU_START_BUTTON_Y + MENU_START_BUTTON_HEIGHT + spacing.sm,
        "Battle implementation follows in the next phase.",
        {
          color: colors.mutedText,
          fontFamily: font.family,
          fontSize: `${font.smallSize}px`,
        },
      )
      .setOrigin(CENTER_ORIGIN, TOP_ORIGIN)
      .setScrollFactor(0);
  }
}
