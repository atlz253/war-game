import Phaser from "phaser";
import { t } from "../../localization/runtime";

import { uiTheme } from "../theme/ui-theme";
import { Button } from "./Button";
import type { EventLogModel } from "./EventLogModel";
import { Panel } from "./Panel";

const TOP_LEFT_ORIGIN = 0;
const LOGICAL_WIDTH = 3840;
const LOGICAL_HEIGHT = 2160;
const DIALOG_WIDTH = 2816;
const DIALOG_HEIGHT = 1664;
const DIALOG_X = (LOGICAL_WIDTH - DIALOG_WIDTH) / 2;
const DIALOG_Y = (LOGICAL_HEIGHT - DIALOG_HEIGHT) / 2;
const CONTENT_X = DIALOG_X + uiTheme.spacing.md;
const CONTENT_TOP_OFFSET = 176;
const CLOSE_BUTTON_BOTTOM_OFFSET = 112;
const SCROLLBAR_BOTTOM_RESERVED_HEIGHT = 400;
const CONTENT_Y = DIALOG_Y + CONTENT_TOP_OFFSET;
const CONTENT_WIDTH = DIALOG_WIDTH - uiTheme.spacing.lg * 2;
const CLOSE_BUTTON_Y = DIALOG_Y + DIALOG_HEIGHT - CLOSE_BUTTON_BOTTOM_OFFSET;
const CLOSE_BUTTON_WIDTH = 896;
const BUTTON_HEIGHT = 96;
const SCROLLBAR_WIDTH = 24;
const SCROLLBAR_HEIGHT = DIALOG_HEIGHT - SCROLLBAR_BOTTOM_RESERVED_HEIGHT;
const SCROLLBAR_X = DIALOG_X + DIALOG_WIDTH - uiTheme.spacing.md;
const SCROLLBAR_Y = CONTENT_Y;
const MINIMUM_THUMB_HEIGHT = 48;
const WHEEL_DIRECTION_DOWN = 1;
const WHEEL_DIRECTION_UP = -1;

export class EventLogDialog {
  public readonly container: Phaser.GameObjects.Container;
  private readonly model: EventLogModel;
  private readonly text: Phaser.GameObjects.Text;
  private readonly scrollbarThumb: Phaser.GameObjects.Rectangle;
  private readonly onWheel: (
    pointer: Phaser.Input.Pointer,
    objects: unknown[],
    deltaX: number,
    deltaY: number,
  ) => void;

  public constructor(scene: Phaser.Scene, model: EventLogModel) {
    this.model = model;
    this.container = scene.add.container().setScrollFactor(0).setVisible(false);
    const inputBlocker = scene.add
      .rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, uiTheme.colors.background, 0)
      .setOrigin(TOP_LEFT_ORIGIN)
      .setInteractive();
    const panel = new Panel(scene, {
      x: DIALOG_X,
      y: DIALOG_Y,
      width: DIALOG_WIDTH,
      height: DIALOG_HEIGHT,
      title: t("event-log-dialog.event.log"),
    });
    this.text = scene.add
      .text(CONTENT_X, CONTENT_Y, "", {
        color: uiTheme.colors.mutedText,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
        wordWrap: { width: CONTENT_WIDTH - SCROLLBAR_WIDTH - uiTheme.spacing.sm },
      })
      .setOrigin(TOP_LEFT_ORIGIN)
      .setLineSpacing(uiTheme.spacing.xs);
    const scrollbarTrack = scene.add.rectangle(
      SCROLLBAR_X,
      SCROLLBAR_Y,
      SCROLLBAR_WIDTH,
      SCROLLBAR_HEIGHT,
      uiTheme.colors.background,
    );
    scrollbarTrack.setOrigin(TOP_LEFT_ORIGIN);
    this.scrollbarThumb = scene.add.rectangle(
      SCROLLBAR_X,
      SCROLLBAR_Y,
      SCROLLBAR_WIDTH,
      SCROLLBAR_HEIGHT,
      uiTheme.colors.primary,
    );
    this.scrollbarThumb.setOrigin(TOP_LEFT_ORIGIN);
    const closeButton = new Button(scene, {
      x: DIALOG_X + DIALOG_WIDTH / 2,
      y: CLOSE_BUTTON_Y,
      width: CLOSE_BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: t("event-log-dialog.close"),
      onClick: () => this.close(),
    });
    this.container.add([
      inputBlocker,
      panel.container,
      this.text,
      scrollbarTrack,
      this.scrollbarThumb,
      closeButton.container,
    ]);
    this.onWheel = (_pointer, _objects, _deltaX, deltaY) => {
      if (!this.isOpen || deltaY === 0) return;
      this.model.scrollBy(deltaY > 0 ? WHEEL_DIRECTION_DOWN : WHEEL_DIRECTION_UP);
      this.render();
    };
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel);
  }

  public get isOpen(): boolean {
    return this.container.visible;
  }

  public open(): void {
    this.model.scrollToLatest();
    this.render();
    this.container.setVisible(true);
  }

  public close(): void {
    this.container.setVisible(false);
  }

  public destroy(scene: Phaser.Scene): void {
    scene.input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel);
    this.container.destroy(true);
  }

  private render(): void {
    this.text.setText(this.model.visibleEntries.map((entry) => `• ${entry}`));
    const visibleRatio =
      this.model.entries.length === 0
        ? 1
        : this.model.visibleEntries.length / this.model.entries.length;
    const thumbHeight = this.model.hasOverflow
      ? Math.max(SCROLLBAR_HEIGHT * visibleRatio, MINIMUM_THUMB_HEIGHT)
      : SCROLLBAR_HEIGHT;
    const thumbTravel = SCROLLBAR_HEIGHT - thumbHeight;
    this.scrollbarThumb
      .setSize(SCROLLBAR_WIDTH, thumbHeight)
      .setY(SCROLLBAR_Y + thumbTravel * this.model.scrollProgress);
  }
}
