import type Phaser from "phaser";
import { editText, insertText, textState } from "../../campaigns/text-edit";
import { t } from "../../localization/runtime";
import { campaignUi as ui } from "../theme/campaign-ui";
import { uiTheme } from "../theme/ui-theme";
import { Button } from "./Button";
export class CanvasTextDialog {
  public readonly container: Phaser.GameObjects.Container;
  private state;
  private readonly text: Phaser.GameObjects.Text;
  private readonly error: Phaser.GameObjects.Text;
  private offset = 0;
  private disposed = false;
  public constructor(
    private readonly scene: Phaser.Scene,
    label: string,
    value: string,
    multiline: boolean,
    private readonly confirm: (value: string) => void,
    private readonly close: () => void,
  ) {
    this.state = textState(value, multiline);
    this.container = scene.add.container().setScrollFactor(0).setDepth(ui.modalDepth);
    const overlay = scene.add
      .rectangle(0, 0, ui.width, ui.height, uiTheme.colors.background, ui.overlayAlpha)
      .setOrigin(0)
      .setInteractive()
      .on(
        "pointerdown",
        (_pointer: unknown, _x: number, _y: number, event?: Phaser.Types.Input.EventData) =>
          event?.stopPropagation(),
      );
    const title = scene.add.text(ui.modalTextX, ui.modalY, label, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: uiTheme.font.titleSize,
    });
    this.text = scene.add.text(ui.modalTextX, ui.modalTextY, "", {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: uiTheme.font.normalSize,
      wordWrap: { width: ui.modalTextWidth, useAdvancedWrap: true },
    });
    this.error = scene.add.text(ui.modalTextX, ui.modalButtonY - ui.rowHeight, "", {
      color: uiTheme.colors.dangerText,
      fontSize: uiTheme.font.smallSize,
    });
    const buttons = [
      this.button(0, t("canvas-text-dialog.save.text"), () => {
        this.confirm(this.state.value);
        this.close();
      }),
      this.button(1, t("common.cancel"), close),
      this.button(2, t("campaign-modal.scroll.up"), () => {
        this.offset = Math.max(0, this.offset - 1);
        this.refresh();
      }),
      this.button(ui.downButtonColumn, t("campaign-modal.scroll.down"), () => {
        this.offset++;
        this.refresh();
      }),
    ];
    this.container.add([
      overlay,
      title,
      this.text,
      this.error,
      ...buttons.map((button) => button.container),
    ]);
    scene.input.keyboard?.on("keydown", this.keydown, this);
    this.refresh();
  }
  private button(index: number, label: string, onClick: () => void): Button {
    return new Button(this.scene, {
      x: ui.modalTextX + ui.controlGap * index + ui.buttonWidth / 2,
      y: ui.modalButtonY,
      width: ui.buttonWidth,
      height: ui.buttonHeight,
      label,
      onClick,
    });
  }
  private keydown(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") return void this.close();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      void this.paste();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    this.state = editText(this.state, event.key);
    this.refresh(true);
  }
  private async paste(): Promise<void> {
    try {
      const value = await navigator.clipboard.readText();
      if (!this.disposed) {
        this.state = insertText(this.state, value);
        this.refresh(true);
      }
    } catch {
      if (!this.disposed)
        this.error.setText(
          t("canvas-text-dialog.clipboard.access.failed.type.text.or.allow.clipboard.access"),
        );
    }
  }
  private refresh(followCursor = false): void {
    const points = Array.from(this.state.value);
    points.splice(this.state.cursor, 0, "|");
    const lines = this.text.getWrappedText(points.join(""));
    if (followCursor) {
      const cursorLines = this.text.getWrappedText(points.slice(0, this.state.cursor + 1).join(""));
      this.offset = Math.max(0, cursorLines.length - ui.textRows);
    }
    this.offset = Math.min(this.offset, Math.max(0, lines.length - ui.textRows));
    this.text.setText(lines.slice(this.offset, this.offset + ui.textRows).join("\n"));
    this.error.setText(
      this.state.error ||
        t("canvas-text-dialog.arrows.home.end.cursor.backspace.delete.ctrl.v.paste.enter.new.li"),
    );
  }
  public destroy(): void {
    this.disposed = true;
    this.scene.input.keyboard?.off("keydown", this.keydown, this);
    this.container.destroy(true);
  }
}
