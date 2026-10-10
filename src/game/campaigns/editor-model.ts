import { normalizeCampaign } from "../../core/campaigns/definition";
import { changeMissionMap, rebindMission, removeAt, reorder } from "../../core/campaigns/draft";
import type {
  CampaignDefinition,
  DialogueEvent,
  DialogueLine,
  DialogueTrigger,
  MissionDefinition,
  Position,
  UnitSelector,
} from "../../core/campaigns/editor-types";
import { t } from "../localization/runtime";
import { localizedDialogueLine } from "./localized-dialogue";
export const TRIGGER_TYPES = [
  "mission-start",
  "turn",
  "unit-moved",
  "unit-selected",
  "unit-arrived",
  "mission-end",
] as const;
export class CampaignEditorModel {
  public draft: CampaignDefinition;
  public missionIndex = 0;
  public eventIndex = 0;
  public lineIndex = 0;
  public dialogueLocaleId = "en";
  private saved: string;
  public constructor(campaign: CampaignDefinition) {
    this.draft = normalizeCampaign(campaign);
    this.saved = JSON.stringify(this.draft);
  }
  public get dirty(): boolean {
    return this.saved !== JSON.stringify(this.draft);
  }
  public markSaved(snapshot = this.draft): void {
    this.saved = JSON.stringify(snapshot);
  }
  public get mission(): MissionDefinition | undefined {
    return this.draft.missions[this.missionIndex];
  }
  public get event(): DialogueEvent | undefined {
    return this.mission?.events[this.eventIndex];
  }
  public get line(): DialogueLine | undefined {
    return this.event?.lines[this.lineIndex];
  }
  public get presentedLine(): DialogueLine | undefined {
    return this.event && this.line
      ? localizedDialogueLine(this.event, this.line, this.dialogueLocaleId)
      : undefined;
  }
  public addLocalization(id: string, available: readonly string[]): void {
    if (
      !this.event ||
      id === "en" ||
      !available.includes(id) ||
      Object.hasOwn(this.event.localizations ?? {}, id)
    )
      throw new Error(t("campaign-editor.error.0"));
    this.updateEvent({ localizations: { ...this.event.localizations, [id]: {} } });
    this.dialogueLocaleId = id;
  }
  private requireEnglish(): void {
    if (this.dialogueLocaleId !== "en") throw new Error(t("campaign-editor.error.1"));
  }
  public updateMission(patch: Partial<MissionDefinition>): void {
    this.draft = {
      ...this.draft,
      missions: this.draft.missions.map((mission, index) =>
        index === this.missionIndex ? { ...mission, ...patch } : mission,
      ),
    };
  }
  public updateEvent(patch: Partial<DialogueEvent>): void {
    if (this.mission)
      this.updateMission({
        events: this.mission.events.map((event, index) =>
          index === this.eventIndex ? { ...event, ...patch } : event,
        ),
      });
  }
  public updateLine(patch: Partial<DialogueLine>): void {
    if (patch.id !== undefined) throw new Error(t("campaign-editor.error.2"));
    if (this.dialogueLocaleId !== "en") {
      const event = this.event;
      const id = this.line?.id;
      if (!event || !id) return;
      const translations = event.localizations?.[this.dialogueLocaleId] ?? {};
      this.updateEvent({
        localizations: {
          ...event.localizations,
          [this.dialogueLocaleId]: {
            ...translations,
            [id]: { ...translations[id], ...patch },
          },
        },
      });
      return;
    }
    if (this.event)
      this.updateEvent({
        lines: this.event.lines.map((line, index) =>
          index === this.lineIndex ? { ...line, ...patch } : line,
        ),
      });
  }
  public addMission(id: string, mapId: string): void {
    this.draft = {
      ...this.draft,
      missions: [
        ...this.draft.missions,
        {
          id,
          name: "New mission",
          builtInMapId: mapId,
          conditions: { type: "standard-match" },
          events: [],
        },
      ],
    };
    this.missionIndex = this.draft.missions.length - 1;
    this.eventIndex = 0;
    this.lineIndex = 0;
  }
  public deleteMission(): void {
    this.draft = { ...this.draft, missions: removeAt(this.draft.missions, this.missionIndex) };
    this.missionIndex = Math.max(0, this.missionIndex - 1);
  }
  public moveMission(direction: number): void {
    this.draft = {
      ...this.draft,
      missions: reorder(this.draft.missions, this.missionIndex, this.missionIndex + direction),
    };
    this.missionIndex = clampIndex(this.missionIndex + direction, this.draft.missions.length);
  }
  public setMap(id: string): void {
    if (this.mission) this.updateMission(changeMissionMap(this.mission, id));
  }
  public rebind(): void {
    if (this.mission) this.updateMission(rebindMission(this.mission));
  }
  public addEvent(id: string): void {
    this.requireEnglish();
    if (!this.mission) return;
    this.updateMission({
      events: [
        ...this.mission.events,
        { id, type: "dialogue", trigger: { type: "mission-start" }, lines: [] },
      ],
    });
    this.eventIndex = this.mission.events.length - 1;
    this.lineIndex = 0;
  }
  public deleteEvent(): void {
    this.requireEnglish();
    if (this.mission)
      this.updateMission({ events: removeAt(this.mission.events, this.eventIndex) });
    this.eventIndex = Math.max(0, this.eventIndex - 1);
    this.lineIndex = 0;
  }
  public moveEvent(direction: number): void {
    this.requireEnglish();
    if (!this.mission) return;
    this.updateMission({
      events: reorder(this.mission.events, this.eventIndex, this.eventIndex + direction),
    });
    this.eventIndex = clampIndex(this.eventIndex + direction, this.mission.events.length);
  }
  public setTrigger(type: DialogueTrigger["type"]): void {
    this.requireEnglish();
    const binding = this.mission?.builtInMapId ?? "";
    if (type === "mission-start" || type === "mission-end")
      return void this.updateEvent({ trigger: { type } });
    if (type === "turn") return void this.updateEvent({ trigger: { type, number: 1 } });
    const unit = { type: "any" } as const;
    this.updateEvent({
      trigger:
        type === "unit-arrived"
          ? { type, unit, cell: { x: 0, y: 0 }, mapBinding: binding }
          : { type, unit, mapBinding: binding },
    });
  }
  public setEventUnit(unit: UnitSelector): void {
    this.requireEnglish();
    if (this.event && "unit" in this.event.trigger)
      this.updateEvent({ trigger: { ...this.event.trigger, unit } });
  }
  public setEventCell(cell: Position): void {
    this.requireEnglish();
    if (this.event?.trigger.type === "unit-arrived")
      this.updateEvent({ trigger: { ...this.event.trigger, cell } });
  }
  public addLine(): void {
    this.requireEnglish();
    if (this.event) {
      let suffix = this.event.lines.length + 1;
      while (this.event.lines.some((line) => line.id === `line-${suffix}`)) suffix++;
      this.updateEvent({
        lines: [...this.event.lines, { id: `line-${suffix}`, speaker: "Character", text: "" }],
      });
      this.lineIndex = this.event.lines.length - 1;
    }
  }
  public deleteLine(): void {
    this.requireEnglish();
    if (this.event) {
      const id = this.line?.id;
      const localizations = Object.fromEntries(
        Object.entries(this.event.localizations ?? {}).map(([locale, translations]) => [
          locale,
          Object.fromEntries(Object.entries(translations).filter(([lineId]) => lineId !== id)),
        ]),
      );
      this.updateEvent({
        lines: removeAt(this.event.lines, this.lineIndex),
        ...(this.event.localizations ? { localizations } : {}),
      });
    }
    this.lineIndex = Math.max(0, this.lineIndex - 1);
  }
  public moveLine(direction: number): void {
    this.requireEnglish();
    if (!this.event) return;
    this.updateEvent({
      lines: reorder(this.event.lines, this.lineIndex, this.lineIndex + direction),
    });
    this.lineIndex = clampIndex(this.lineIndex + direction, this.event.lines.length);
  }
}
function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}
