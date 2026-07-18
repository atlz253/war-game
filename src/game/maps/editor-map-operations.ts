import type { MapDefinition } from "../../core/maps/map-definition";
import type { Position, SideId, UnitType } from "../../core/model/game-state";

export type EditorTool =
  | { readonly kind: "unit"; readonly side: SideId; readonly unitType: UnitType }
  | { readonly kind: "control-point"; readonly owner: SideId | null }
  | { readonly kind: "erase" };

export function applyEditorTool(
  map: MapDefinition,
  tool: EditorTool,
  position: Position,
): MapDefinition {
  const units = map.units.filter((unit) => !samePosition(unit.position, position));
  const controlPoints = map.controlPoints.filter(
    (point) => !samePosition(point.position, position),
  );

  if (tool.kind === "erase") {
    return { ...map, units, controlPoints };
  }

  if (tool.kind === "unit") {
    return {
      ...map,
      units: [...units, { side: tool.side, type: tool.unitType, position }],
      controlPoints: map.controlPoints,
    };
  }

  return {
    ...map,
    units: map.units,
    controlPoints: [...controlPoints, { owner: tool.owner, position }],
  };
}

export function wouldTrimPlacements(map: MapDefinition, width: number, height: number): boolean {
  const resizedMap = { ...map, width, height };

  return (
    map.units.some((unit) => !isPositionInMap(unit.position, resizedMap)) ||
    map.controlPoints.some((point) => !isPositionInMap(point.position, resizedMap))
  );
}

export function isPositionInMap(position: Position, map: MapDefinition): boolean {
  return position.x >= 0 && position.y >= 0 && position.x < map.width && position.y < map.height;
}

function samePosition(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}
