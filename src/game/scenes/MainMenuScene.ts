import Phaser from "phaser";

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
const HALF_DIMENSION = 2;

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

    new Button(this, {
      x: centerX,
      y: MENU_START_BUTTON_Y,
      width: MENU_START_BUTTON_WIDTH,
      height: MENU_START_BUTTON_HEIGHT,
      label: "START MATCH",
      onClick: () => this.scene.start(BATTLE_SCENE_KEY),
    });

    this.add
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
      .setOrigin(CENTER_ORIGIN, TOP_ORIGIN)
      .setScrollFactor(0);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (isInsideStartButton(pointer.x, pointer.y)) {
        this.scene.start(BATTLE_SCENE_KEY);
      }
    });
  }
}

function isInsideStartButton(x: number, y: number): boolean {
  return (
    x >= MENU_CENTER_X - MENU_START_BUTTON_WIDTH / HALF_DIMENSION &&
    x <= MENU_CENTER_X + MENU_START_BUTTON_WIDTH / HALF_DIMENSION &&
    y >= MENU_START_BUTTON_Y - MENU_START_BUTTON_HEIGHT / HALF_DIMENSION &&
    y <= MENU_START_BUTTON_Y + MENU_START_BUTTON_HEIGHT / HALF_DIMENSION
  );
}
