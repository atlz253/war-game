import { getBuiltInCampaigns } from "../../core/campaigns/built-in-campaigns";
import type {
  CampaignDefinition,
  DialogueLine,
  DialogueTrigger,
  UnitSelector,
} from "../../core/campaigns/definition";
import { validateCampaignReadiness } from "../../core/campaigns/validation";
import { createGameStateFromMap, type MapDefinition } from "../../core/maps/map-definition";
import type { Position } from "../../core/model/game-state";
import { getBuiltInMaps } from "../../core/scenarios/built-in-maps";
import { downloadCampaignFile } from "../campaigns/browser-campaign-file";
import { exportCampaignDefinition } from "../campaigns/campaign-file-format";
import { isDevCampaignEditorAvailable, saveBuiltInCampaign } from "../campaigns/dev-campaign-api";
import { CampaignEditorModel, TRIGGER_TYPES } from "../campaigns/editor-model";
import { browserCampaignLibrary } from "../campaigns/library";
import { createCampaignPreview } from "../campaigns/preview";
import { translateCoreReason } from "../localization/core-reasons";
import { displayToken } from "../localization/display-tokens";
import { getLocaleCatalog, t } from "../localization/runtime";
import { campaignUi as ui } from "../ui/theme/campaign-ui";
import { CampaignScene } from "./CampaignScene";
import { CAMPAIGN_EDITOR_SCENE_KEY, CAMPAIGN_LIBRARY_SCENE_KEY } from "./scene-keys";

interface EditorData {
  readonly campaign: CampaignDefinition;
  readonly builtIn?: boolean;
  readonly isNew?: boolean;
}
const FIELD_X = 2440;
const FIELD_WIDTH = 1280;
const NAME_DISPLAY_LENGTH = 27;
const ERROR_ROWS = 3;
type PickMode = "objective-cell" | "objective-unit" | "event-cell" | "event-unit";
type SaveDestination = "local" | "built-in";
export class CampaignEditorScene extends CampaignScene {
  private model!: CampaignEditorModel;
  private builtIn = false;
  private saving = false;
  private generation = 0;
  private isNew = false;
  private eventsMode = false;
  private picking = false;
  private missionOffset = 0;
  private eventOffset = 0;
  private errorOffset = 0;
  private pickMode: PickMode = "objective-cell";
  public constructor() {
    super(CAMPAIGN_EDITOR_SCENE_KEY);
  }
  public create(data: EditorData): void {
    this.generation++;
    const localEntry =
      data.builtIn === false &&
      browserCampaignLibrary()
        .list()
        .value.some((c) => c.id === data.campaign.id);
    const builtIn =
      Boolean(data.builtIn) ||
      (!localEntry && getBuiltInCampaigns().some((c) => c.id === data.campaign.id));
    if (builtIn && !isDevCampaignEditorAvailable()) {
      this.scene.start(CAMPAIGN_LIBRARY_SCENE_KEY);
      return;
    }
    this.model = new CampaignEditorModel(data.campaign);
    this.builtIn = builtIn;
    this.saving = false;
    this.isNew = Boolean(data.isNew);
    this.eventsMode = false;
    this.picking = false;
    this.missionOffset = 0;
    this.eventOffset = 0;
    this.errorOffset = 0;
    this.message = "";
    this.initializeCanvas();
    this.events.once("shutdown", () => {
      this.generation++;
    });
    this.refresh();
  }
  private refresh(): void {
    this.clearContent();
    this.text(
      ui.leftX,
      ui.titleY,
      t("campaign-editor.campaign.editor", { value1: String(this.model.dirty ? " *" : "") }),
    );
    if (!this.eventsMode)
      this.button(
        FIELD_X,
        ui.bodyY - ui.rowHeight,
        t("campaign-editor.name", { value1: String(short(this.model.draft.name)) }),
        () =>
          this.edit(
            t("campaign-editor.campaign.name"),
            this.model.draft.name,
            false,
            (name) => {
              this.model.draft = { ...this.model.draft, name };
            },
            () => this.refresh(),
          ),
        true,
        FIELD_WIDTH,
      );
    this.missionList();
    if (this.model.mission) {
      if (this.eventsMode) this.eventEditor();
      else this.missionSettings();
      if (!this.eventsMode || this.picking) this.preview();
    }
    this.footer();
  }
  private change(action: () => void): void {
    action();
    this.refresh();
  }
  private missionList(): void {
    this.text(ui.leftX, ui.bodyY - ui.rowHeight, t("campaign-editor.missions"), true);
    this.model.draft.missions
      .slice(this.missionOffset, this.missionOffset + ui.listRows)
      .forEach((mission, index) => {
        const actual = index + this.missionOffset;
        this.button(
          ui.leftX,
          ui.bodyY + index * ui.rowHeight,
          `${actual === this.model.missionIndex ? "> " : ""}${actual + 1}. ${short(mission.name)}`,
          () =>
            this.change(() => {
              this.model.missionIndex = actual;
              this.model.eventIndex = 0;
              this.model.lineIndex = 0;
              this.model.dialogueLocaleId = "en";
              this.eventOffset = 0;
            }),
          true,
          ui.listWidth,
        );
      });
    const bottom = ui.bodyY + ui.listRows * ui.rowHeight;
    this.button(ui.leftX, bottom, t("campaign-editor.mission"), () =>
      this.change(() => this.model.addMission(crypto.randomUUID(), getBuiltInMaps()[0]?.id ?? "")),
    );
    this.button(
      ui.leftX + ui.controlGap,
      bottom,
      t("campaign-editor.remove"),
      () => this.change(() => this.model.deleteMission()),
      Boolean(this.model.mission),
    );
    this.button(
      ui.leftX,
      bottom + ui.rowHeight,
      t("campaign-editor.move.up"),
      () => this.change(() => this.model.moveMission(-1)),
      Boolean(this.model.mission),
    );
    this.button(
      ui.leftX + ui.controlGap,
      bottom + ui.rowHeight,
      t("campaign-editor.move.down"),
      () => this.change(() => this.model.moveMission(1)),
      Boolean(this.model.mission),
    );
    this.button(ui.leftX, bottom + ui.rowHeight * 2, t("campaign-editor.list.up"), () =>
      this.change(() => {
        this.missionOffset = Math.max(0, this.missionOffset - 1);
      }),
    );
    this.button(
      ui.leftX + ui.controlGap,
      bottom + ui.rowHeight * 2,
      t("campaign-editor.list.down"),
      () =>
        this.change(() => {
          this.missionOffset = Math.min(
            Math.max(0, this.model.draft.missions.length - ui.listRows),
            this.missionOffset + 1,
          );
        }),
    );
  }
  private missionSettings(): void {
    const mission = this.model.mission;
    if (!mission) return;
    this.button(
      ui.rightX,
      ui.bodyY,
      t("campaign-editor.mission.2", { value1: String(short(mission.name)) }),
      () =>
        this.edit(
          t("campaign-editor.mission.name"),
          mission.name,
          false,
          (name) => this.model.updateMission({ name }),
          () => this.refresh(),
        ),
      true,
      ui.listWidth,
    );
    this.text(
      ui.rightX,
      ui.bodyY + ui.rowHeight,
      t("campaign-editor.built.in.map", { value1: String(mission.builtInMapId) }),
      true,
      ui.listWidth,
    );
    this.button(ui.rightX, ui.bodyY + ui.rowHeight * 2, t("campaign-editor.map"), () =>
      this.cycleMap(-1),
    );
    this.button(
      ui.rightX + ui.controlGap,
      ui.bodyY + ui.rowHeight * 2,
      t("campaign-editor.map.2"),
      () => this.cycleMap(1),
    );
    const conditions = mission.conditions;
    this.button(
      ui.rightX,
      ui.bodyY + ui.rowHeight * ui.downButtonColumn,
      conditions.type === "standard-match"
        ? t("campaign-editor.standard.victory")
        : t("campaign-editor.standard.reach.cell"),
      () =>
        this.change(() =>
          this.model.updateMission({
            conditions:
              conditions.type === "standard-match"
                ? {
                    type: "standard-match-or-reach-cell",
                    unit: { type: "any" },
                    cell: { x: 0, y: 0 },
                    mapBinding: mission.builtInMapId,
                  }
                : { type: "standard-match" },
          }),
        ),
      true,
      ui.listWidth,
    );
    this.button(
      ui.rightX,
      ui.bodyY + ui.rowHeight * (ui.downButtonColumn + 1),
      t("campaign-editor.edit.dialogue.events"),
      () =>
        this.change(() => {
          this.eventsMode = true;
        }),
      true,
      ui.listWidth,
    );
    this.button(
      ui.rightX,
      ui.bodyY + ui.rowHeight * (ui.downButtonColumn + 2),
      t("campaign-editor.confirm.map.bindings"),
      () => this.change(() => this.model.rebind()),
      true,
      ui.listWidth,
    );
    this.missionSettingsHelp();
  }
  private missionSettingsHelp(): void {
    const conditions = this.model.mission?.conditions;
    this.text(
      ui.rightX,
      ui.previewY + ui.rowHeight,
      t("campaign-editor.defeat.standard.combat.rules.rebind.confirms.all.unit.and.cell.re"),
      true,
      ui.listWidth,
    );
    if (conditions?.type === "standard-match-or-reach-cell") this.objectiveFields(conditions.unit);
  }
  private objectiveFields(unit: UnitSelector): void {
    const policy = this.model.mission?.conditions;
    if (policy?.type !== "standard-match-or-reach-cell") return;
    this.button(
      FIELD_X,
      ui.bodyY,
      t("campaign-editor.blue", { value1: String(selectorLabel(unit)) }),
      () =>
        this.cycleUnit(unit, true, (selected) =>
          this.model.updateMission({ conditions: { ...policy, unit: selected } }),
        ),
      true,
      FIELD_WIDTH,
    );
    this.button(
      FIELD_X,
      ui.bodyY + ui.rowHeight,
      t("campaign-editor.pick.goal", {
        value1: String(policy.cell.x),
        value2: String(policy.cell.y),
      }),
      () =>
        this.change(() => {
          this.pickMode = "objective-cell";
        }),
      true,
      FIELD_WIDTH,
    );
    this.button(
      FIELD_X,
      ui.bodyY + ui.rowHeight * 2,
      t("campaign-editor.pick.blue.unit.on.map"),
      () =>
        this.change(() => {
          this.pickMode = "objective-unit";
        }),
      true,
      FIELD_WIDTH,
    );
    this.text(
      FIELD_X,
      ui.bodyY + ui.rowHeight * ui.downButtonColumn,
      t("campaign-editor.binding", {
        value1: String(policy.mapBinding || t("common.bindingRequired")),
      }),
      true,
      FIELD_WIDTH,
    );
  }
  private cycleMap(direction: number): void {
    const maps = getBuiltInMaps();
    const index = maps.findIndex((map) => map.id === this.model.mission?.builtInMapId);
    const next = maps[(index + direction + maps.length) % maps.length];
    if (next) this.change(() => this.model.setMap(next.id));
  }
  private cycleUnit(
    unit: UnitSelector,
    blueOnly: boolean,
    selected: (unit: UnitSelector) => void,
  ): void {
    const map = getBuiltInMaps().find((item) => item.id === this.model.mission?.builtInMapId);
    if (!map) return;
    const initial = createGameStateFromMap(map);
    const selectors: UnitSelector[] = [
      { type: "any" },
      ...Object.values(initial.units)
        .filter((candidate) => !blueOnly || candidate.side === "blue")
        .map((candidate) => ({ type: "specific" as const, unitId: candidate.id })),
    ];
    const index = selectors.findIndex(
      (candidate) => selectorLabel(candidate) === selectorLabel(unit),
    );
    this.change(() => {
      const next = selectors[(index + 1) % selectors.length] ?? { type: "any" };
      selected(next);
      const chosen = next.type === "specific" ? initial.units[next.unitId] : undefined;
      this.message = chosen
        ? `${chosen.id}: ${displayToken(chosen.side).toLowerCase()} ${displayToken(chosen.type).toLowerCase()} (${chosen.position.x}, ${chosen.position.y})`
        : t("campaign-editor.any.eligible.unit");
    });
  }
  private eventEditor(): void {
    const mission = this.model.mission;
    if (!mission) return;
    this.button(
      ui.rightX,
      ui.bodyY - ui.rowHeight,
      t("campaign-editor.mission.settings"),
      () =>
        this.change(() => {
          this.eventsMode = false;
        }),
      true,
      ui.listWidth,
    );
    mission.events
      .slice(this.eventOffset, this.eventOffset + ui.listRows)
      .forEach((event, index) => {
        const actual = this.eventOffset + index;
        this.button(
          ui.rightX,
          ui.bodyY + index * ui.rowHeight,
          `${actual === this.model.eventIndex ? "> " : ""}${actual + 1}. ${displayToken(event.trigger.type)}`,
          () =>
            this.change(() => {
              this.model.eventIndex = actual;
              this.model.lineIndex = 0;
              this.model.dialogueLocaleId = "en";
            }),
          true,
          ui.listWidth,
        );
      });
    this.eventListControls();
    const event = this.model.event;
    if (event) {
      this.dialogueLanguageControl();
      if (this.model.dialogueLocaleId === "en") this.triggerFields(event.trigger);
      else this.translationSource();
      if (!this.picking) this.lineEditor();
      else
        this.button(
          FIELD_X,
          ui.footerY - ui.rowHeight,
          t("campaign-editor.done.picking"),
          () =>
            this.change(() => {
              this.picking = false;
            }),
          true,
          FIELD_WIDTH,
        );
    }
  }
  private eventListControls(): void {
    const y = ui.bodyY + ui.listRows * ui.rowHeight;
    this.button(
      ui.rightX,
      y,
      t("campaign-editor.event"),
      () => this.change(() => this.model.addEvent(crypto.randomUUID())),
      this.model.dialogueLocaleId === "en",
    );
    this.button(
      ui.rightX + ui.controlGap,
      y,
      t("campaign-editor.remove"),
      () => this.change(() => this.model.deleteEvent()),
      Boolean(this.model.event) && this.model.dialogueLocaleId === "en",
    );
    this.button(
      ui.rightX,
      y + ui.rowHeight,
      t("campaign-editor.move.up"),
      () => this.change(() => this.model.moveEvent(-1)),
      Boolean(this.model.event) && this.model.dialogueLocaleId === "en",
    );
    this.button(
      ui.rightX + ui.controlGap,
      y + ui.rowHeight,
      t("campaign-editor.move.down"),
      () => this.change(() => this.model.moveEvent(1)),
      Boolean(this.model.event) && this.model.dialogueLocaleId === "en",
    );
    this.button(ui.rightX, y + ui.rowHeight * 2, t("campaign-editor.list.up"), () =>
      this.change(() => {
        this.eventOffset = Math.max(0, this.eventOffset - 1);
      }),
    );
    this.button(
      ui.rightX + ui.controlGap,
      y + ui.rowHeight * 2,
      t("campaign-editor.list.down"),
      () =>
        this.change(() => {
          this.eventOffset = Math.min(
            Math.max(0, (this.model.mission?.events.length ?? 0) - ui.listRows),
            this.eventOffset + 1,
          );
        }),
    );
  }
  private triggerFields(trigger: DialogueTrigger): void {
    this.button(
      FIELD_X,
      ui.bodyY,
      t("campaign-editor.trigger", { value1: displayToken(trigger.type) }),
      () =>
        this.change(() =>
          this.model.setTrigger(
            TRIGGER_TYPES[(TRIGGER_TYPES.indexOf(trigger.type) + 1) % TRIGGER_TYPES.length] ??
              "mission-start",
          ),
        ),
      true,
      FIELD_WIDTH,
    );
    if (trigger.type === "turn")
      this.button(
        FIELD_X,
        ui.bodyY + ui.rowHeight,
        t("campaign-editor.turn", { value1: String(trigger.number) }),
        () =>
          this.edit(
            t("campaign-editor.positive.turn.number"),
            String(trigger.number),
            false,
            (value) => this.model.updateEvent({ trigger: { type: "turn", number: Number(value) } }),
            () => this.refresh(),
          ),
        true,
        FIELD_WIDTH,
      );
    if ("unit" in trigger) {
      this.button(
        FIELD_X,
        ui.bodyY + ui.rowHeight,
        t("campaign-editor.unit", { value1: String(selectorLabel(trigger.unit)) }),
        () =>
          this.cycleUnit(trigger.unit, trigger.type === "unit-selected", (unit) =>
            this.model.setEventUnit(unit),
          ),
        true,
        FIELD_WIDTH,
      );
      this.button(
        FIELD_X,
        ui.bodyY + ui.rowHeight * 2,
        t("campaign-editor.pick.unit.on.map"),
        () =>
          this.change(() => {
            this.pickMode = "event-unit";
            this.picking = true;
          }),
        true,
        FIELD_WIDTH,
      );
    }
    if (trigger.type === "unit-arrived")
      this.button(
        FIELD_X,
        ui.bodyY + ui.rowHeight * ui.downButtonColumn,
        t("campaign-editor.pick.cell", {
          value1: String(trigger.cell.x),
          value2: String(trigger.cell.y),
        }),
        () =>
          this.change(() => {
            this.pickMode = "event-cell";
            this.picking = true;
          }),
        true,
        FIELD_WIDTH,
      );
  }
  private dialogueLanguageControl(): void {
    const id = this.model.dialogueLocaleId;
    const locale = getLocaleCatalog().locales.find((item) => item.id === id);
    this.button(
      FIELD_X,
      ui.bodyY - ui.rowHeight,
      t("campaign-dialogue.language", { name: locale?.name ?? id }),
      () => this.dialogueLanguages(),
      true,
      FIELD_WIDTH,
    );
  }
  private dialogueLanguages(offset = 0): void {
    const locales = getLocaleCatalog().locales;
    const linked = ["en", ...Object.keys(this.model.event?.localizations ?? {})];
    const choices = linked.map((id) => ({
      label:
        locales.find((locale) => locale.id === id)?.name ??
        t("campaign-dialogue.unavailable", { id }),
      action: () =>
        this.change(() => {
          this.model.dialogueLocaleId = id;
        }),
    }));
    for (const locale of locales) {
      if (linked.includes(locale.id)) continue;
      choices.push({
        label: t("campaign-dialogue.add", { name: locale.name }),
        action: () =>
          this.change(() =>
            this.model.addLocalization(
              locale.id,
              locales.map((item) => item.id),
            ),
          ),
      });
    }
    const visible = choices.slice(offset, offset + ui.listRows);
    if (offset > 0)
      visible.push({
        label: t("common.previous"),
        action: () => this.dialogueLanguages(offset - ui.listRows),
      });
    if (offset + ui.listRows < choices.length)
      visible.push({
        label: t("common.next"),
        action: () => this.dialogueLanguages(offset + ui.listRows),
      });
    visible.push({ label: t("common.cancel"), action: () => this.refresh() });
    this.choices(t("language.title"), visible);
  }
  private translationSource(): void {
    const line = this.model.line;
    if (!line) return;
    const id = this.model.dialogueLocaleId;
    const fields = this.model.event?.localizations?.[id]?.[line.id ?? ""];
    const missing = !fields?.speaker?.trim() || !fields?.text?.trim();
    this.text(
      FIELD_X,
      ui.bodyY,
      t("campaign-dialogue.source", { speaker: line.speaker, text: short(line.text) }),
      true,
      FIELD_WIDTH,
    );
    this.text(
      FIELD_X,
      ui.bodyY + ui.rowHeight * 2,
      [
        missing ? t("language.fallback") : "",
        getLocaleCatalog().locales.some((locale) => locale.id === id)
          ? ""
          : t("campaign-dialogue.unavailable", { id }),
      ]
        .filter(Boolean)
        .join("\n"),
      true,
      FIELD_WIDTH,
    );
    this.button(
      FIELD_X,
      ui.bodyY + ui.rowHeight * ui.downButtonColumn,
      t("campaign-dialogue.viewSource"),
      () =>
        this.edit(
          t("campaign-dialogue.viewSource"),
          `${line.speaker}\n${line.text}`,
          true,
          () => {},
          () => this.refresh(),
        ),
      true,
      FIELD_WIDTH,
    );
  }
  private lineEditor(): void {
    const event = this.model.event;
    if (!event) return;
    const y = ui.bodyY + ui.rowHeight * (ui.downButtonColumn + 1);
    const line = this.model.presentedLine;
    this.button(
      FIELD_X,
      y,
      t("campaign-editor.line", {
        value1: String(this.model.lineIndex + 1),
        value2: String(event.lines.length),
      }),
      () =>
        this.change(() => {
          this.model.lineIndex = Math.max(0, this.model.lineIndex - 1);
        }),
    );
    this.button(FIELD_X + ui.controlGap, y, t("campaign-editor.line.2"), () =>
      this.change(() => {
        this.model.lineIndex = Math.min(
          Math.max(0, event.lines.length - 1),
          this.model.lineIndex + 1,
        );
      }),
    );
    this.button(
      FIELD_X,
      y + ui.rowHeight,
      t("campaign-editor.line.3"),
      () => this.change(() => this.model.addLine()),
      this.model.dialogueLocaleId === "en",
    );
    this.button(
      FIELD_X + ui.controlGap,
      y + ui.rowHeight,
      t("campaign-editor.remove.line"),
      () => this.change(() => this.model.deleteLine()),
      Boolean(line) && this.model.dialogueLocaleId === "en",
    );
    if (line) this.lineValueControls(line, y);
  }
  private lineValueControls(line: DialogueLine, y: number): void {
    this.button(
      FIELD_X,
      y + ui.rowHeight * 2,
      t("campaign-editor.speaker", { value1: String(short(line.speaker)) }),
      () =>
        this.edit(
          t("campaign-dialogue.speaker"),
          this.model.dialogueLocaleId === "en"
            ? line.speaker
            : (this.model.event?.localizations?.[this.model.dialogueLocaleId]?.[line.id ?? ""]
                ?.speaker ?? ""),
          false,
          (speaker) => this.model.updateLine({ speaker }),
          () => this.refresh(),
        ),
      true,
      FIELD_WIDTH,
    );
    this.button(FIELD_X, ui.footerY - ui.rowHeight * 2, t("campaign-editor.edit.text"), () =>
      this.edit(
        t("campaign-editor.dialogue.text"),
        this.model.dialogueLocaleId === "en"
          ? line.text
          : (this.model.event?.localizations?.[this.model.dialogueLocaleId]?.[line.id ?? ""]
              ?.text ?? ""),
        true,
        (text) => this.model.updateLine({ text }),
        () => this.refresh(),
      ),
    );
    this.button(
      FIELD_X + ui.controlGap,
      ui.footerY - ui.rowHeight * 2,
      t("campaign-editor.line.up"),
      () => this.change(() => this.model.moveLine(-1)),
      this.model.dialogueLocaleId === "en",
    );
    this.button(
      FIELD_X,
      ui.footerY - ui.rowHeight,
      t("campaign-editor.line.down"),
      () => this.change(() => this.model.moveLine(1)),
      this.model.dialogueLocaleId === "en",
    );
  }
  private preview(): void {
    const mission = this.model.mission;
    const map = getBuiltInMaps().find((item) => item.id === mission?.builtInMapId);
    if (!mission || !map) return;
    const target =
      this.eventsMode && this.model.event?.trigger.type === "unit-arrived"
        ? this.model.event.trigger.cell
        : mission.conditions.type === "standard-match-or-reach-cell"
          ? mission.conditions.cell
          : undefined;
    this.text(
      FIELD_X,
      ui.previewY - ui.lineHeight,
      t("campaign-editor.preview", {
        value1: String(this.pickMode),
        value2: String(map.width),
        value3: String(map.height),
      }),
      true,
      FIELD_WIDTH,
    );
    createCampaignPreview(this, this.content, map, target, (cell, unitId) => {
      if (this.modal) return;
      const policy = this.model.mission?.conditions;
      if (this.pickMode === "objective-cell" && policy?.type === "standard-match-or-reach-cell")
        this.model.updateMission({ conditions: { ...policy, cell } });
      if (this.pickMode === "event-cell") this.model.setEventCell(cell);
      if (unitId) this.pickUnit(map, unitId, cell);
      this.refresh();
    });
  }
  private pickUnit(map: MapDefinition, unitId: string, cell: Position): void {
    const policy = this.model.mission?.conditions;
    if (unitId) {
      const unit = createGameStateFromMap(map).units[unitId];
      this.message = `${unitId}: ${displayToken(unit?.side ?? "")} ${displayToken(unit?.type ?? "")} (${cell.x}, ${cell.y})`;
      if (
        this.pickMode === "objective-unit" &&
        unit?.side === "blue" &&
        policy?.type === "standard-match-or-reach-cell"
      )
        this.model.updateMission({
          conditions: { ...policy, unit: { type: "specific", unitId } },
        });
      if (this.pickMode === "event-unit") this.model.setEventUnit({ type: "specific", unitId });
    }
  }
  private footer(): void {
    const errors = validateCampaignReadiness(this.model.draft, getBuiltInMaps());
    this.errorOffset = Math.min(this.errorOffset, Math.max(0, errors.length - ERROR_ROWS));
    this.text(
      ui.leftX,
      ui.footerY - ui.rowHeight,
      this.message ||
        errors
          .slice(this.errorOffset, this.errorOffset + ERROR_ROWS)
          .map(translateCoreReason)
          .join("\n") ||
        t("campaign-editor.ready.to.play"),
      true,
      ui.textWidth,
    );
    this.button(
      ui.leftX,
      ui.footerY,
      t("common.save"),
      () => void this.saveAndRefresh(),
      !this.saving,
    );
    this.button(ui.leftX + ui.controlGap, ui.footerY, t("common.back"), () => this.leave());
    this.button(ui.rightX, ui.footerY, t("campaign-editor.errors.up"), () =>
      this.change(() => {
        this.errorOffset = Math.max(0, this.errorOffset - 1);
      }),
    );
    this.button(ui.rightX + ui.controlGap, ui.footerY, t("campaign-editor.errors.down"), () =>
      this.change(() => {
        this.message = "";
        this.errorOffset++;
      }),
    );
    this.button(FIELD_X, ui.footerY, t("campaign-editor.export"), () => this.exportDraft());
    if (isDevCampaignEditorAvailable())
      this.button(
        FIELD_X + ui.controlGap,
        ui.footerY,
        t("campaign-editor.built.in.save"),
        () => void this.saveAndRefresh("built-in"),
        !this.saving,
      );
  }
  private async save(destination: SaveDestination = "local"): Promise<boolean> {
    if (this.saving) return false;
    this.saving = true;
    const generation = this.generation;
    const snapshot = structuredClone(this.model.draft);
    try {
      const persisted = await this.persist(snapshot, destination);
      if (generation !== this.generation) return false;
      if (destination === "local") {
        this.model.draft = { ...this.model.draft, id: persisted.id };
        this.builtIn = false;
      }
      this.model.markSaved(persisted);
      this.isNew = false;
      this.message =
        destination === "built-in"
          ? t("campaign-editor.saved.to.source.json")
          : t("campaign-editor.saved.locally");
      return true;
    } catch (error) {
      if (generation === this.generation)
        this.message = error instanceof Error ? error.message : t("campaign-editor.save.failed");
      return false;
    } finally {
      if (generation === this.generation) this.saving = false;
    }
  }
  private async persist(
    snapshot: CampaignDefinition,
    destination: SaveDestination,
  ): Promise<CampaignDefinition> {
    if (destination === "built-in") {
      if (!isDevCampaignEditorAvailable())
        throw new Error(t("campaign-editor.built.in.saving.requires.dev.mode"));
      await saveBuiltInCampaign(snapshot);
      return snapshot;
    }
    const library = browserCampaignLibrary();
    if (this.builtIn) {
      const result = library.import(
        exportCampaignDefinition(snapshot),
        getBuiltInCampaigns().map((c) => c.id),
      );
      if (!result.value) throw new Error(result.error ?? t("campaign-editor.local.save.failed"));
      return result.value;
    }
    const result = library.save(snapshot);
    if (!result.value) throw new Error(result.error ?? t("campaign-editor.local.save.failed"));
    return snapshot;
  }
  private async saveAndRefresh(destination: SaveDestination = "local"): Promise<void> {
    const generation = this.generation;
    await this.save(destination);
    if (generation === this.generation) this.refresh();
  }
  private exportDraft(): void {
    try {
      downloadCampaignFile(this.model.draft.name, exportCampaignDefinition(this.model.draft));
      this.message = t("campaign-editor.draft.export.started");
    } catch (error) {
      this.message = error instanceof Error ? error.message : t("campaign-editor.export.failed");
    }
    this.refresh();
  }
  private leave(): void {
    if (!this.model.dirty && !this.isNew) {
      this.scene.start(CAMPAIGN_LIBRARY_SCENE_KEY);
      return;
    }
    this.choices(t("campaign-editor.unsaved.changes"), [
      {
        label: t("campaign-editor.save.and.leave"),
        action: () => void this.saveAndLeave(),
      },
      {
        label: t("campaign-editor.discard.and.leave"),
        action: () => this.scene.start(CAMPAIGN_LIBRARY_SCENE_KEY),
      },
      { label: t("common.cancel"), action: () => this.refresh() },
    ]);
  }
  private async saveAndLeave(): Promise<void> {
    const generation = this.generation;
    const saved = await this.save();
    if (generation !== this.generation) return;
    if (saved && !this.model.dirty) this.scene.start(CAMPAIGN_LIBRARY_SCENE_KEY);
    else this.refresh();
  }
}
function short(value: string): string {
  return value.length > NAME_DISPLAY_LENGTH ? `${value.slice(0, NAME_DISPLAY_LENGTH)}…` : value;
}
function selectorLabel(unit: UnitSelector): string {
  return unit.type === "any" ? t("campaign-editor.any") : unit.unitId;
}
