import { createGameStateFromMap, type MapDefinition } from "../maps/map-definition";
import type { UnitState } from "../model/game-state";
import { getBuiltInMap } from "./built-in-maps";

export const SKIRMISH_SCENARIO_ID = "skirmish-12x8";
export const BOARD_WIDTH = 12;
export const BOARD_HEIGHT = 8;

export function getSkirmishMapDefinition(): MapDefinition {
  const map = getBuiltInMap(SKIRMISH_SCENARIO_ID);

  if (!map) throw new Error("Built-in Skirmish 12×8 map is missing.");
  return map;
}

export function createSkirmishGameState() {
  const map = getSkirmishMapDefinition();
  const state = createGameStateFromMap(map);
  return { ...state, units: orderUnitsAsDefined(state.units, map) };
}

function orderUnitsAsDefined(
  units: Record<string, UnitState>,
  map: MapDefinition,
): Record<string, UnitState> {
  const orderedUnits = map.units.map((placement) =>
    Object.values(units).find(
      (unit) =>
        unit.side === placement.side &&
        unit.type === placement.type &&
        unit.position.x === placement.position.x &&
        unit.position.y === placement.position.y,
    ),
  );

  const completeUnits = orderedUnits.filter((unit): unit is UnitState => unit !== undefined);
  if (completeUnits.length !== orderedUnits.length) {
    throw new Error("Built-in Skirmish map could not be converted to units.");
  }

  return Object.fromEntries(completeUnits.map((unit) => [unit.id, unit]));
}
