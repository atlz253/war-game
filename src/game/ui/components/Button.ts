import Phaser from "phaser";

import { uiTheme } from "../theme/ui-theme";

export interface ButtonOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly onClick: () => void;
  readonly enabled?: boolean;
}

const CENTER_ORIGIN = 0.5;
const BORDER_WIDTH = 8;
const PRESSED_OFFSET = 4;
const ENABLED_ALPHA = 1;
const DISABLED_ALPHA = 0.55;

export class Button {
  public readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly onClick: () => void;
  private enabled: boolean;

  public constructor(scene: Phaser.Scene, options: ButtonOptions) {
    this.container = scene.add
      .container(options.x, options.y)
      .setSize(options.width, options.height)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0);
    this.background = scene.add
      .rectangle(0, 0, options.width, options.height, uiTheme.colors.primary)
      .setStrokeStyle(BORDER_WIDTH, uiTheme.colors.panelBorder);
    this.labelText = scene.add
      .text(0, 0, options.label, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    this.onClick = options.onClick;
    this.enabled = options.enabled ?? true;
    this.container.add([this.background, this.labelText]);
    this.bindPointerEvents();
    this.refreshAppearance();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.refreshAppearance();
  }

  public setLabel(label: string): void {
    this.labelText.setText(label);
  }

  public destroy(): void {
    this.container.destroy(true);
  }

  private bindPointerEvents(): void {
    this.container.on(Phaser.Input.Events.POINTER_OVER, () => this.setHoverAppearance());
    this.container.on(Phaser.Input.Events.POINTER_OUT, () => this.refreshAppearance());
    this.container.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleClick());
  }

  private handleClick(): void {
    if (this.enabled) {
      this.setPressedAppearance();
      this.onClick();
    }

    this.refreshAppearance();
  }

  private refreshAppearance(): void {
    const color = this.enabled ? uiTheme.colors.primary : uiTheme.colors.panelBorder;

    this.background.setFillStyle(color).setAlpha(this.enabled ? ENABLED_ALPHA : DISABLED_ALPHA);
    this.labelText.setColor(this.enabled ? uiTheme.colors.text : uiTheme.colors.mutedText);
    this.labelText.setPosition(0, 0);
  }

  private setHoverAppearance(): void {
    if (this.enabled) {
      this.background.setFillStyle(uiTheme.colors.panelBorder);
    }
  }

  private setPressedAppearance(): void {
    if (this.enabled) {
      this.labelText.setPosition(0, PRESSED_OFFSET);
    }
  }
}
