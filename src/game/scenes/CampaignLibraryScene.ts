import { getBuiltInCampaigns } from "../../core/campaigns/built-in-campaigns";
import type { CampaignDefinition } from "../../core/campaigns/definition";
import { validateCampaignReadiness } from "../../core/campaigns/validation";
import { getBuiltInMaps } from "../../core/scenarios/built-in-maps";
import { chooseCampaignFile, downloadCampaignFile } from "../campaigns/browser-campaign-file";
import { exportCampaignDefinition } from "../campaigns/campaign-file-format";
import { isDevCampaignEditorAvailable } from "../campaigns/dev-campaign-api";
import { browserCampaignLibrary } from "../campaigns/library";
import { launchMission, startRun } from "../campaigns/playthrough";
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
    this.text(ui.leftX, ui.titleY, "CAMPAIGNS");
    items.slice(this.offset, this.offset + ui.listRows).forEach((item, index) => {
      this.button(
        ui.leftX,
        ui.bodyY + index * ui.rowHeight,
        `${this.offset + index < builtins.length ? "[Built-in] " : ""}${item.name || "Unnamed draft"}`,
        () => {
          this.selected = this.offset + index;
          this.refresh();
        },
        true,
        ui.listWidth,
      );
    });
    this.button(ui.leftX, ui.footerY - ui.rowHeight, "LIST UP", () => {
      this.offset = Math.max(0, this.offset - 1);
      this.refresh();
    });
    this.button(ui.leftX + ui.controlGap, ui.footerY - ui.rowHeight, "LIST DOWN", () => {
      this.offset = Math.min(Math.max(0, items.length - ui.listRows), this.offset + 1);
      this.refresh();
    });
    this.controls(selected, this.selected < builtins.length);
    this.fileControls(selected);
    const errors = selected ? validateCampaignReadiness(selected, getBuiltInMaps()) : [];
    this.text(
      ui.rightX,
      ui.bodyY + ui.rowHeight * 2,
      selected
        ? `${selected.name}\n${selected.missions.length} missions\nBlue: human · Red: Heuristic\nProgress lasts for this session.\n\n${errors.join("\n") || "Ready to play"}`
        : "Create a campaign to begin.",
      true,
    );
    this.text(ui.rightX, ui.footerY - ui.rowHeight, this.message || loaded.error || "", true);
  }
  private controls(selected: CampaignDefinition | undefined, builtIn: boolean): void {
    this.button(ui.rightX, ui.bodyY, "CREATE", () =>
      this.scene.start(CAMPAIGN_EDITOR_SCENE_KEY, {
        campaign: { schemaVersion: 1, id: crypto.randomUUID(), name: "New campaign", missions: [] },
        isNew: true,
      }),
    );
    this.button(
      ui.rightX + ui.controlGap,
      ui.bodyY,
      "OPEN / RENAME",
      () => this.scene.start(CAMPAIGN_EDITOR_SCENE_KEY, { campaign: selected, builtIn }),
      Boolean(selected) && (!builtIn || isDevCampaignEditorAvailable()),
    );
    this.launchControls(selected, builtIn);
  }
  private launchControls(selected: CampaignDefinition | undefined, builtIn: boolean): void {
    this.button(
      ui.rightX + ui.controlGap * 2,
      ui.bodyY,
      "DELETE",
      () => {
        if (!selected) return;
        this.message = browserCampaignLibrary().delete(selected.id).error ?? "Deleted.";
        this.refresh();
      },
      Boolean(selected) && !builtIn,
    );
    this.button(
      ui.rightX,
      ui.footerY,
      "PLAY",
      () => {
        if (selected)
          this.scene.start(BATTLE_SCENE_KEY, launchMission(startRun(selected, getBuiltInMaps())));
      },
      Boolean(selected) &&
        validateCampaignReadiness(selected as CampaignDefinition, getBuiltInMaps()).length === 0,
    );
    this.button(ui.rightX + ui.controlGap, ui.footerY, "MENU", () =>
      this.scene.start(MAIN_MENU_SCENE_KEY),
    );
  }
  private fileControls(selected?: CampaignDefinition): void {
    const y = ui.bodyY + ui.rowHeight;
    this.button(ui.rightX, y, "IMPORT", () => void this.importCampaign());
    this.button(
      ui.rightX + ui.controlGap,
      y,
      "EXPORT",
      () => {
        if (!selected) return;
        try {
          downloadCampaignFile(selected.name, exportCampaignDefinition(selected));
          this.message = "Export started.";
        } catch (error) {
          this.message = error instanceof Error ? error.message : "Export failed.";
        }
        this.refresh();
      },
      Boolean(selected),
    );
    this.text(
      ui.rightX + ui.controlGap * 2,
      y,
      isDevCampaignEditorAvailable()
        ? "DEV: source editing enabled"
        : "Built-ins: play / export only",
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
      this.message = result.error ?? "Campaign imported.";
      if (result.value) {
        this.selected =
          builtins.length + library.list().value.findIndex((c) => c.id === result.value?.id);
        this.offset = Math.max(0, this.selected - ui.listRows + 1);
      }
    } catch (error) {
      if (abort.signal.aborted || generation !== this.generation) return;
      this.message = error instanceof Error ? error.message : "Import failed.";
    }
    if (generation === this.generation) this.refresh();
  }
}
