import type Phaser from "phaser";
import { t } from "../../localization/runtime";
import { movementUi } from "../theme/movement-ui";
import { uiTheme } from "../theme/ui-theme";
import { Button } from "./Button";
import { MovementSlider } from "./MovementSlider";
import { Panel } from "./Panel";

export interface PauseMenuOptions {
  readonly onResume: () => void;
  readonly onExit: () => void;
  readonly onShowEventLog?: () => void;
}

const TOP_LEFT_ORIGIN = 0;
const CENTER_ORIGIN = 0.5;
const OVERLAY_ALPHA = 0.8;
const LOGICAL_WIDTH = 3840;
const LOGICAL_HEIGHT = 2160;
const DIALOG_WIDTH = 1280;
const DIALOG_HEIGHT = 944;
const DIALOG_X = (LOGICAL_WIDTH - DIALOG_WIDTH) / 2;
const DIALOG_Y = (LOGICAL_HEIGHT - DIALOG_HEIGHT) / 2;
const TITLE_TOP_OFFSET = 176;
const FIRST_BUTTON_TOP_OFFSET = 352;
const BUTTON_VERTICAL_GAP = 144;
const TITLE_Y = DIALOG_Y + TITLE_TOP_OFFSET;
const BUTTON_WIDTH = 896;
const BUTTON_HEIGHT = 96;
const DIALOG_CENTER_X = DIALOG_X + DIALOG_WIDTH / 2;

interface PauseMenuAction {
  readonly label: string;
  readonly onClick: () => void;
}

export function getPauseMenuActions(options: PauseMenuOptions): readonly PauseMenuAction[] {
  return [
    { label: t("pause-menu.return.to.game"), onClick: options.onResume },
    ...(options.onShowEventLog
      ? [{ label: t("event-log-dialog.event.log"), onClick: options.onShowEventLog }]
      : []),
    { label: t("pause-menu.main.menu"), onClick: options.onExit },
  ];
}

export class PauseMenu {
  private readonly movementSlider: MovementSlider;
  public readonly container: Phaser.GameObjects.Container;
  public readonly overlay: Phaser.GameObjects.Rectangle;

  public constructor(scene: Phaser.Scene, options: PauseMenuOptions) {
    this.overlay = scene.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background, OVERLAY_ALPHA)
      .setOrigin(TOP_LEFT_ORIGIN)
      .setScrollFactor(0)
      .setInteractive()
      .setVisible(false);
    this.container = scene.add.container().setScrollFactor(0).setVisible(false);
    const panel = new Panel(scene, {
      x: DIALOG_X,
      y: DIALOG_Y,
      width: DIALOG_WIDTH,
      height: DIALOG_HEIGHT,
    });
    const title = scene.add
      .text(DIALOG_CENTER_X, TITLE_Y, t("pause-menu.paused"), {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.titleSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const buttons = getPauseMenuActions(options).map(
      (action, index) =>
        new Button(scene, {
          x: DIALOG_CENTER_X,
          y: DIALOG_Y + FIRST_BUTTON_TOP_OFFSET + BUTTON_VERTICAL_GAP * index,
          width: BUTTON_WIDTH,
          height: BUTTON_HEIGHT,
          label: action.label,
          onClick: action.onClick,
        }),
    );

    this.movementSlider = new MovementSlider(
      scene,
      DIALOG_CENTER_X,
      DIALOG_Y + movementUi.pauseSliderY,
    );
    this.container.add([
      panel.container,
      title,
      ...buttons.map((button) => button.container),
      this.movementSlider.container,
    ]);
  }

  public get isOpen(): boolean {
    return this.container.visible;
  }

  public open(): void {
    this.movementSlider.refresh();
    this.overlay.setVisible(true);
    this.container.setVisible(true);
  }

  public close(): void {
    this.movementSlider.blur();
    this.overlay.setVisible(false);
    this.container.setVisible(false);
  }

  public setOverlaySize(width: number, height: number): void {
    this.overlay.setSize(width, height);
  }

  public destroy(): void {
    this.overlay.destroy();
    this.container.destroy(true);
  }
}
