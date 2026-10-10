import type Phaser from "phaser";
import { t } from "../../localization/runtime";
import { getMovementSettings, MOVEMENT_SLIDER_MAX } from "../../presentation/movement-settings";
import { movementUi } from "../theme/movement-ui";
import { uiTheme } from "../theme/ui-theme";
import { movementSpeedLabel, sliderKeyValue, sliderValueAt } from "./movement-slider-model";

const CENTER_ORIGIN = 0.5;

/** Fixed Canvas UI. Pointer coordinates are inverted through its full parent transform. */
export class MovementSlider {
  public readonly container: Phaser.GameObjects.Container;
  private readonly thumb: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private value: number;
  private draggingPointer: number | null = null;
  private focused = false;
  private readonly store = getMovementSettings();

  public constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.value = this.store.load();
    const layout = movementUi;
    this.container = scene.add.container(x - layout.trackWidth / 2, y).setScrollFactor(0);
    const track = scene.add.rectangle(
      layout.trackWidth / 2,
      0,
      layout.trackWidth,
      layout.trackHeight,
      uiTheme.colors.panelBorder,
    );
    const hit = scene.add
      .rectangle(
        layout.trackWidth / 2,
        0,
        layout.trackWidth + layout.thumbWidth,
        layout.hitHeight,
        uiTheme.colors.panel,
        0,
      )
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.thumb = scene.add.rectangle(
      0,
      0,
      layout.thumbWidth,
      layout.thumbHeight,
      uiTheme.colors.primary,
    );
    this.label = this.text(layout.trackWidth / 2, -layout.labelOffset, "");
    const slow = this.text(0, layout.labelOffset, t("common.slow")).setOrigin(0, CENTER_ORIGIN);
    const instant = this.text(
      layout.trackWidth,
      layout.labelOffset,
      t("movement-slider-model.no.animation"),
    ).setOrigin(1, CENTER_ORIGIN);
    this.container.add([track, this.thumb, hit, this.label, slow, instant]);
    hit.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.focused = true;
        this.draggingPointer = pointer.id;
        this.setFromPointer(pointer);
      },
    );
    scene.input.on("pointermove", this.movePointer, this);
    scene.input.on("pointerup", this.releasePointer, this);
    scene.input.keyboard?.on("keydown", this.keyDown, this);
    this.container.once("destroy", this.destroy, this);
    scene.events.once("shutdown", this.destroy, this);
    this.refresh();
  }

  public refresh(): void {
    this.value = this.store.load();
    this.thumb.setPosition((this.value / MOVEMENT_SLIDER_MAX) * movementUi.trackWidth, 0);
    this.label.setText(
      t("movement-slider.movement", { value1: String(movementSpeedLabel(this.value)) }),
    );
  }

  public blur(): void {
    this.focused = false;
    this.draggingPointer = null;
  }

  private text(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, text, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
  }

  private setFromPointer(pointer: Phaser.Input.Pointer): void {
    const local = this.container.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    this.save(sliderValueAt(local.x, movementUi.trackWidth));
  }

  private movePointer(pointer: Phaser.Input.Pointer): void {
    if (this.draggingPointer === pointer.id && this.container.willRender(pointer.camera)) {
      this.setFromPointer(pointer);
    }
  }

  private releasePointer(pointer: Phaser.Input.Pointer): void {
    if (this.draggingPointer === pointer.id) this.draggingPointer = null;
  }

  private keyDown(event: KeyboardEvent): void {
    if (
      !this.focused ||
      !this.container.active ||
      !this.container.visible ||
      (this.container.parentContainer && !this.container.parentContainer.visible)
    )
      return;
    const value = sliderKeyValue(this.value, event.key);
    if (value === null) return;
    event.preventDefault();
    this.save(value);
  }

  private save(value: number): void {
    this.store.save(value);
    this.refresh();
  }

  private destroy(): void {
    this.blur();
    this.scene.input.off("pointermove", this.movePointer, this);
    this.scene.input.off("pointerup", this.releasePointer, this);
    this.scene.input.keyboard?.off("keydown", this.keyDown, this);
    this.scene.events.off("shutdown", this.destroy, this);
  }
}
