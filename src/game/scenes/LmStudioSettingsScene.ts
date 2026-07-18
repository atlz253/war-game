import Phaser from "phaser";

import {
  DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS,
  LmStudioClient,
} from "../../ai/lm-studio/lm-studio-client";
import type { SideId } from "../../core/model/game-state";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import {
  getBrowserLmStudioSettings,
  isValidLmStudioTimeout,
  type LmStudioSettings,
  MAX_LM_STUDIO_TIMEOUT_MS,
  MIN_LM_STUDIO_TIMEOUT_MS,
} from "../lm-studio/lm-studio-settings";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { uiTheme } from "../ui/theme/ui-theme";
import type { MainMenuSceneData } from "./MainMenuScene";
import { MAIN_MENU_SCENE_KEY } from "./scene-keys";

const PANEL_X = 520;
const PANEL_Y = 200;
const PANEL_WIDTH = 2800;
const PANEL_HEIGHT = 1760;
const CONTENT_LEFT_INSET = 160;
const TITLE_TOP_OFFSET = 180;
const BASE_URL_TOP_OFFSET = 360;
const BLUE_MODEL_TOP_OFFSET = 600;
const RED_MODEL_TOP_OFFSET = 840;
const TIMEOUT_TOP_OFFSET = 1080;
const STATUS_TOP_OFFSET = 1320;
const BUTTON_TOP_OFFSET = 1500;
const FIRST_BUTTON_LEFT_OFFSET = 240;
const FIELD_WIDTH = 1568;
const FIELD_HEIGHT = 112;
const FIELD_CENTER_Y_OFFSET = FIELD_HEIGHT / 2;
const CONTENT_X = PANEL_X + CONTENT_LEFT_INSET;
const TITLE_Y = PANEL_Y + TITLE_TOP_OFFSET;
const FIELD_X = CONTENT_X;
const BASE_URL_Y = PANEL_Y + BASE_URL_TOP_OFFSET;
const BLUE_MODEL_Y = PANEL_Y + BLUE_MODEL_TOP_OFFSET;
const RED_MODEL_Y = PANEL_Y + RED_MODEL_TOP_OFFSET;
const TIMEOUT_Y = PANEL_Y + TIMEOUT_TOP_OFFSET;
const STATUS_Y = PANEL_Y + STATUS_TOP_OFFSET;
const BUTTON_Y = PANEL_Y + BUTTON_TOP_OFFSET;
const BUTTON_SPACING = 540;
const FIRST_BUTTON_X = CONTENT_X + FIRST_BUTTON_LEFT_OFFSET;
const BUTTON_WIDTH = 480;
const BUTTON_HEIGHT = 104;
const SMALL_BUTTON_WIDTH = 256;
const TIMEOUT_BUTTON_WIDTH = 544;
const MODEL_SELECTOR_GAP = 96;
const MODEL_SELECTOR_LEFT_X = FIELD_X + FIELD_WIDTH + MODEL_SELECTOR_GAP;
const PREVIOUS_MODEL_X = MODEL_SELECTOR_LEFT_X + SMALL_BUTTON_WIDTH / 2;
const NEXT_MODEL_X = PREVIOUS_MODEL_X + SMALL_BUTTON_WIDTH + uiTheme.spacing.md;
const TIMEOUT_BUTTON_X = MODEL_SELECTOR_LEFT_X + TIMEOUT_BUTTON_WIDTH / 2;
const FIELD_BORDER_WIDTH = 8;
const TOP_LEFT_ORIGIN = 0;
const MAX_INPUT_LENGTH = 160;
const MAX_TIMEOUT_INPUT_LENGTH = 6;
const BACKSPACE_KEY = "Backspace";
const ENTER_KEY = "Enter";
const ESCAPE_KEY = "Escape";
const DISABLE_TIMEOUT_LABEL = "DISABLE TIMEOUT";
const ENABLE_TIMEOUT_LABEL = "ENABLE TIMEOUT";
const DISABLED_TIMEOUT_LABEL = "DISABLED";

type EditingField = "base-url" | "blue-model-id" | "red-model-id" | "timeout-ms" | null;
const DEFAULT_EDITING_FIELD: Exclude<EditingField, null> = "blue-model-id";

export class LmStudioSettingsScene extends Phaser.Scene {
  private readonly settingsStore = getBrowserLmStudioSettings();
  private readonly client = new LmStudioClient();
  private settings!: LmStudioSettings;
  private presentationContainer!: Phaser.GameObjects.Container;
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private baseUrlText!: Phaser.GameObjects.Text;
  private blueModelText!: Phaser.GameObjects.Text;
  private redModelText!: Phaser.GameObjects.Text;
  private timeoutText!: Phaser.GameObjects.Text;
  private timeoutToggleButton!: Button;
  private statusText!: Phaser.GameObjects.Text;
  private modelIds: readonly string[] = [];
  private editingField: EditingField = null;
  private timeoutInput = "";
  private returnData: MainMenuSceneData = {};
  private readonly nativeKeyDownHandler = (event: KeyboardEvent): void => this.handleKeyDown(event);

  public constructor() {
    super("lm-studio-settings");
  }

  public create(data: MainMenuSceneData = {}): void {
    this.returnData = data;
    this.settings = this.settingsStore.load();
    this.timeoutInput = formatTimeout(this.settings.requestTimeoutMs);
    this.editingField = DEFAULT_EDITING_FIELD;
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    this.presentationContainer = this.add.container(0, 0, this.createContents());
    this.refreshFields();
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    window.addEventListener("keydown", this.nativeKeyDownHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private createContents(): Phaser.GameObjects.GameObject[] {
    const panel = new Panel(this, {
      x: PANEL_X,
      y: PANEL_Y,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      title: "LM STUDIO SETTINGS",
    });
    const title = this.createText(CONTENT_X, TITLE_Y, "LOCAL OPENAI-COMPATIBLE SERVER");
    const baseUrlLabel = this.createText(
      CONTENT_X,
      BASE_URL_Y - uiTheme.spacing.md,
      "SERVER BASE URL",
    );
    const blueModelLabel = this.createText(
      CONTENT_X,
      BLUE_MODEL_Y - uiTheme.spacing.md,
      "BLUE MODEL ID",
    );
    const redModelLabel = this.createText(
      CONTENT_X,
      RED_MODEL_Y - uiTheme.spacing.md,
      "RED MODEL ID",
    );
    const timeoutLabel = this.createText(
      CONTENT_X,
      TIMEOUT_Y - uiTheme.spacing.md,
      "REQUEST TIMEOUT (MS)",
    );
    const baseUrlField = this.createEditableField(BASE_URL_Y, "base-url");
    const blueModelField = this.createEditableField(BLUE_MODEL_Y, "blue-model-id");
    const redModelField = this.createEditableField(RED_MODEL_Y, "red-model-id");
    const timeoutField = this.createEditableField(TIMEOUT_Y, "timeout-ms");
    this.baseUrlText = baseUrlField.text;
    this.blueModelText = blueModelField.text;
    this.redModelText = redModelField.text;
    this.timeoutText = timeoutField.text;
    this.statusText = this.createText(
      CONTENT_X,
      STATUS_Y,
      "Click a field to edit. Use /lm-studio-api/v1 with npm run dev.",
      true,
    );
    const buttons = this.createButtons();

    return [
      panel.container,
      title,
      baseUrlLabel,
      blueModelLabel,
      redModelLabel,
      timeoutLabel,
      baseUrlField.background,
      this.baseUrlText,
      blueModelField.background,
      this.blueModelText,
      redModelField.background,
      this.redModelText,
      timeoutField.background,
      this.timeoutText,
      this.statusText,
      ...buttons,
    ];
  }

  private createButtons(): Phaser.GameObjects.GameObject[] {
    const refreshButton = this.createButton("REFRESH MODELS", FIRST_BUTTON_X, BUTTON_Y, () => {
      void this.refreshModels();
    });
    const testButton = this.createButton(
      "TEST CONNECTION",
      FIRST_BUTTON_X + BUTTON_SPACING,
      BUTTON_Y,
      () => {
        void this.testConnection();
      },
    );
    const saveButton = this.createButton(
      "SAVE & BACK",
      FIRST_BUTTON_X + BUTTON_SPACING * 2,
      BUTTON_Y,
      () => {
        this.saveAndReturn();
      },
    );
    const blueSelectors = this.createModelSelectors("blue", BLUE_MODEL_Y);
    const redSelectors = this.createModelSelectors("red", RED_MODEL_Y);
    this.timeoutToggleButton = this.createButton(
      this.settings.requestTimeoutMs === null ? ENABLE_TIMEOUT_LABEL : DISABLE_TIMEOUT_LABEL,
      TIMEOUT_BUTTON_X,
      TIMEOUT_Y + FIELD_CENTER_Y_OFFSET,
      () => this.toggleTimeout(),
      TIMEOUT_BUTTON_WIDTH,
    );

    return [
      refreshButton.container,
      testButton.container,
      saveButton.container,
      ...blueSelectors,
      ...redSelectors,
      this.timeoutToggleButton.container,
    ];
  }

  private createModelSelectors(side: SideId, y: number): Phaser.GameObjects.GameObject[] {
    const previousModelButton = this.createButton(
      "<",
      PREVIOUS_MODEL_X,
      y + FIELD_CENTER_Y_OFFSET,
      () => this.changeModel(side, -1),
      SMALL_BUTTON_WIDTH,
    );
    const nextModelButton = this.createButton(
      ">",
      NEXT_MODEL_X,
      y + FIELD_CENTER_Y_OFFSET,
      () => this.changeModel(side, 1),
      SMALL_BUTTON_WIDTH,
    );

    return [previousModelButton.container, nextModelButton.container];
  }

  private createEditableField(
    y: number,
    field: Exclude<EditingField, null>,
  ): { background: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const background = this.add
      .rectangle(FIELD_X, y, FIELD_WIDTH, FIELD_HEIGHT, uiTheme.colors.background)
      .setOrigin(TOP_LEFT_ORIGIN)
      .setStrokeStyle(FIELD_BORDER_WIDTH, uiTheme.colors.panelBorder)
      .setInteractive({ useHandCursor: true });
    background.on(Phaser.Input.Events.POINTER_DOWN, () => this.startEditing(field));

    return {
      background,
      text: this.createText(FIELD_X + uiTheme.spacing.md, y + uiTheme.spacing.sm, ""),
    };
  }

  private createText(x: number, y: number, text: string, muted = false): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color: muted ? uiTheme.colors.mutedText : uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.normalSize}px`,
    });
  }

  private createButton(
    label: string,
    x: number,
    y: number,
    onClick: () => void,
    width = BUTTON_WIDTH,
  ): Button {
    return new Button(this, { x, y, width, height: BUTTON_HEIGHT, label, onClick });
  }

  private async refreshModels(): Promise<void> {
    this.setStatus("Loading models from LM Studio...");
    try {
      this.modelIds = await this.client.listModels(
        this.settings.baseUrl,
        this.settings.requestTimeoutMs,
      );
      this.selectFirstAvailableModel("blue");
      this.selectFirstAvailableModel("red");
      this.refreshFields();
      this.setStatus(this.modelIds.length > 0 ? "Models loaded." : "Server returned no models.");
    } catch {
      this.setStatus("Could not reach LM Studio. Start the server and restart npm run dev.");
    }
  }

  private async testConnection(): Promise<void> {
    this.setStatus("Testing LM Studio connection...");
    try {
      await this.client.listModels(this.settings.baseUrl, this.settings.requestTimeoutMs);
      this.setStatus("Connection succeeded. Save settings to use this server.");
    } catch {
      this.setStatus("Connection failed. Start LM Studio server and restart npm run dev.");
    }
  }

  private changeModel(side: SideId, direction: number): void {
    if (this.modelIds.length === 0) {
      this.setStatus("Refresh models first, or edit the model ID manually.");
      return;
    }
    const selectedIndex = this.modelIds.indexOf(this.getModelId(side));
    const nextIndex = (selectedIndex + direction + this.modelIds.length) % this.modelIds.length;
    this.setModelId(side, this.modelIds[nextIndex] ?? this.getModelId(side));
    this.refreshFields();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.editingField) return;
    event.preventDefault();
    if (event.key === ENTER_KEY) {
      this.finishEditing();
    } else if (event.key === ESCAPE_KEY) {
      this.cancelEditing();
    } else if (event.key === BACKSPACE_KEY) {
      this.updateEditingValue(this.currentEditingValue().slice(0, -1));
    } else if (isPrintableCharacter(event)) {
      this.updateEditingValue(
        `${this.currentEditingValue()}${event.key}`.slice(0, MAX_INPUT_LENGTH),
      );
    }
    this.refreshFields();
  }

  private startEditing(field: Exclude<EditingField, null>): void {
    if (field === "timeout-ms" && this.settings.requestTimeoutMs === null) {
      this.setStatus("Enable the timeout before editing its value.");
      return;
    }
    this.editingField = field;
    if (field === "timeout-ms") this.timeoutInput = formatTimeout(this.settings.requestTimeoutMs);
    this.setStatus("Type text. ENTER confirms field.");
    this.refreshFields();
  }

  private currentEditingValue(): string {
    if (this.editingField === "base-url") return this.settings.baseUrl;
    if (this.editingField === "timeout-ms") return this.timeoutInput;
    return this.editingField === "blue-model-id"
      ? this.settings.blueModelId
      : this.settings.redModelId;
  }

  private updateEditingValue(value: string): void {
    if (this.editingField === "base-url") {
      this.settings = { ...this.settings, baseUrl: value };
      return;
    }
    if (this.editingField === "timeout-ms") {
      this.timeoutInput = value.replace(/\D/g, "").slice(0, MAX_TIMEOUT_INPUT_LENGTH);
      return;
    }
    this.setModelId(this.editingField === "blue-model-id" ? "blue" : "red", value);
  }

  private refreshFields(): void {
    this.baseUrlText.setText(
      formatEditableText(this.settings.baseUrl, this.editingField === "base-url"),
    );
    this.blueModelText.setText(
      formatEditableText(this.settings.blueModelId, this.editingField === "blue-model-id"),
    );
    this.redModelText.setText(
      formatEditableText(this.settings.redModelId, this.editingField === "red-model-id"),
    );
    const timeoutValue =
      this.editingField === "timeout-ms"
        ? this.timeoutInput
        : formatTimeout(this.settings.requestTimeoutMs);
    this.timeoutText.setText(formatEditableText(timeoutValue, this.editingField === "timeout-ms"));
  }

  private finishEditing(): void {
    if (this.editingField === "timeout-ms" && !this.commitTimeout()) return;
    this.editingField = null;
  }

  private cancelEditing(): void {
    this.timeoutInput = formatTimeout(this.settings.requestTimeoutMs);
    this.editingField = null;
  }

  private commitTimeout(): boolean {
    const timeoutMs = Number(this.timeoutInput);

    if (!isValidLmStudioTimeout(timeoutMs)) {
      this.setStatus(`Timeout must be ${MIN_LM_STUDIO_TIMEOUT_MS}–${MAX_LM_STUDIO_TIMEOUT_MS} ms.`);
      return false;
    }

    this.settings = { ...this.settings, requestTimeoutMs: timeoutMs };
    this.timeoutInput = String(timeoutMs);
    return true;
  }

  private toggleTimeout(): void {
    this.editingField = null;
    const enteredTimeoutMs = Number(this.timeoutInput);
    this.settings = {
      ...this.settings,
      requestTimeoutMs:
        this.settings.requestTimeoutMs === null
          ? isValidLmStudioTimeout(enteredTimeoutMs)
            ? enteredTimeoutMs
            : DEFAULT_LM_STUDIO_REQUEST_TIMEOUT_MS
          : null,
    };
    this.timeoutInput = formatTimeout(this.settings.requestTimeoutMs);
    this.timeoutToggleButton.setLabel(
      this.settings.requestTimeoutMs === null ? ENABLE_TIMEOUT_LABEL : DISABLE_TIMEOUT_LABEL,
    );
    this.refreshFields();
    this.setStatus(
      this.settings.requestTimeoutMs === null
        ? "Timeout disabled. Requests may wait indefinitely."
        : "Timeout enabled.",
    );
  }

  private selectFirstAvailableModel(side: SideId): void {
    if (this.modelIds.length > 0 && !this.modelIds.includes(this.getModelId(side))) {
      this.setModelId(side, this.modelIds[0] ?? this.getModelId(side));
    }
  }

  private getModelId(side: SideId): string {
    return side === "blue" ? this.settings.blueModelId : this.settings.redModelId;
  }

  private setModelId(side: SideId, modelId: string): void {
    this.settings =
      side === "blue"
        ? { ...this.settings, blueModelId: modelId }
        : { ...this.settings, redModelId: modelId };
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
  }

  private saveAndReturn(): void {
    if (this.editingField === "timeout-ms" && !this.commitTimeout()) return;
    this.settingsStore.save(this.settings);
    this.scene.start(MAIN_MENU_SCENE_KEY, this.returnData);
  }

  private updatePresentationViewport(): void {
    const viewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.cameras.main
      .setViewport(0, 0, this.scale.width, this.scale.height)
      .setScroll(0, 0)
      .setZoom(1);
    this.safeAreaBackground
      .setPosition(viewport.x, viewport.y)
      .setSize(viewport.width, viewport.height);
    this.presentationContainer.setPosition(viewport.x, viewport.y).setScale(viewport.scale);
  }

  private shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    window.removeEventListener("keydown", this.nativeKeyDownHandler);
  }
}

function isPrintableCharacter(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey;
}

function formatEditableText(value: string, isEditing: boolean): string {
  return `${value || "<empty>"}${isEditing ? "_" : ""}`;
}

function formatTimeout(timeoutMs: number | null): string {
  return timeoutMs === null ? DISABLED_TIMEOUT_LABEL : String(timeoutMs);
}
