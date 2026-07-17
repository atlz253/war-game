import type Phaser from "phaser";

import { uiTheme } from "../theme/ui-theme";

export interface ScrollableListOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly maxEntries: number;
}

const TOP_LEFT_ORIGIN = 0;
export class ScrollableList {
  public readonly container: Phaser.GameObjects.Container;
  private readonly entries: string[] = [];
  private readonly maxEntries: number;
  private readonly text: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene, options: ScrollableListOptions) {
    this.container = scene.add.container(options.x, options.y).setScrollFactor(0);
    this.maxEntries = options.maxEntries;
    this.text = scene.add
      .text(0, 0, "", {
        color: uiTheme.colors.mutedText,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
        wordWrap: { width: options.width },
      })
      .setOrigin(TOP_LEFT_ORIGIN)
      .setLineSpacing(uiTheme.spacing.xs);
    this.container.add(this.text);
  }

  public push(entry: string): void {
    this.entries.push(entry);
    this.entries.splice(0, Math.max(this.entries.length - this.maxEntries, 0));
    this.text.setText(this.entries.map((item) => `• ${item}`));
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
