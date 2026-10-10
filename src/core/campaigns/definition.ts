import type { Position } from "../model/game-state";

export const CAMPAIGN_SCHEMA_VERSION = 2;
export const LEGACY_CAMPAIGN_SCHEMA_VERSION = 1;
export type UnitSelector =
  | { readonly type: "any" }
  | { readonly type: "specific"; readonly unitId: string };
export type VictoryPolicy =
  | { readonly type: "standard-match" }
  | {
      readonly type: "standard-match-or-reach-cell";
      readonly unit: UnitSelector;
      readonly cell: Position;
      readonly mapBinding: string;
    };
export type DialogueTrigger =
  | { readonly type: "mission-start" | "mission-end" }
  | { readonly type: "turn"; readonly number: number }
  | {
      readonly type: "unit-moved" | "unit-selected";
      readonly unit: UnitSelector;
      readonly mapBinding: string;
    }
  | {
      readonly type: "unit-arrived";
      readonly unit: UnitSelector;
      readonly cell: Position;
      readonly mapBinding: string;
    };
export interface DialogueLine {
  /** Optional only for legacy in-memory inputs; v2 files always require an ID. */
  readonly id?: string;
  readonly speaker: string;
  readonly text: string;
}
export interface DialogueEvent {
  readonly id: string;
  readonly type: "dialogue";
  readonly trigger: DialogueTrigger;
  readonly lines: readonly DialogueLine[];
  readonly localizations?: Readonly<Record<string, Readonly<Record<string, DialogueTranslation>>>>;
}
export interface DialogueTranslation {
  readonly speaker?: string;
  readonly text?: string;
}
export interface MissionDefinition {
  readonly id: string;
  readonly name: string;
  readonly builtInMapId: string;
  readonly conditions: VictoryPolicy;
  readonly events: readonly DialogueEvent[];
}
export interface CampaignDefinition {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly missions: readonly MissionDefinition[];
}
export function serializeCampaign(campaign: CampaignDefinition): string {
  return JSON.stringify(normalizeCampaign(campaign), null, 2);
}
export function deserializeCampaign(serialized: string): CampaignDefinition {
  const value: unknown = JSON.parse(serialized);
  if (!isCampaignDefinition(value)) throw new Error("Unsupported campaign format.");
  return normalizeCampaign(value);
}
export function normalizeCampaign(campaign: CampaignDefinition): CampaignDefinition {
  if (!isCampaignDefinition(campaign)) throw new Error("Unsupported campaign format.");
  return {
    ...structuredClone(campaign),
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    missions: campaign.missions.map(normalizeMission),
  };
}
export function normalizeMission(mission: MissionDefinition): MissionDefinition {
  return {
    ...structuredClone(mission),
    events: mission.events.map((event) => ({
      ...structuredClone(event),
      lines: normalizeLines(event.lines),
    })),
  };
}
function normalizeLines(lines: readonly DialogueLine[]): DialogueLine[] {
  const ids = new Set(lines.flatMap((line) => (line.id ? [line.id] : [])));
  return lines.map((line, index) => {
    if (line.id) return { ...line };
    let suffix = index + 1;
    while (ids.has(`line-${suffix}`)) suffix++;
    const id = `line-${suffix}`;
    ids.add(id);
    return { ...line, id };
  });
}
export function isNarrativeLocaleId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isCell(value: unknown): value is Position {
  return isRecord(value) && Number.isInteger(value.x) && Number.isInteger(value.y);
}
export function isUnitSelector(value: unknown): value is UnitSelector {
  return (
    isRecord(value) &&
    (value.type === "any" || (value.type === "specific" && typeof value.unitId === "string"))
  );
}
export function isVictoryPolicy(value: unknown): value is VictoryPolicy {
  if (!isRecord(value)) return false;
  if (value.type === "standard-match") return true;
  return (
    value.type === "standard-match-or-reach-cell" &&
    isUnitSelector(value.unit) &&
    isCell(value.cell) &&
    typeof value.mapBinding === "string"
  );
}
export function isDialogueTrigger(value: unknown): value is DialogueTrigger {
  if (!isRecord(value)) return false;
  if (value.type === "mission-start" || value.type === "mission-end") return true;
  if (value.type === "turn")
    return typeof value.number === "number" && Number.isFinite(value.number);
  if (!["unit-moved", "unit-selected", "unit-arrived"].includes(String(value.type))) return false;
  return (
    isUnitSelector(value.unit) &&
    typeof value.mapBinding === "string" &&
    (value.type !== "unit-arrived" || isCell(value.cell))
  );
}
export function isDialogueEvent(value: unknown): value is DialogueEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.type === "dialogue" &&
    isDialogueTrigger(value.trigger) &&
    Array.isArray(value.lines) &&
    value.lines.every(
      (line) => isRecord(line) && typeof line.speaker === "string" && typeof line.text === "string",
    ) &&
    validLineIdentities(value.lines, false) &&
    validTranslations(value.localizations, value.lines)
  );
}
function validLineIdentities(lines: readonly unknown[], required: boolean): boolean {
  const ids: string[] = [];
  for (const line of lines) {
    if (!isRecord(line)) return false;
    if (line.id === undefined && !required) continue;
    if (typeof line.id !== "string" || !line.id.trim() || ids.includes(line.id)) return false;
    ids.push(line.id);
  }
  return true;
}
function validTranslations(value: unknown, lines: readonly unknown[]): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const ids = new Set(lines.filter(isRecord).map((line) => line.id));
  for (const [localeId, translations] of Object.entries(value)) {
    if (!isNarrativeLocaleId(localeId) || localeId === "en" || !isRecord(translations))
      return false;
    for (const [id, fields] of Object.entries(translations)) {
      if (!ids.has(id) || !isRecord(fields)) return false;
      if (
        !Object.entries(fields).every(
          ([key, text]) => ["speaker", "text"].includes(key) && typeof text === "string",
        )
      )
        return false;
    }
  }
  return true;
}
export function isMissionDefinition(value: unknown): value is MissionDefinition {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.builtInMapId === "string" &&
    isVictoryPolicy(value.conditions) &&
    Array.isArray(value.events) &&
    value.events.every(isDialogueEvent)
  );
}
export function isCampaignDefinition(value: unknown): value is CampaignDefinition {
  return (
    isRecord(value) &&
    (value.schemaVersion === CAMPAIGN_SCHEMA_VERSION ||
      value.schemaVersion === LEGACY_CAMPAIGN_SCHEMA_VERSION) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.missions) &&
    value.missions.every(isMissionDefinition) &&
    (value.schemaVersion !== CAMPAIGN_SCHEMA_VERSION ||
      value.missions.every((mission) =>
        mission.events.every((event: DialogueEvent) => validLineIdentities(event.lines, true)),
      ))
  );
}
