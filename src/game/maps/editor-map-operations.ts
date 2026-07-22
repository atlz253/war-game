import type { MapDefinition } from "../../core/maps/map-definition";
import type { Position, SideId, UnitType } from "../../core/model/game-state";

export type EditorTool =
  | { readonly kind: "unit"; readonly side: SideId; readonly unitType: UnitType }
  | { readonly kind: "control-point"; readonly owner: SideId | null }
  | { readonly kind: "terrain"; readonly terrainType: "mountain" }
  | { readonly kind: "erase" };

export type EditorToolRejection =
  | "mountain-on-control-point"
  | "mountain-on-tank"
  | "mountain-on-artillery"
  | "control-point-on-mountain"
  | "tank-on-mountain"
  | "artillery-on-mountain";

export function applyEditorTool(
  map: MapDefinition,
  tool: EditorTool,
  position: Position,
): MapDefinition {
  if (getEditorToolRejection(map, tool, position)) {
    return map;
  }

  const units = map.units.filter((unit) => !samePosition(unit.position, position));
  const controlPoints = map.controlPoints.filter(
    (point) => !samePosition(point.position, position),
  );
  const terrain = map.terrain.filter((cell) => !samePosition(cell.position, position));

  if (tool.kind === "erase") {
    return { ...map, units, controlPoints, terrain };
  }

  if (tool.kind === "unit") {
    return {
      ...map,
      units: [...units, { side: tool.side, type: tool.unitType, position }],
      controlPoints: map.controlPoints,
      terrain: map.terrain,
    };
  }

  if (tool.kind === "terrain") {
    return {
      ...map,
      units: map.units,
      controlPoints: map.controlPoints,
      terrain: [...terrain, { type: tool.terrainType, position }],
    };
  }

  return {
    ...map,
    units: map.units,
    controlPoints: [...controlPoints, { owner: tool.owner, position }],
    terrain: map.terrain,
  };
}

export function getEditorToolRejection(
  map: MapDefinition,
  tool: EditorTool,
  position: Position,
): EditorToolRejection | null {
  const hasMountain = map.terrain.some(
    (terrain) => terrain.type === "mountain" && samePosition(terrain.position, position),
  );
  const hasControlPoint = map.controlPoints.some((point) => samePosition(point.position, position));
  const hasTank = map.units.some(
    (unit) => unit.type === "tank" && samePosition(unit.position, position),
  );
  const hasArtillery = map.units.some(
    (unit) => unit.type === "artillery" && samePosition(unit.position, position),
  );

  if (tool.kind === "terrain")
    return getMountainToolRejection(hasControlPoint, hasTank, hasArtillery);
  if (tool.kind === "control-point") {
    return hasMountain ? "control-point-on-mountain" : null;
  }
  return getUnitToolRejection(tool, hasMountain);
}

function getMountainToolRejection(
  hasControlPoint: boolean,
  hasTank: boolean,
  hasArtillery: boolean,
): EditorToolRejection | null {
  if (hasControlPoint) return "mountain-on-control-point";
  if (hasTank) return "mountain-on-tank";
  return hasArtillery ? "mountain-on-artillery" : null;
}

function getUnitToolRejection(tool: EditorTool, hasMountain: boolean): EditorToolRejection | null {
  if (!hasMountain || tool.kind !== "unit") return null;
  if (tool.unitType === "tank") return "tank-on-mountain";
  return tool.unitType === "artillery" ? "artillery-on-mountain" : null;
}

export function wouldTrimPlacements(map: MapDefinition, width: number, height: number): boolean {
  const resizedMap = { ...map, width, height };

  return (
    map.units.some((unit) => !isPositionInMap(unit.position, resizedMap)) ||
    map.controlPoints.some((point) => !isPositionInMap(point.position, resizedMap)) ||
    map.terrain.some((terrain) => !isPositionInMap(terrain.position, resizedMap))
  );
}

export function isPositionInMap(position: Position, map: MapDefinition): boolean {
  return position.x >= 0 && position.y >= 0 && position.x < map.width && position.y < map.height;
}

function samePosition(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
