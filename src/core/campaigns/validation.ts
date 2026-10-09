import {
  createGameStateFromMap,
  isMapReadyForMatch,
  type MapDefinition,
  validateMapDefinition,
} from "../maps/map-definition";
import type { GameState, Position } from "../model/game-state";
import { findPath } from "../pathfinding/find-path";
import {
  type CampaignDefinition,
  isCampaignDefinition,
  type MissionDefinition,
  type UnitSelector,
} from "./definition";

export function validateCampaignReadiness(
  campaign: CampaignDefinition,
  maps: readonly MapDefinition[],
): string[] {
  if (!isCampaignDefinition(campaign)) return ["campaign: unsupported format"];
  const errors: string[] = [];
  checkIdentity(campaign, "campaign", new Set(), errors);
  if (!campaign.missions.length) errors.push("missions: at least one mission required");
  const ids = new Set<string>();
  campaign.missions.forEach((mission, index) => {
    const path = `missions[${index}]`;
    checkIdentity(mission, path, ids, errors);
    errors.push(...validateMissionReadiness(mission, maps, path));
  });
  return errors;
}
export function validateMissionReadiness(
  mission: MissionDefinition,
  maps: readonly MapDefinition[],
  path = "mission",
): string[] {
  const errors: string[] = [];
  checkIdentity(mission, path, new Set(), errors);
  const map = maps.find((candidate) => candidate.id === mission.builtInMapId);
  if (!map || !validateMapDefinition(map).isValid)
    return [`${path}.builtInMapId: missing or invalid map`];
  const state = createGameStateFromMap(map);
  const policy = mission.conditions;
  if (policy.type === "standard-match") {
    if (!isMapReadyForMatch(map)) errors.push(`${path}.conditions: both sides required`);
  } else {
    checkBinding(policy.mapBinding, map, `${path}.conditions`, errors);
    checkSelector(policy.unit, state, `${path}.conditions.unit`, errors, true);
    checkCell(policy.cell, map, `${path}.conditions.cell`, errors);
    if (!objectiveReachable(state, policy.unit, policy.cell))
      errors.push(`${path}.conditions.cell: unreachable objective`);
  }
  const ids = new Set<string>();
  mission.events.forEach((event, index) => {
    const eventPath = `${path}.events[${index}]`;
    if (!event.id.trim() || ids.has(event.id)) errors.push(`${eventPath}.id: empty or duplicate`);
    ids.add(event.id);
    if (!event.lines.length) errors.push(`${eventPath}.lines: dialogue is empty`);
    event.lines.forEach((line, lineIndex) => {
      if (!line.speaker.trim() || !line.text.trim())
        errors.push(`${eventPath}.lines[${lineIndex}]: speaker and text required`);
    });
    const trigger = event.trigger;
    if (trigger.type === "turn" && (!Number.isInteger(trigger.number) || trigger.number < 1))
      errors.push(`${eventPath}.trigger.number: positive integer required`);
    if ("unit" in trigger) {
      checkBinding(trigger.mapBinding, map, `${eventPath}.trigger`, errors);
      checkSelector(
        trigger.unit,
        state,
        `${eventPath}.trigger.unit`,
        errors,
        trigger.type === "unit-selected",
      );
    }
    if ("cell" in trigger) checkCell(trigger.cell, map, `${eventPath}.trigger.cell`, errors);
  });
  return errors;
}
export function createMissionState(mission: MissionDefinition, map: MapDefinition): GameState {
  const errors = validateMissionReadiness(mission, [map]);
  if (errors.length) throw new Error(errors.join("; "));
  return { ...createGameStateFromMap(map), victoryPolicy: structuredClone(mission.conditions) };
}
function checkIdentity(
  value: { id: string; name: string },
  path: string,
  ids: Set<string>,
  errors: string[],
): void {
  if (!value.id.trim() || ids.has(value.id)) errors.push(`${path}.id: empty or duplicate`);
  if (!value.name.trim()) errors.push(`${path}.name: required`);
  ids.add(value.id);
}
function checkBinding(binding: string, map: MapDefinition, path: string, errors: string[]): void {
  if (binding !== map.id) errors.push(`${path}.mapBinding: explicitly rebind to ${map.id}`);
}
function checkSelector(
  selector: UnitSelector,
  state: GameState,
  path: string,
  errors: string[],
  blueOnly: boolean,
): void {
  const candidates = Object.values(state.units).filter(
    (unit) =>
      (!blueOnly || unit.side === "blue") &&
      (selector.type === "any" || selector.unitId === unit.id),
  );
  if (!candidates.length) errors.push(`${path}: missing or ineligible unit`);
}
function checkCell(cell: Position, map: MapDefinition, path: string, errors: string[]): void {
  if (
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.y) ||
    cell.x < 0 ||
    cell.y < 0 ||
    cell.x >= map.width ||
    cell.y >= map.height
  )
    errors.push(`${path}: cell out of bounds`);
}
function objectiveReachable(state: GameState, selector: UnitSelector, cell: Position): boolean {
  return Object.values(state.units).some(
    (unit) =>
      unit.side === "blue" &&
      (selector.type === "any" || selector.unitId === unit.id) &&
      findPath(state.board, { [unit.id]: unit }, unit.id, unit.position, cell) !== null,
  );
}
