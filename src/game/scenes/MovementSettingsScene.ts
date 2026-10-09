import Phaser from "phaser";
import { calculatePresentationViewport } from "../config/presentation-layout";
import type { MatchConfiguration } from "../match/match-configuration";
import { Button } from "../ui/components/Button";
import { MovementSlider } from "../ui/components/MovementSlider";
import { movementUi } from "../ui/theme/movement-ui";
import { uiTheme } from "../ui/theme/ui-theme";
import { MAIN_MENU_SCENE_KEY, MOVEMENT_SETTINGS_SCENE_KEY } from "./scene-keys";

const CENTER_ORIGIN = 0.5;

export class MovementSettingsScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  public constructor() {
    super(MOVEMENT_SETTINGS_SCENE_KEY);
  }

  public create(data: { matchConfiguration?: MatchConfiguration } = {}): void {
    const layout = movementUi.settings;
    this.cameras.main.setBackgroundColor(uiTheme.colors.background);
    const title = this.add
      .text(layout.centerX, layout.titleY, "MOVEMENT SETTINGS", {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.titleSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const slider = new MovementSlider(this, layout.centerX, layout.sliderY);
    const back = new Button(this, {
      x: layout.centerX,
      y: layout.backY,
      width: layout.width,
      height: layout.height,
      label: "BACK",
      onClick: () => this.scene.start(MAIN_MENU_SCENE_KEY, data),
    });
    this.content = this.add
      .container(0, 0, [title, slider.container, back.container])
      .setScrollFactor(0);
    this.resize();
    this.scale.on("resize", this.resize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.resize, this));
  }

  private resize(): void {
    const viewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.content.setPosition(viewport.contentX, viewport.contentY).setScale(viewport.scale);
  }
}
