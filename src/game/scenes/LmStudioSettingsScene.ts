import Phaser from "phaser";

import { LmStudioClient } from "../../ai/lm-studio/lm-studio-client";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { getBrowserLmStudioSettings, type LmStudioSettings } from "../lm-studio/lm-studio-settings";
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
const BASE_URL_TOP_OFFSET = 460;
const MODEL_TOP_OFFSET = 720;
const STATUS_TOP_OFFSET = 1120;
const BUTTON_TOP_OFFSET = 1420;
const FIRST_BUTTON_LEFT_OFFSET = 240;
const MODEL_SELECTOR_TOP_OFFSET = 180;
const FIELD_WIDTH = 1800;
const FIELD_HEIGHT = 112;
const CONTENT_X = PANEL_X + CONTENT_LEFT_INSET;
const TITLE_Y = PANEL_Y + TITLE_TOP_OFFSET;
const FIELD_X = CONTENT_X;
const BASE_URL_Y = PANEL_Y + BASE_URL_TOP_OFFSET;
const MODEL_Y = PANEL_Y + MODEL_TOP_OFFSET;
const STATUS_Y = PANEL_Y + STATUS_TOP_OFFSET;
const BUTTON_Y = PANEL_Y + BUTTON_TOP_OFFSET;
const BUTTON_SPACING = 540;
const FIRST_BUTTON_X = CONTENT_X + FIRST_BUTTON_LEFT_OFFSET;
const BUTTON_WIDTH = 480;
const BUTTON_HEIGHT = 104;
const SMALL_BUTTON_Y = MODEL_Y + MODEL_SELECTOR_TOP_OFFSET;
const SMALL_BUTTON_WIDTH = 256;
const PREVIOUS_MODEL_X = CONTENT_X + CONTENT_LEFT_INSET;
const NEXT_MODEL_X = CONTENT_X + BUTTON_WIDTH;
const FIELD_BORDER_WIDTH = 8;
const TOP_LEFT_ORIGIN = 0;
const MAX_INPUT_LENGTH = 160;
const BACKSPACE_KEY = "Backspace";
const ENTER_KEY = "Enter";
const ESCAPE_KEY = "Escape";

type EditingField = "base-url" | "model-id" | null;
const DEFAULT_EDITING_FIELD: Exclude<EditingField, null> = "model-id";

export class LmStudioSettingsScene extends Phaser.Scene {
  private readonly settingsStore = getBrowserLmStudioSettings();
  private readonly client = new LmStudioClient();
  private settings!: LmStudioSettings;
  private presentationContainer!: Phaser.GameObjects.Container;
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private baseUrlText!: Phaser.GameObjects.Text;
  private modelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private modelIds: readonly string[] = [];
  private editingField: EditingField = null;
  private returnData: MainMenuSceneData = {};
  private readonly nativeKeyDownHandler = (event: KeyboardEvent): void => this.handleKeyDown(event);

  public constructor() {
    super("lm-studio-settings");
  }

  public create(data: MainMenuSceneData = {}): void {
    this.returnData = data;
    this.settings = this.settingsStore.load();
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
    const modelLabel = this.createText(CONTENT_X, MODEL_Y - uiTheme.spacing.md, "MODEL ID");
    const baseUrlField = this.createEditableField(BASE_URL_Y, "base-url");
    const modelField = this.createEditableField(MODEL_Y, "model-id");
    this.baseUrlText = baseUrlField.text;
    this.modelText = modelField.text;
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
      modelLabel,
      baseUrlField.background,
      this.baseUrlText,
      modelField.background,
      this.modelText,
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
    const previousModelButton = this.createButton(
      "<",
      PREVIOUS_MODEL_X,
      SMALL_BUTTON_Y,
      () => {
        this.changeModel(-1);
      },
      SMALL_BUTTON_WIDTH,
    );
    const nextModelButton = this.createButton(
      ">",
      NEXT_MODEL_X,
      SMALL_BUTTON_Y,
      () => this.changeModel(1),
      SMALL_BUTTON_WIDTH,
    );

    return [
      refreshButton.container,
      testButton.container,
      saveButton.container,
      previousModelButton.container,
      nextModelButton.container,
    ];
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
      this.modelIds = await this.client.listModels(this.settings.baseUrl);
      if (this.modelIds.length > 0 && !this.modelIds.includes(this.settings.modelId)) {
        this.settings = { ...this.settings, modelId: this.modelIds[0] ?? this.settings.modelId };
      }
      this.refreshFields();
      this.setStatus(this.modelIds.length > 0 ? "Models loaded." : "Server returned no models.");
    } catch {
      this.setStatus("Could not reach LM Studio. Start the server and restart npm run dev.");
    }
  }

  private async testConnection(): Promise<void> {
    this.setStatus("Testing LM Studio connection...");
    try {
      await this.client.listModels(this.settings.baseUrl);
      this.setStatus("Connection succeeded. Save settings to use this server.");
    } catch {
      this.setStatus("Connection failed. Start LM Studio server and restart npm run dev.");
    }
  }

  private changeModel(direction: number): void {
    if (this.modelIds.length === 0) {
      this.setStatus("Refresh models first, or edit the model ID manually.");
      return;
    }
    const selectedIndex = this.modelIds.indexOf(this.settings.modelId);
    const nextIndex = (selectedIndex + direction + this.modelIds.length) % this.modelIds.length;
    this.settings = {
      ...this.settings,
      modelId: this.modelIds[nextIndex] ?? this.settings.modelId,
    };
    this.refreshFields();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.editingField) return;
    event.preventDefault();
    if (event.key === ENTER_KEY || event.key === ESCAPE_KEY) {
      this.editingField = null;
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
    this.editingField = field;
    this.setStatus("Type text. ENTER confirms field.");
    this.refreshFields();
  }

  private currentEditingValue(): string {
    return this.editingField === "base-url" ? this.settings.baseUrl : this.settings.modelId;
  }

  private updateEditingValue(value: string): void {
    this.settings =
      this.editingField === "base-url"
        ? { ...this.settings, baseUrl: value }
        : { ...this.settings, modelId: value };
  }

  private refreshFields(): void {
    this.baseUrlText.setText(
      formatEditableText(this.settings.baseUrl, this.editingField === "base-url"),
    );
    this.modelText.setText(
      formatEditableText(this.settings.modelId, this.editingField === "model-id"),
    );
  }

  private setStatus(message: string): void {
    this.statusText.setText(message);
  }

  private saveAndReturn(): void {
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
