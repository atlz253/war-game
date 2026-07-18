import Phaser from "phaser";

import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import {
  createDefaultMatchConfiguration,
  getParticipantLabel,
  toggleParticipant,
} from "../match/match-configuration";
import { Button } from "../ui/components/Button";
import { uiTheme } from "../ui/theme/ui-theme";
import { BATTLE_SCENE_KEY } from "./scene-keys";

const MENU_CENTER_X = 1920;
const MENU_PANEL_CENTER_Y = 1080;
const MENU_PANEL_WIDTH = 2400;
const MENU_PANEL_HEIGHT = 1440;
const MENU_PANEL_BORDER_WIDTH = 8;
const MENU_TITLE_Y = 560;
const SIDE_LABEL_X = 1280;
const BLUE_SIDE_Y = 920;
const RED_SIDE_Y = 1120;
const ROLE_BUTTON_X = 2580;
const ROLE_BUTTON_WIDTH = 920;
const ROLE_BUTTON_HEIGHT = 128;
const MENU_START_BUTTON_Y = 1420;
const MENU_START_BUTTON_WIDTH = 1120;
const MENU_START_BUTTON_HEIGHT = 176;
const CENTER_ORIGIN = 0.5;
const TOP_ORIGIN = 0;

export class MainMenuScene extends Phaser.Scene {
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private matchConfiguration = createDefaultMatchConfiguration();
  private blueRoleButton!: Button;
  private redRoleButton!: Button;

  public constructor() {
    super("main-menu");
  }

  public create(): void {
    const { colors, font, spacing } = uiTheme;
    const centerX = MENU_CENTER_X;
    this.matchConfiguration = createDefaultMatchConfiguration();
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
    const blueSideLabel = this.add
      .text(SIDE_LABEL_X, BLUE_SIDE_Y, "BLUE COMMANDER", {
        color: colors.text,
        fontFamily: font.family,
        fontSize: `${font.normalSize}px`,
      })
      .setOrigin(0, CENTER_ORIGIN);
    const redSideLabel = this.add
      .text(SIDE_LABEL_X, RED_SIDE_Y, "RED COMMANDER", {
        color: colors.text,
        fontFamily: font.family,
        fontSize: `${font.normalSize}px`,
      })
      .setOrigin(0, CENTER_ORIGIN);
    this.blueRoleButton = new Button(this, {
      x: ROLE_BUTTON_X,
      y: BLUE_SIDE_Y,
      width: ROLE_BUTTON_WIDTH,
      height: ROLE_BUTTON_HEIGHT,
      label: getParticipantLabel(this.matchConfiguration.blue),
      onClick: () => this.toggleRole("blue"),
    });
    this.redRoleButton = new Button(this, {
      x: ROLE_BUTTON_X,
      y: RED_SIDE_Y,
      width: ROLE_BUTTON_WIDTH,
      height: ROLE_BUTTON_HEIGHT,
      label: getParticipantLabel(this.matchConfiguration.red),
      onClick: () => this.toggleRole("red"),
    });
    const startButton = new Button(this, {
      x: centerX,
      y: MENU_START_BUTTON_Y,
      width: MENU_START_BUTTON_WIDTH,
      height: MENU_START_BUTTON_HEIGHT,
      label: "START MATCH",
      onClick: () =>
        this.scene.start(BATTLE_SCENE_KEY, { matchConfiguration: this.matchConfiguration }),
    });
    const instructions = this.add
      .text(
        centerX,
        MENU_START_BUTTON_Y + MENU_START_BUTTON_HEIGHT + spacing.sm,
        "Choose a commander for each army, then start the match.",
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
      blueSideLabel,
      redSideLabel,
      this.blueRoleButton.container,
      this.redRoleButton.container,
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

  private toggleRole(side: "blue" | "red"): void {
    this.matchConfiguration = toggleParticipant(this.matchConfiguration, side);
    this.blueRoleButton.setLabel(getParticipantLabel(this.matchConfiguration.blue));
    this.redRoleButton.setLabel(getParticipantLabel(this.matchConfiguration.red));
  }

  private unbindPresentationResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
