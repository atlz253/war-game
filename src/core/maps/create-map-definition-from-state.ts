import type { GameState } from "../model/game-state";
import type { MapDefinition } from "./map-definition";

const MAP_SCHEMA_VERSION = 2;

export function createMapDefinitionFromState(state: GameState, name: string): MapDefinition {
  return {
    schemaVersion: MAP_SCHEMA_VERSION,
    id: state.scenarioId,
    name,
    width: state.board.width,
    height: state.board.height,
    units: Object.values(state.units).map((unit) => ({
      side: unit.side,
      type: unit.type,
      position: { ...unit.position },
    })),
    controlPoints: Object.values(state.controlPoints).map((point) => ({
      owner: point.owner,
      position: { ...point.position },
    })),
    terrain: state.board.terrain.map((terrain) => ({
      type: terrain.type,
      position: { ...terrain.position },
    })),
  };
}
