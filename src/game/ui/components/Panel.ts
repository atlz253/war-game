import type Phaser from "phaser";

import { uiTheme } from "../theme/ui-theme";

export interface PanelOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title?: string;
}

const TOP_LEFT_ORIGIN = 0;
const BORDER_WIDTH = 8;

export class Panel {
  public readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;

  public constructor(scene: Phaser.Scene, options: PanelOptions) {
    this.container = scene.add.container(options.x, options.y).setScrollFactor(0);
    this.background = scene.add
      .rectangle(0, 0, options.width, options.height, uiTheme.colors.panel)
      .setOrigin(TOP_LEFT_ORIGIN)
      .setStrokeStyle(BORDER_WIDTH, uiTheme.colors.panelBorder);
    this.container.add(this.background);

    if (options.title) {
      this.container.add(
        scene.add
          .text(uiTheme.spacing.sm, uiTheme.spacing.sm, options.title, {
            color: uiTheme.colors.text,
            fontFamily: uiTheme.font.family,
            fontSize: `${uiTheme.font.normalSize}px`,
          })
          .setOrigin(TOP_LEFT_ORIGIN),
      );
    }
  }

  public add(child: Phaser.GameObjects.GameObject): void {
    this.container.add(child);
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public setSize(width: number, height: number): void {
    this.background.setSize(width, height);
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
