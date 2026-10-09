import type { Position } from "../model/game-state";

export const CAMPAIGN_SCHEMA_VERSION = 1;
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
  readonly speaker: string;
  readonly text: string;
}
export interface DialogueEvent {
  readonly id: string;
  readonly type: "dialogue";
  readonly trigger: DialogueTrigger;
  readonly lines: readonly DialogueLine[];
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
  return JSON.stringify(campaign, null, 2);
}
export function deserializeCampaign(serialized: string): CampaignDefinition {
  const value: unknown = JSON.parse(serialized);
  if (!isCampaignDefinition(value)) throw new Error("Unsupported campaign format.");
  return value;
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
    )
  );
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
    value.schemaVersion === CAMPAIGN_SCHEMA_VERSION &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.missions) &&
    value.missions.every(isMissionDefinition)
  );
}
