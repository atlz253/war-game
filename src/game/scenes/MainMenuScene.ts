import Phaser from "phaser";
import { isMapReadyForMatch } from "../../core/maps/map-definition";

import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { getBrowserLmStudioSettings, isLmStudioSideReady } from "../lm-studio/lm-studio-settings";
import { type CatalogMap, formatCatalogMap, getBrowserMapCatalog } from "../maps/map-catalog";
import {
  createDefaultMatchConfiguration,
  getParticipantLabel,
  toggleParticipant,
  withLmStudioSettings,
} from "../match/match-configuration";
import { Button } from "../ui/components/Button";
import { movementUi } from "../ui/theme/movement-ui";
import { uiTheme } from "../ui/theme/ui-theme";
import {
  BATTLE_SCENE_KEY,
  CAMPAIGN_LIBRARY_SCENE_KEY,
  LM_STUDIO_SETTINGS_SCENE_KEY,
  MAP_EDITOR_SCENE_KEY,
  MOVEMENT_SETTINGS_SCENE_KEY,
  MULTIPLAYER_HOST_SCENE_KEY,
  MULTIPLAYER_JOIN_SCENE_KEY,
  REPLAY_LIBRARY_SCENE_KEY,
} from "./scene-keys";

const MENU_CENTER_X = 1920;
const MENU_PANEL_CENTER_Y = 1080;
const MENU_PANEL_WIDTH = 2400;
const MENU_PANEL_HEIGHT = 1900;
const MENU_PANEL_BORDER_WIDTH = 8;
const MENU_TITLE_Y = 560;
const SIDE_LABEL_X = 1280;
const BLUE_SIDE_Y = 820;
const RED_SIDE_Y = 1040;
const MODEL_LABEL_TOP_OFFSET = 88;
const ROLE_BUTTON_X = 2580;
const ROLE_BUTTON_WIDTH = 920;
const ROLE_BUTTON_HEIGHT = 128;
const MAP_LABEL_Y = 1320;
const MAP_PREVIOUS_X = 1440;
const MAP_NEXT_X = 2400;
const MAP_BUTTON_WIDTH = 224;
const MAP_BUTTON_HEIGHT = 112;
const LM_STUDIO_SETTINGS_X = MENU_CENTER_X;
const LM_STUDIO_SETTINGS_Y = 1480;
const LM_STUDIO_SETTINGS_WIDTH = 1120;
const EDITOR_BUTTON_Y = 1640;
const REPLAY_LIBRARY_BUTTON_X = 2240;
const MAP_EDITOR_BUTTON_X = 1600;
const MENU_SECONDARY_BUTTON_WIDTH = 520;
const MULTIPLAYER_HOST_BUTTON_X = 1050;
const MULTIPLAYER_JOIN_BUTTON_X = 2790;
const MENU_START_BUTTON_Y = 1820;
const MENU_START_BUTTON_WIDTH = 1120;
const MENU_START_BUTTON_HEIGHT = 176;
const MENU_INSTRUCTIONS_Y = 1960;
const CENTER_ORIGIN = 0.5;
const TOP_ORIGIN = 0;

export interface MainMenuSceneData {
  readonly matchConfiguration?: ReturnType<typeof createDefaultMatchConfiguration>;
}

export class MainMenuScene extends Phaser.Scene {
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private matchConfiguration = createDefaultMatchConfiguration();
  private readonly mapCatalog = getBrowserMapCatalog();
  private readonly lmStudioSettings = getBrowserLmStudioSettings();
  private selectedMapKey: string | null = null;
  private blueRoleButton!: Button;
  private redRoleButton!: Button;
  private blueModelText!: Phaser.GameObjects.Text;
  private redModelText!: Phaser.GameObjects.Text;
  private selectedMapText!: Phaser.GameObjects.Text;
  private startButton!: Button;
  private instructionsText!: Phaser.GameObjects.Text;

  public constructor() {
    super("main-menu");
  }

  public create(data: MainMenuSceneData = {}): void {
    const settings = this.lmStudioSettings.load();
    this.matchConfiguration = withLmStudioSettings(
      data.matchConfiguration ?? createDefaultMatchConfiguration(settings),
      settings,
    );
    const children = [
      ...this.createStaticElements(),
      ...this.createRoleControls(),
      ...this.createMapControls(),
      ...this.createLaunchControls(),
    ];

    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    this.presentationContainer = this.add.container(0, 0, children);
    this.refreshSelectedMapText();
    this.refreshParticipantControls();
    this.refreshLaunchAvailability();
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindPresentationResize, this);
  }

  private createStaticElements(): Phaser.GameObjects.GameObject[] {
    const panel = this.add
      .rectangle(
        MENU_CENTER_X,
        MENU_PANEL_CENTER_Y,
        MENU_PANEL_WIDTH,
        MENU_PANEL_HEIGHT,
        uiTheme.colors.panel,
      )
      .setStrokeStyle(MENU_PANEL_BORDER_WIDTH, uiTheme.colors.panelBorder);
    const title = this.add
      .text(MENU_CENTER_X, MENU_TITLE_Y, "AI WAR GAME", {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.titleSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);

    const movementSettings = new Button(this, {
      x: MENU_CENTER_X,
      y: movementUi.menuButtonY,
      width: LM_STUDIO_SETTINGS_WIDTH,
      height: MAP_BUTTON_HEIGHT,
      label: "MOVEMENT SETTINGS",
      onClick: () =>
        this.scene.start(MOVEMENT_SETTINGS_SCENE_KEY, {
          matchConfiguration: this.matchConfiguration,
        }),
    });

    return [
      panel,
      title,
      movementSettings.container,
      this.createSideLabel("BLUE COMMANDER", BLUE_SIDE_Y),
      this.createSideLabel("RED COMMANDER", RED_SIDE_Y),
    ];
  }

  private createRoleControls(): Phaser.GameObjects.GameObject[] {
    this.blueRoleButton = this.createRoleButton(BLUE_SIDE_Y, "blue");
    this.redRoleButton = this.createRoleButton(RED_SIDE_Y, "red");
    this.blueModelText = this.createModelText(BLUE_SIDE_Y);
    this.redModelText = this.createModelText(RED_SIDE_Y);
    return [
      this.blueRoleButton.container,
      this.redRoleButton.container,
      this.blueModelText,
      this.redModelText,
    ];
  }

  private createMapControls(): Phaser.GameObjects.GameObject[] {
    this.selectedMapText = this.add
      .text(MENU_CENTER_X, MAP_LABEL_Y, "", {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const previousMapButton = this.createMapButton(MAP_PREVIOUS_X, "< MAP", -1);
    const nextMapButton = this.createMapButton(MAP_NEXT_X, "MAP >", 1);
    const editorButton = new Button(this, {
      x: MAP_EDITOR_BUTTON_X,
      y: EDITOR_BUTTON_Y,
      width: MENU_SECONDARY_BUTTON_WIDTH,
      height: ROLE_BUTTON_HEIGHT,
      label: "MAP EDITOR",
      onClick: () => this.openMapEditor(),
    });
    const replayLibraryButton = new Button(this, {
      x: REPLAY_LIBRARY_BUTTON_X,
      y: EDITOR_BUTTON_Y,
      width: MENU_SECONDARY_BUTTON_WIDTH,
      height: ROLE_BUTTON_HEIGHT,
      label: "REPLAYS",
      onClick: () => this.scene.start(REPLAY_LIBRARY_SCENE_KEY),
    });
    const lmStudioSettingsButton = new Button(this, {
      x: LM_STUDIO_SETTINGS_X,
      y: LM_STUDIO_SETTINGS_Y,
      width: LM_STUDIO_SETTINGS_WIDTH,
      height: MAP_BUTTON_HEIGHT,
      label: "LM STUDIO SETTINGS",
      onClick: () => this.openLmStudioSettings(),
    });
    const hostMultiplayerButton = new Button(this, {
      x: MULTIPLAYER_HOST_BUTTON_X,
      y: LM_STUDIO_SETTINGS_Y,
      width: MENU_SECONDARY_BUTTON_WIDTH,
      height: MAP_BUTTON_HEIGHT,
      label: "HOST P2P",
      onClick: () => this.scene.start(MULTIPLAYER_HOST_SCENE_KEY),
    });
    const joinMultiplayerButton = new Button(this, {
      x: MULTIPLAYER_JOIN_BUTTON_X,
      y: LM_STUDIO_SETTINGS_Y,
      width: MENU_SECONDARY_BUTTON_WIDTH,
      height: MAP_BUTTON_HEIGHT,
      label: "JOIN P2P",
      onClick: () => this.scene.start(MULTIPLAYER_JOIN_SCENE_KEY),
    });

    return [
      this.selectedMapText,
      new Button(this, {
        x: MULTIPLAYER_HOST_BUTTON_X,
        y: EDITOR_BUTTON_Y,
        width: MENU_SECONDARY_BUTTON_WIDTH,
        height: ROLE_BUTTON_HEIGHT,
        label: "CAMPAIGNS",
        onClick: () => this.scene.start(CAMPAIGN_LIBRARY_SCENE_KEY),
      }).container,
      previousMapButton.container,
      nextMapButton.container,
      editorButton.container,
      replayLibraryButton.container,
      lmStudioSettingsButton.container,
      hostMultiplayerButton.container,
      joinMultiplayerButton.container,
    ];
  }

  private createLaunchControls(): Phaser.GameObjects.GameObject[] {
    this.startButton = new Button(this, {
      x: MENU_CENTER_X,
      y: MENU_START_BUTTON_Y,
      width: MENU_START_BUTTON_WIDTH,
      height: MENU_START_BUTTON_HEIGHT,
      label: "START MATCH",
      onClick: () => this.startMatch(),
    });
    this.instructionsText = this.add
      .text(
        MENU_CENTER_X,
        MENU_INSTRUCTIONS_Y,
        "Choose commanders and a map, then start the match.",
        {
          color: uiTheme.colors.mutedText,
          fontFamily: uiTheme.font.family,
          fontSize: `${uiTheme.font.smallSize}px`,
        },
      )
      .setOrigin(CENTER_ORIGIN, TOP_ORIGIN);

    return [this.startButton.container, this.instructionsText];
  }

  private createSideLabel(label: string, y: number): Phaser.GameObjects.Text {
    return this.add
      .text(SIDE_LABEL_X, y, label, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
      })
      .setOrigin(0, CENTER_ORIGIN);
  }

  private createRoleButton(y: number, side: "blue" | "red"): Button {
    return new Button(this, {
      x: ROLE_BUTTON_X,
      y,
      width: ROLE_BUTTON_WIDTH,
      height: ROLE_BUTTON_HEIGHT,
      label: getParticipantLabel(this.matchConfiguration[side]),
      onClick: () => this.toggleRole(side),
    });
  }

  private createModelText(y: number): Phaser.GameObjects.Text {
    return this.add
      .text(ROLE_BUTTON_X, y + MODEL_LABEL_TOP_OFFSET, "", {
        color: uiTheme.colors.mutedText,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
  }

  private createMapButton(x: number, label: string, direction: number): Button {
    return new Button(this, {
      x,
      y: MAP_LABEL_Y,
      width: MAP_BUTTON_WIDTH,
      height: MAP_BUTTON_HEIGHT,
      label,
      onClick: () => this.changeSelectedMap(direction),
    });
  }

  private openMapEditor(): void {
    const selectedMap = this.getSelectedMap();
    this.scene.start(MAP_EDITOR_SCENE_KEY, {
      mapId: selectedMap?.map.id,
      mapSource: selectedMap?.source,
      matchConfiguration: this.matchConfiguration,
    });
  }

  private openLmStudioSettings(): void {
    this.scene.start(LM_STUDIO_SETTINGS_SCENE_KEY, { matchConfiguration: this.matchConfiguration });
  }

  private startMatch(): void {
    this.matchConfiguration = withLmStudioSettings(
      this.matchConfiguration,
      this.lmStudioSettings.load(),
    );
    const selectedMap = this.getSelectedMap();
    if (
      this.isLmStudioConfigurationMissing() ||
      !selectedMap ||
      !isMapReadyForMatch(selectedMap.map)
    ) {
      this.refreshLaunchAvailability();
      return;
    }
    this.scene.start(BATTLE_SCENE_KEY, {
      matchConfiguration: this.matchConfiguration,
      mapDefinition: selectedMap.map,
    });
  }

  private updatePresentationViewport(): void {
    const { width, height, scale, contentX, contentY } = calculatePresentationViewport(
      this.scale.width,
      this.scale.height,
    );

    this.cameras.main
      .setViewport(0, 0, this.scale.width, this.scale.height)
      .setScroll(0, 0)
      .setZoom(1);
    this.safeAreaBackground.setPosition(0, 0).setSize(width, height);
    this.presentationContainer.setPosition(contentX, contentY).setScale(scale);
  }

  private toggleRole(side: "blue" | "red"): void {
    this.matchConfiguration = toggleParticipant(this.matchConfiguration, side);
    this.refreshParticipantControls();
    this.refreshLaunchAvailability();
  }

  private refreshParticipantControls(): void {
    this.blueRoleButton.setLabel(getParticipantLabel(this.matchConfiguration.blue));
    this.redRoleButton.setLabel(getParticipantLabel(this.matchConfiguration.red));
    this.refreshModelText("blue", this.blueModelText);
    this.refreshModelText("red", this.redModelText);
  }

  private refreshModelText(side: "blue" | "red", text: Phaser.GameObjects.Text): void {
    const usesLmStudio = this.matchConfiguration[side] === "lm-studio-ai";
    const modelId = this.matchConfiguration.lmStudioConnections[side].modelId;

    text.setVisible(usesLmStudio).setText(`MODEL: ${modelId || "<not selected>"}`);
  }

  private changeSelectedMap(direction: number): void {
    const maps = this.mapCatalog.list();
    if (maps.length === 0) return;
    const selectedIndex = this.selectedMapKey
      ? maps.findIndex((entry) => catalogMapKey(entry) === this.selectedMapKey)
      : 0;
    const nextIndex = (selectedIndex + direction + maps.length) % maps.length;
    this.selectedMapKey = catalogMapKey(maps[nextIndex] as CatalogMap);
    this.refreshSelectedMapText();
  }

  private getSelectedMap(): CatalogMap | null {
    const maps = this.mapCatalog.list();
    const selected = this.selectedMapKey
      ? maps.find((entry) => catalogMapKey(entry) === this.selectedMapKey)
      : undefined;
    return selected ?? maps[0] ?? null;
  }

  private refreshSelectedMapText(): void {
    const selectedMap = this.getSelectedMap();
    this.selectedMapText.setText(
      selectedMap ? `MAP: ${formatCatalogMap(selectedMap)}` : "MAP: no maps available",
    );
  }

  private refreshLaunchAvailability(): void {
    const selectedMap = this.getSelectedMap();
    const isReady =
      !this.isLmStudioConfigurationMissing() &&
      selectedMap !== null &&
      isMapReadyForMatch(selectedMap.map);
    this.startButton.setEnabled(isReady);
    this.instructionsText.setText(
      isReady
        ? "Choose commanders and a map, then start the match."
        : selectedMap
          ? isMapReadyForMatch(selectedMap.map)
            ? "Open LM Studio Settings and select a model before starting."
            : "Standalone matches require Blue and Red units. Open CAMPAIGNS for the tutorial."
          : "No maps available. Add a local map or restore a built-in map file.",
    );
  }

  private isLmStudioConfigurationMissing(): boolean {
    const settings = this.lmStudioSettings.load();

    return (
      (this.matchConfiguration.blue === "lm-studio-ai" && !isLmStudioSideReady(settings, "blue")) ||
      (this.matchConfiguration.red === "lm-studio-ai" && !isLmStudioSideReady(settings, "red"))
    );
  }

  private unbindPresentationResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}

function catalogMapKey(entry: CatalogMap): string {
  return `${entry.source}:${entry.map.id}`;
}
