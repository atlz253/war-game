import { getBuiltInCampaigns } from "../../core/campaigns/built-in-campaigns";
import type { CampaignDefinition } from "../../core/campaigns/definition";
import { validateCampaignReadiness } from "../../core/campaigns/validation";
import { getBuiltInMaps } from "../../core/scenarios/built-in-maps";
import { chooseCampaignFile, downloadCampaignFile } from "../campaigns/browser-campaign-file";
import { exportCampaignDefinition } from "../campaigns/campaign-file-format";
import { isDevCampaignEditorAvailable } from "../campaigns/dev-campaign-api";
import { browserCampaignLibrary } from "../campaigns/library";
import { launchMission, startRun } from "../campaigns/playthrough";
import { translateCoreReason } from "../localization/core-reasons";
import { getLocaleId, t } from "../localization/runtime";
import { campaignUi as ui } from "../ui/theme/campaign-ui";
import { CampaignScene } from "./CampaignScene";
import {
  BATTLE_SCENE_KEY,
  CAMPAIGN_EDITOR_SCENE_KEY,
  CAMPAIGN_LIBRARY_SCENE_KEY,
  MAIN_MENU_SCENE_KEY,
} from "./scene-keys";
export class CampaignLibraryScene extends CampaignScene {
  private selected = 0;
  private offset = 0;
  private fileAbort?: AbortController;
  private generation = 0;
  public constructor() {
    super(CAMPAIGN_LIBRARY_SCENE_KEY);
  }
  public create(): void {
    this.generation++;
    this.fileAbort?.abort();
    this.selected = 0;
    this.offset = 0;
    this.message = "";
    this.initializeCanvas();
    this.events.once("shutdown", () => {
      this.generation++;
      this.fileAbort?.abort();
    });
    this.refresh();
  }
  private refresh(): void {
    this.clearContent();
    const loaded = browserCampaignLibrary().list();
    const builtins = getBuiltInCampaigns();
    const items = [...builtins, ...loaded.value];
    this.selected = Math.min(this.selected, Math.max(0, items.length - 1));
    const selected = items[this.selected];
    this.text(ui.leftX, ui.titleY, t("campaign-library.campaigns"));
    items.slice(this.offset, this.offset + ui.listRows).forEach((item, index) => {
      this.button(
        ui.leftX,
        ui.bodyY + index * ui.rowHeight,
        `${this.offset + index < builtins.length ? t("campaign-library.built.in") : ""}${item.name || t("campaign-library.unnamed.draft")}`,
        () => {
          this.selected = this.offset + index;
          this.refresh();
        },
        true,
        ui.listWidth,
      );
    });
    this.button(ui.leftX, ui.footerY - ui.rowHeight, t("campaign-editor.list.up"), () => {
      this.offset = Math.max(0, this.offset - 1);
      this.refresh();
    });
    this.button(
      ui.leftX + ui.controlGap,
      ui.footerY - ui.rowHeight,
      t("campaign-editor.list.down"),
      () => {
        this.offset = Math.min(Math.max(0, items.length - ui.listRows), this.offset + 1);
        this.refresh();
      },
    );
    this.controls(selected, this.selected < builtins.length);
    this.fileControls(selected);
    const errors = selected ? validateCampaignReadiness(selected, getBuiltInMaps()) : [];
    this.text(
      ui.rightX,
      ui.bodyY + ui.rowHeight * 2,
      selected
        ? t("campaign-library.missions.blue.human.red.heuristic.progress.lasts.for.this.session", {
            value1: String(selected.name),
            value2: String(selected.missions.length),
            value3: String(
              errors.map(translateCoreReason).join("\n") || t("campaign-editor.ready.to.play"),
            ),
          })
        : t("campaign-library.create.a.campaign.to.begin"),
      true,
    );
    this.text(ui.rightX, ui.footerY - ui.rowHeight, this.message || loaded.error || "", true);
  }
  private controls(selected: CampaignDefinition | undefined, builtIn: boolean): void {
    this.button(ui.rightX, ui.bodyY, t("campaign-library.create"), () =>
      this.scene.start(CAMPAIGN_EDITOR_SCENE_KEY, {
        campaign: {
          schemaVersion: 1,
          id: crypto.randomUUID(),
          name: t("campaign-library.new.campaign"),
          missions: [],
        },
        isNew: true,
      }),
    );
    this.button(
      ui.rightX + ui.controlGap,
      ui.bodyY,
      t("campaign-library.open.rename"),
      () => this.scene.start(CAMPAIGN_EDITOR_SCENE_KEY, { campaign: selected, builtIn }),
      Boolean(selected) && (!builtIn || isDevCampaignEditorAvailable()),
    );
    this.launchControls(selected, builtIn);
  }
  private launchControls(selected: CampaignDefinition | undefined, builtIn: boolean): void {
    this.button(
      ui.rightX + ui.controlGap * 2,
      ui.bodyY,
      t("common.delete"),
      () => {
        if (!selected) return;
        this.message = browserCampaignLibrary().delete(selected.id).error ?? t("common.deleted");
        this.refresh();
      },
      Boolean(selected) && !builtIn,
    );
    this.button(
      ui.rightX,
      ui.footerY,
      t("campaign-library.play"),
      () => {
        if (selected)
          this.scene.start(
            BATTLE_SCENE_KEY,
            launchMission(startRun(selected, getBuiltInMaps(), getLocaleId())),
          );
      },
      Boolean(selected) &&
        validateCampaignReadiness(selected as CampaignDefinition, getBuiltInMaps()).length === 0,
    );
    this.button(ui.rightX + ui.controlGap, ui.footerY, t("campaign-library.menu"), () =>
      this.scene.start(MAIN_MENU_SCENE_KEY),
    );
  }
  private fileControls(selected?: CampaignDefinition): void {
    const y = ui.bodyY + ui.rowHeight;
    this.button(ui.rightX, y, t("campaign-library.import"), () => void this.importCampaign());
    this.button(
      ui.rightX + ui.controlGap,
      y,
      t("campaign-editor.export"),
      () => {
        if (!selected) return;
        try {
          downloadCampaignFile(selected.name, exportCampaignDefinition(selected));
          this.message = t("campaign-library.export.started");
        } catch (error) {
          this.message =
            error instanceof Error ? error.message : t("campaign-editor.export.failed");
        }
        this.refresh();
      },
      Boolean(selected),
    );
    this.text(
      ui.rightX + ui.controlGap * 2,
      y,
      isDevCampaignEditorAvailable()
        ? t("campaign-library.dev.source.editing.enabled")
        : t("campaign-library.built.ins.play.export.only"),
      true,
      ui.listWidth,
    );
  }
  private async importCampaign(): Promise<void> {
    this.fileAbort?.abort();
    const abort = new AbortController();
    this.fileAbort = abort;
    const generation = this.generation;
    try {
      const serialized = await chooseCampaignFile(abort.signal);
      if (serialized === null || abort.signal.aborted || generation !== this.generation) return;
      const builtins = getBuiltInCampaigns();
      const library = browserCampaignLibrary();
      const result = library.import(
        serialized,
        builtins.map((c) => c.id),
      );
      this.message = result.error ?? t("campaign-library.campaign.imported");
      if (result.value) {
        this.selected =
          builtins.length + library.list().value.findIndex((c) => c.id === result.value?.id);
        this.offset = Math.max(0, this.selected - ui.listRows + 1);
      }
    } catch (error) {
      if (abort.signal.aborted || generation !== this.generation) return;
      this.message = error instanceof Error ? error.message : t("campaign-library.import.failed");
    }
    if (generation === this.generation) this.refresh();
  }
}
