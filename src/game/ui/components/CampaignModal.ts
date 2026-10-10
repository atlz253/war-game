import type Phaser from "phaser";
import type { MissionDialogueController } from "../../campaigns/dialogue-controller";
import { t } from "../../localization/runtime";
import { campaignUi as ui } from "../theme/campaign-ui";
import { uiTheme } from "../theme/ui-theme";
import { Button } from "./Button";
export class CampaignModal {
  public readonly container: Phaser.GameObjects.Container;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly text: Phaser.GameObjects.Text;
  private readonly next: Button;
  private offset = 0;
  private lastLine: unknown;
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly controller: MissionDialogueController,
    seek?: { start: () => void; previous: () => void },
  ) {
    this.container = scene.add.container().setScrollFactor(0).setDepth(ui.modalDepth);
    const overlay = scene.add
      .rectangle(0, 0, ui.width, ui.height, uiTheme.colors.background, ui.overlayAlpha)
      .setOrigin(0)
      .setInteractive();
    overlay.on(
      "pointerdown",
      (_p: unknown, _x: unknown, _y: unknown, event: { stopPropagation(): void }) =>
        event.stopPropagation(),
    );
    this.speaker = scene.add.text(ui.modalTextX, ui.modalY, "", {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: uiTheme.font.normalSize,
      wordWrap: { width: ui.modalTextWidth, useAdvancedWrap: true },
    });
    this.text = scene.add.text(ui.modalTextX, ui.modalTextY, "", {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: uiTheme.font.normalSize,
      wordWrap: { width: ui.modalTextWidth, useAdvancedWrap: true },
    });
    this.next = this.button(ui.modalTextX + ui.controlGap, t("campaign-modal.next.close"), () => {
      controller.next();
      this.refresh();
    });
    const up = this.button(ui.modalTextX + ui.controlGap * 2, t("campaign-modal.scroll.up"), () => {
      this.offset = Math.max(0, this.offset - 1);
      this.refresh();
    });
    const down = this.button(
      ui.modalTextX + ui.controlGap * ui.downButtonColumn,
      t("campaign-modal.scroll.down"),
      () => {
        this.offset++;
        this.refresh();
      },
    );
    this.container.add([
      overlay,
      this.speaker,
      this.text,
      this.next.container,
      up.container,
      down.container,
    ]);
    if (seek) {
      const start = this.button(
        ui.modalTextX + ui.controlGap,
        t("campaign-modal.replay.start"),
        seek.start,
      );
      const previous = this.button(
        ui.modalTextX + ui.controlGap * 2,
        t("campaign-modal.previous.frame"),
        seek.previous,
      );
      start.container.setY(ui.modalY - ui.rowHeight);
      previous.container.setY(ui.modalY - ui.rowHeight);
      this.container.add([start.container, previous.container]);
    }
    this.refresh();
  }
  private button(x: number, label: string, onClick: () => void): Button {
    return new Button(this.scene, {
      x,
      y: ui.modalButtonY,
      width: ui.buttonWidth,
      height: ui.buttonHeight,
      label,
      onClick,
    });
  }
  public refresh(): void {
    const line = this.controller.current;
    this.container.setVisible(Boolean(line));
    if (!line) return;
    if (line !== this.lastLine) {
      this.offset = 0;
      this.lastLine = line;
    }
    this.speaker.setText(`${line.speaker} · ${this.controller.position}`);
    const wrapped = this.text.getWrappedText(line.text);
    this.offset = Math.min(this.offset, Math.max(0, wrapped.length - ui.modalRows));
    this.text.setText(wrapped.slice(this.offset, this.offset + ui.modalRows).join("\n"));
  }
  public destroy(): void {
    this.container.destroy(true);
  }
}
