import type { GameState, Position, SideId } from "../model/game-state";
import { positionsEqual } from "../pathfinding/find-path";
import type { ApplyActionResult } from "../rules/apply-action";
import type { DialogueTrigger, MissionDefinition, UnitSelector } from "./definition";
export type MissionSignal =
  | { readonly type: "mission-start" }
  | { readonly type: "mission-end"; readonly winner: SideId }
  | { readonly type: "turn"; readonly number: number }
  | { readonly type: "unit-selected"; readonly unitId: string }
  | { readonly type: "unit-moved"; readonly unitId: string; readonly to: Position };
export interface DialogueOccurrence {
  readonly eventId: string;
  readonly sequence: number;
  readonly afterActionCount: number;
  readonly signal: MissionSignal;
}
export interface NarrativeJournal {
  readonly fired: readonly string[];
  readonly occurrences: readonly DialogueOccurrence[];
}
export function emptyJournal(): NarrativeJournal {
  return { fired: [], occurrences: [] };
}
export function initialSignals(state: GameState): MissionSignal[] {
  return [{ type: "mission-start" }, { type: "turn", number: state.turn }];
}
export function actionSignals(result: ApplyActionResult): MissionSignal[] {
  if (!result.accepted) return [];
  const signals: MissionSignal[] = [];
  for (const event of result.events) {
    if (event.type === "unit-moved")
      signals.push({ type: "unit-moved", unitId: event.unitId, to: event.to });
    if (event.type === "turn-ended") signals.push({ type: "turn", number: event.turn });
    if (event.type === "victory-achieved")
      signals.push({ type: "mission-end", winner: event.winner });
  }
  return signals;
}
export function selectionSignal(
  state: GameState,
  previous: string | null,
  selected: string | null,
  blocked: boolean,
): MissionSignal | null {
  if (
    blocked ||
    state.winner ||
    state.activeSide !== "blue" ||
    !selected ||
    previous === selected ||
    state.units[selected]?.side !== "blue"
  )
    return null;
  return { type: "unit-selected", unitId: selected };
}
export function matchesTrigger(trigger: DialogueTrigger, signal: MissionSignal): boolean {
  if (trigger.type === "unit-arrived")
    return (
      signal.type === "unit-moved" &&
      matchesUnit(trigger.unit, signal.unitId) &&
      positionsEqual(trigger.cell, signal.to)
    );
  if (trigger.type !== signal.type) return false;
  if (trigger.type === "turn") return signal.type === "turn" && trigger.number === signal.number;
  if ("unit" in trigger) return "unitId" in signal && matchesUnit(trigger.unit, signal.unitId);
  return true;
}
export function matchesUnit(selector: UnitSelector, id: string): boolean {
  return selector.type === "any" || selector.unitId === id;
}
export function matchSignal(
  mission: MissionDefinition,
  journal: NarrativeJournal,
  signal: MissionSignal,
  afterActionCount: number,
): NarrativeJournal {
  const events = mission.events.filter(
    (event) => !journal.fired.includes(event.id) && matchesTrigger(event.trigger, signal),
  );
  return {
    fired: [...journal.fired, ...events.map((event) => event.id)],
    occurrences: [
      ...journal.occurrences,
      ...events.map((event, index) => ({
        eventId: event.id,
        sequence: journal.occurrences.length + index,
        afterActionCount,
        signal: structuredClone(signal),
      })),
    ],
  };
}
