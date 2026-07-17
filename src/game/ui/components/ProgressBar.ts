import Phaser from "phaser";

import { uiTheme } from "../theme/ui-theme";

export interface ProgressBarOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color?: number;
}

const TOP_LEFT_ORIGIN = 0;
const EMPTY_VALUE = 0;
const FULL_VALUE = 1;

export class ProgressBar {
  public readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly width: number;

  public constructor(scene: Phaser.Scene, options: ProgressBarOptions) {
    this.container = scene.add.container(options.x, options.y).setScrollFactor(0);
    this.width = options.width;
    const background = scene.add
      .rectangle(0, 0, options.width, options.height, uiTheme.colors.background)
      .setOrigin(TOP_LEFT_ORIGIN);
    this.fill = scene.add
      .rectangle(0, 0, options.width, options.height, options.color ?? uiTheme.colors.primary)
      .setOrigin(TOP_LEFT_ORIGIN);
    this.container.add([background, this.fill]);
  }

  public setValue(current: number, maximum: number): void {
    const ratio =
      maximum > EMPTY_VALUE
        ? Phaser.Math.Clamp(current / maximum, EMPTY_VALUE, FULL_VALUE)
        : EMPTY_VALUE;

    this.fill.setDisplaySize(this.width * ratio, this.fill.height);
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
