import type Phaser from "phaser";

import {
  appendMapNameCharacter,
  createMapNameEditState,
  deleteLastMapNameCharacter,
  type MapNameEditState,
} from "../../maps/map-name-editor";
import { uiTheme } from "../theme/ui-theme";
import { Button } from "./Button";
import { Panel } from "./Panel";

export interface MapRenameDialogOptions {
  readonly initialName: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

const LOGICAL_WIDTH = 3840;
const LOGICAL_HEIGHT = 2160;
const TOP_LEFT_ORIGIN = 0;
const CENTER_ORIGIN = 0.5;
const OVERLAY_ALPHA = 0.8;
const DIALOG_X = 1120;
const DIALOG_Y = 608;
const DIALOG_WIDTH = 1760;
const DIALOG_HEIGHT = 944;
const CONTENT_HORIZONTAL_PADDING = 128;
const INPUT_TOP_OFFSET = 368;
const INPUT_HORIZONTAL_INSET = 256;
const INPUT_HEIGHT = 112;
const INPUT_TEXT_PADDING = 32;
const HINT_TOP_OFFSET = 544;
const MESSAGE_TOP_OFFSET = 648;
const BUTTON_TOP_OFFSET = 792;
const CONFIRM_BUTTON_CENTER_OFFSET = 616;
const CANCEL_BUTTON_CENTER_OFFSET = 1144;
const BUTTON_WIDTH = 464;
const BUTTON_HEIGHT = 80;
const HALF = 2;
const INPUT_BORDER_WIDTH = uiTheme.spacing.xs / HALF;
const CONTENT_X = DIALOG_X + CONTENT_HORIZONTAL_PADDING;
const INPUT_Y = DIALOG_Y + INPUT_TOP_OFFSET;
const INPUT_WIDTH = DIALOG_WIDTH - INPUT_HORIZONTAL_INSET;
const INPUT_TEXT_X = CONTENT_X + INPUT_TEXT_PADDING;
const INPUT_TEXT_Y = INPUT_Y + INPUT_HEIGHT / 2;
const HINT_Y = DIALOG_Y + HINT_TOP_OFFSET;
const MESSAGE_Y = DIALOG_Y + MESSAGE_TOP_OFFSET;
const BUTTON_Y = DIALOG_Y + BUTTON_TOP_OFFSET;
const CONFIRM_BUTTON_X = DIALOG_X + CONFIRM_BUTTON_CENTER_OFFSET;
const CANCEL_BUTTON_X = DIALOG_X + CANCEL_BUTTON_CENTER_OFFSET;
const CURSOR = "_";

export class MapRenameDialog {
  public readonly container: Phaser.GameObjects.Container;
  private readonly inputText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private state: MapNameEditState;

  public constructor(scene: Phaser.Scene, options: MapRenameDialogOptions) {
    this.state = createMapNameEditState(options.initialName);
    this.container = scene.add.container();
    const overlay = scene.add
      .rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, uiTheme.colors.background, OVERLAY_ALPHA)
      .setOrigin(TOP_LEFT_ORIGIN)
      .setInteractive();
    const panel = new Panel(scene, {
      x: DIALOG_X,
      y: DIALOG_Y,
      width: DIALOG_WIDTH,
      height: DIALOG_HEIGHT,
      title: "RENAME MAP",
    });
    this.inputText = scene.add
      .text(INPUT_TEXT_X, INPUT_TEXT_Y, "", {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
      })
      .setOrigin(TOP_LEFT_ORIGIN, CENTER_ORIGIN);
    this.messageText = scene.add.text(CONTENT_X, MESSAGE_Y, "", {
      color: uiTheme.colors.dangerText,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.smallSize}px`,
    });
    const inputBackground = scene.add
      .rectangle(CONTENT_X, INPUT_Y, INPUT_WIDTH, INPUT_HEIGHT, uiTheme.colors.background)
      .setOrigin(TOP_LEFT_ORIGIN)
      .setStrokeStyle(INPUT_BORDER_WIDTH, uiTheme.colors.panelBorder);
    const hintText = scene.add.text(CONTENT_X, HINT_Y, "ENTER — CONFIRM   ESC — CANCEL", {
      color: uiTheme.colors.mutedText,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.smallSize}px`,
    });
    const confirmButton = new Button(scene, {
      x: CONFIRM_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "CONFIRM",
      onClick: options.onConfirm,
    });
    const cancelButton = new Button(scene, {
      x: CANCEL_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "CANCEL",
      onClick: options.onCancel,
    });

    this.container.add([
      overlay,
      panel.container,
      inputBackground,
      this.inputText,
      hintText,
      this.messageText,
      confirmButton.container,
      cancelButton.container,
    ]);
    this.refreshInputText();
  }

  public get editState(): MapNameEditState {
    return this.state;
  }

  public appendCharacter(character: string): void {
    this.state = { ...this.state, value: appendMapNameCharacter(this.state.value, character) };
    this.refreshInputText();
  }

  public deleteLastCharacter(): void {
    this.state = { ...this.state, value: deleteLastMapNameCharacter(this.state.value) };
    this.refreshInputText();
  }

  public setError(message: string): void {
    this.messageText.setText(message);
  }

  public destroy(): void {
    this.container.destroy(true);
  }

  private refreshInputText(): void {
    this.inputText.setText(`${this.state.value}${CURSOR}`);
  }
}
