import Phaser from "phaser";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { Button } from "../ui/components/Button";
import { CanvasTextDialog } from "../ui/components/CanvasTextDialog";
import { campaignUi as ui } from "../ui/theme/campaign-ui";
import { uiTheme } from "../ui/theme/ui-theme";
export class CampaignScene extends Phaser.Scene {
  protected root!: Phaser.GameObjects.Container;
  protected content!: Phaser.GameObjects.Container;
  protected modal?: CanvasTextDialog;
  protected message = "";
  protected initializeCanvas(): void {
    this.root = this.add.container().setScrollFactor(0);
    this.content = this.add.container().setScrollFactor(0);
    this.root.add(this.content);
    this.cameras.main.setBackgroundColor(uiTheme.colors.background);
    this.scale.on("resize", this.resizeCanvas, this);
    this.events.once("shutdown", () => {
      this.modal?.destroy();
      this.modal = undefined;
      this.scale.off("resize", this.resizeCanvas, this);
    });
    this.resizeCanvas();
  }
  protected resizeCanvas(): void {
    const viewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.root.setPosition(viewport.contentX, viewport.contentY).setScale(viewport.scale);
  }
  protected clearContent(): void {
    this.content.removeAll(true);
  }
  protected text(
    x: number,
    y: number,
    value: string,
    small = false,
    width: number = ui.textWidth,
  ): Phaser.GameObjects.Text {
    const text = this.add
      .text(x, y, value, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: small ? uiTheme.font.smallSize : uiTheme.font.normalSize,
        wordWrap: { width },
      })
      .setScrollFactor(0);
    this.content.add(text);
    return text;
  }
  protected button(
    x: number,
    y: number,
    label: string,
    callback: () => void,
    enabled = true,
    width: number = ui.buttonWidth,
  ): void {
    const button = new Button(this, {
      x: x + width / 2,
      y,
      width,
      height: ui.buttonHeight,
      label,
      enabled,
      onClick: () => {
        if (!this.modal) callback();
      },
    });
    this.content.add(button.container);
  }
  protected edit(
    label: string,
    value: string,
    multiline: boolean,
    confirm: (value: string) => void,
    refreshed: () => void,
  ): void {
    if (this.modal) return;
    this.modal = new CanvasTextDialog(this, label, value, multiline, confirm, () => {
      this.modal?.destroy();
      this.modal = undefined;
      refreshed();
    });
    this.root.add(this.modal.container);
  }
  protected choices(
    title: string,
    choices: readonly { label: string; action: () => void }[],
  ): void {
    this.clearContent();
    this.text(ui.leftX, ui.titleY, title);
    choices.forEach((choice, index) => {
      this.button(
        ui.rightX,
        ui.bodyY + ui.rowHeight * index,
        choice.label,
        choice.action,
        true,
        ui.listWidth,
      );
    });
  }
}
