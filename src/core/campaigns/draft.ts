import type { DialogueEvent, MissionDefinition } from "./definition";
export function append<T>(items: readonly T[], item: T): T[] {
  return [...items, item];
}
export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return result;
  const [item] = result.splice(from, 1);
  if (item !== undefined) result.splice(to, 0, item);
  return result;
}
export function changeMissionMap(mission: MissionDefinition, mapId: string): MissionDefinition {
  return {
    ...mission,
    builtInMapId: mapId,
    conditions:
      mission.conditions.type === "standard-match"
        ? mission.conditions
        : { ...mission.conditions, mapBinding: "" },
    events: mission.events.map((event) => bindEvent(event, "")),
  };
}
export function rebindMission(mission: MissionDefinition): MissionDefinition {
  return {
    ...mission,
    conditions:
      mission.conditions.type === "standard-match"
        ? mission.conditions
        : { ...mission.conditions, mapBinding: mission.builtInMapId },
    events: mission.events.map((event) => bindEvent(event, mission.builtInMapId)),
  };
}
function bindEvent(event: DialogueEvent, mapBinding: string): DialogueEvent {
  return "unit" in event.trigger ? { ...event, trigger: { ...event.trigger, mapBinding } } : event;
}
