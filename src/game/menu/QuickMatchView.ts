import type Phaser from "phaser";
import { isMapReadyForMatch } from "../../core/maps/map-definition";
import { getBrowserLmStudioSettings, isLmStudioSideReady } from "../lm-studio/lm-studio-settings";
import { t } from "../localization/runtime";
import { type CatalogMap, formatCatalogMap, getBrowserMapCatalog } from "../maps/map-catalog";
import {
  createDefaultMatchConfiguration,
  getParticipantLabel,
  toggleParticipant,
  withLmStudioSettings,
} from "../match/match-configuration";
import { BATTLE_SCENE_KEY } from "../scenes/scene-keys";
import { Button } from "../ui/components/Button";
import { menuUi as ui } from "../ui/theme/menu-ui";
import { uiTheme } from "../ui/theme/ui-theme";
import type { MainMenuSceneData } from "./menu-navigation";

const CENTER_ORIGIN = 0.5;
const TOP_ORIGIN = 0;

export class QuickMatchView {
  public readonly children: Phaser.GameObjects.GameObject[];
  private matchConfiguration = createDefaultMatchConfiguration();
  private selectedMapKey: string | null = null;
  private readonly mapCatalog = getBrowserMapCatalog();
  private readonly lmStudioSettings = getBrowserLmStudioSettings();
  private blueRoleButton!: Button;
  private redRoleButton!: Button;
  private blueModelText!: Phaser.GameObjects.Text;
  private redModelText!: Phaser.GameObjects.Text;
  private selectedMapText!: Phaser.GameObjects.Text;
  private startButton!: Button;
  private instructionsText!: Phaser.GameObjects.Text;

  public constructor(
    private readonly scene: Phaser.Scene,
    data: MainMenuSceneData,
  ) {
    this.selectedMapKey = data.selectedMapKey ?? null;
    this.matchConfiguration = withLmStudioSettings(
      data.matchConfiguration ?? createDefaultMatchConfiguration(),
      this.lmStudioSettings.load(),
    );
    this.children = [
      this.createSideLabel(t("main-menu.blue.commander"), ui.blueY),
      this.createSideLabel(t("main-menu.red.commander"), ui.redY),
      ...this.createRoleControls(),
      ...this.createMapControls(),
      ...this.createLaunchControls(),
    ];
    this.refreshSelectedMapText();
    this.refreshParticipantControls();
    this.refreshLaunchAvailability();
  }

  public get data(): MainMenuSceneData {
    return { matchConfiguration: this.matchConfiguration, selectedMapKey: this.selectedMapKey };
  }

  private createRoleControls(): Phaser.GameObjects.GameObject[] {
    this.blueRoleButton = this.createRoleButton(ui.blueY, "blue");
    this.redRoleButton = this.createRoleButton(ui.redY, "red");
    this.blueModelText = this.createModelText(ui.blueY);
    this.redModelText = this.createModelText(ui.redY);
    return [
      this.blueRoleButton.container,
      this.redRoleButton.container,
      this.blueModelText,
      this.redModelText,
    ];
  }

  private createMapControls(): Phaser.GameObjects.GameObject[] {
    this.selectedMapText = this.scene.add
      .text(ui.centerX, ui.mapY, "", {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
        wordWrap: { width: ui.mapLabelWidth, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(CENTER_ORIGIN);
    return [
      this.selectedMapText,
      this.createMapButton(ui.mapPreviousX, t("campaign-editor.map"), -1).container,
      this.createMapButton(ui.mapNextX, t("campaign-editor.map.2"), 1).container,
    ];
  }

  private createLaunchControls(): Phaser.GameObjects.GameObject[] {
    this.startButton = new Button(this.scene, {
      x: ui.centerX,
      y: ui.startY,
      width: ui.buttonWidth,
      height: ui.startHeight,
      label: t("main-menu.start.match"),
      onClick: () => this.startMatch(),
    });
    this.instructionsText = this.scene.add
      .text(
        ui.centerX,
        ui.instructionsY,
        t("main-menu.choose.commanders.and.a.map.then.start.the.match"),
        {
          color: uiTheme.colors.mutedText,
          fontFamily: uiTheme.font.family,
          fontSize: `${uiTheme.font.smallSize}px`,
          wordWrap: { width: ui.instructionsWidth, useAdvancedWrap: true },
          align: "center",
        },
      )
      .setOrigin(CENTER_ORIGIN, TOP_ORIGIN);

    return [this.startButton.container, this.instructionsText];
  }

  private createSideLabel(label: string, y: number): Phaser.GameObjects.Text {
    return this.scene.add
      .text(ui.sideLabelX, y, label, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
        wordWrap: { width: ui.commanderLabelWidth, useAdvancedWrap: true },
      })
      .setOrigin(0, CENTER_ORIGIN);
  }

  private createRoleButton(y: number, side: "blue" | "red"): Button {
    return new Button(this.scene, {
      x: ui.roleX,
      y,
      width: ui.roleWidth,
      height: ui.buttonHeight,
      label: getParticipantLabel(this.matchConfiguration[side]),
      onClick: () => this.toggleRole(side),
    });
  }

  private createModelText(y: number): Phaser.GameObjects.Text {
    return this.scene.add
      .text(ui.roleX, y + ui.modelOffset, "", {
        color: uiTheme.colors.mutedText,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
        wordWrap: { width: ui.roleWidth, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(CENTER_ORIGIN);
  }

  private createMapButton(x: number, label: string, direction: number): Button {
    return new Button(this.scene, {
      x,
      y: ui.mapY,
      width: ui.mapButtonWidth,
      height: ui.buttonHeight,
      label,
      onClick: () => this.changeSelectedMap(direction),
    });
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
    this.scene.scene.start(BATTLE_SCENE_KEY, {
      matchConfiguration: this.matchConfiguration,
      mapDefinition: selectedMap.map,
    });
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

    text
      .setVisible(usesLmStudio)
      .setText(t("main-menu.model", { value1: String(modelId || t("common.notSelected")) }));
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
    this.refreshLaunchAvailability();
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
      selectedMap
        ? t("main-menu.map", { value1: String(formatCatalogMap(selectedMap)) })
        : t("main-menu.map.no.maps.available"),
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
        ? t("main-menu.choose.commanders.and.a.map.then.start.the.match")
        : selectedMap
          ? isMapReadyForMatch(selectedMap.map)
            ? t("main-menu.open.lm.studio.settings.and.select.a.model.before.starting")
            : t("main-menu.standalone.matches.require.blue.and.red.units.open.campaigns.for")
          : t("main-menu.no.maps.available.add.a.local.map.or.restore.a.built.in.map.file"),
    );
  }

  private isLmStudioConfigurationMissing(): boolean {
    const settings = this.lmStudioSettings.load();

    return (
      (this.matchConfiguration.blue === "lm-studio-ai" && !isLmStudioSideReady(settings, "blue")) ||
      (this.matchConfiguration.red === "lm-studio-ai" && !isLmStudioSideReady(settings, "red"))
    );
  }
}

function catalogMapKey(entry: CatalogMap): string {
  return `${entry.source}:${entry.map.id}`;
}
