import type {
  ControlPointState,
  GameState,
  Position,
  SideId,
  TerrainPlacement,
  TerrainType,
  UnitState,
  UnitType,
} from "../model/game-state";
import { createInitialTeamScores } from "../scoring/team-scores";

export const MAP_SCHEMA_VERSION = 2;
const LEGACY_MAP_SCHEMA_VERSION = 1;

export interface MapUnitPlacement {
  readonly side: SideId;
  readonly type: UnitType;
  readonly position: Position;
}

export interface MapControlPointPlacement {
  readonly owner: SideId | null;
  readonly position: Position;
}

export interface MapTerrainPlacement extends TerrainPlacement {}

export interface MapDefinition {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly units: readonly MapUnitPlacement[];
  readonly controlPoints: readonly MapControlPointPlacement[];
  readonly terrain: readonly MapTerrainPlacement[];
}

export type MapValidationError =
  | "invalid-map-id"
  | "invalid-map-name"
  | "invalid-board-size"
  | "unit-out-of-bounds"
  | "control-point-out-of-bounds"
  | "terrain-out-of-bounds"
  | "duplicate-unit-position"
  | "duplicate-control-point-position"
  | "duplicate-terrain-position"
  | "invalid-terrain-type"
  | "mountain-control-point-conflict"
  | "tank-on-mountain"
  | "artillery-on-mountain";

export interface MapValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly MapValidationError[];
}

const INITIAL_TURN = 1;
const BLUE_SIDE: SideId = "blue";
const INFANTRY_BASE_DEFENCE = 0;
const INFANTRY_MAX_AMMO = 6;
const TANK_BASE_DEFENCE = 2;
const TANK_MAX_AMMO = 5;
const ARTILLERY_BASE_DEFENCE = 0;
const ARTILLERY_MAX_AMMO = 4;
const UNIT_STATS: Readonly<Record<UnitType, UnitStats>> = {
  infantry: {
    health: 10,
    movementPoints: 4,
    minAttackRange: 1,
    attackRange: 1,
    baseDamage: 3,
    baseDefence: INFANTRY_BASE_DEFENCE,
    maxAmmo: INFANTRY_MAX_AMMO,
  },
  tank: {
    health: 16,
    movementPoints: 5,
    minAttackRange: 1,
    attackRange: 1,
    baseDamage: 5,
    baseDefence: TANK_BASE_DEFENCE,
    maxAmmo: TANK_MAX_AMMO,
  },
  artillery: {
    health: 8,
    movementPoints: 3,
    minAttackRange: 2,
    attackRange: 4,
    baseDamage: 4,
    baseDefence: ARTILLERY_BASE_DEFENCE,
    maxAmmo: ARTILLERY_MAX_AMMO,
  },
};

interface UnitStats {
  readonly health: number;
  readonly movementPoints: number;
  readonly minAttackRange: number;
  readonly attackRange: number;
  readonly baseDamage: number;
  readonly baseDefence: number;
  readonly maxAmmo: number;
}

export function createMapDefinition(
  id: string,
  name: string,
  width: number,
  height: number,
): MapDefinition {
  return {
    schemaVersion: MAP_SCHEMA_VERSION,
    id,
    name,
    width,
    height,
    units: [],
    controlPoints: [],
    terrain: [],
  };
}

export function validateMapDefinition(map: MapDefinition): MapValidationResult {
  const errors: MapValidationError[] = [];

  addMapMetadataErrors(map, errors);
  addPlacementErrors(map, errors);

  return { isValid: errors.length === 0, errors };
}

export function isMapReadyForMatch(map: MapDefinition): boolean {
  return (
    validateMapDefinition(map).isValid &&
    map.units.some((unit) => unit.side === "blue") &&
    map.units.some((unit) => unit.side === "red")
  );
}

export function createGameStateFromMap(map: MapDefinition): GameState {
  const validation = validateMapDefinition(map);

  if (!validation.isValid) {
    throw new Error(
      `Cannot create a game state from an invalid map: ${validation.errors.join(", ")}.`,
    );
  }

  return {
    scenarioId: map.id,
    victoryPolicy: { type: "standard-match" },
    board: { width: map.width, height: map.height, blockedCells: [], terrain: map.terrain },
    turn: INITIAL_TURN,
    activeSide: BLUE_SIDE,
    units: createUnits(map.units),
    controlPoints: createControlPoints(map.controlPoints),
    scores: createInitialTeamScores(),
    winner: null,
  };
}

export function resizeMapDefinition(
  map: MapDefinition,
  width: number,
  height: number,
): MapDefinition {
  return {
    ...map,
    width,
    height,
    units: map.units.filter((unit) => isPositionInBounds(unit.position, width, height)),
    controlPoints: map.controlPoints.filter((point) =>
      isPositionInBounds(point.position, width, height),
    ),
    terrain: map.terrain.filter((terrain) => isPositionInBounds(terrain.position, width, height)),
  };
}

export function serializeMapDefinition(map: MapDefinition): string {
  return JSON.stringify(map, null, 2);
}

export function deserializeMapDefinition(serializedMap: string): MapDefinition {
  const parsed: unknown = JSON.parse(serializedMap);

  const migratedMap = migrateMapDefinition(parsed);

  if (!isMapDefinition(migratedMap)) {
    throw new Error("The imported file is not a supported AI War Game map.");
  }

  const validation = validateMapDefinition(migratedMap);

  if (!validation.isValid) {
    throw new Error(`The imported map is invalid: ${validation.errors.join(", ")}.`);
  }

  return migratedMap;
}

function addMapMetadataErrors(map: MapDefinition, errors: MapValidationError[]): void {
  if (map.id.trim().length === 0) {
    errors.push("invalid-map-id");
  }
  if (map.name.trim().length === 0) {
    errors.push("invalid-map-name");
  }
  if (!isPositiveInteger(map.width) || !isPositiveInteger(map.height)) {
    errors.push("invalid-board-size");
  }
}

function addPlacementErrors(map: MapDefinition, errors: MapValidationError[]): void {
  addTerrainPlacementErrors(map, errors);
  addUnitPlacementErrors(map, errors);
  addControlPointPlacementErrors(map, errors);
  addTerrainConflictErrors(map, errors);
}

function addTerrainPlacementErrors(map: MapDefinition, errors: MapValidationError[]): void {
  const occupied = new Set<string>();

  for (const terrain of map.terrain) {
    if (!isTerrainType(terrain.type)) {
      errors.push("invalid-terrain-type");
      continue;
    }
    if (!isPositionInBounds(terrain.position, map.width, map.height)) {
      errors.push("terrain-out-of-bounds");
      continue;
    }
    if (occupied.has(positionKey(terrain.position))) {
      errors.push("duplicate-terrain-position");
      continue;
    }
    occupied.add(positionKey(terrain.position));
  }
}

function addUnitPlacementErrors(map: MapDefinition, errors: MapValidationError[]): void {
  const occupied = new Set<string>();

  for (const unit of map.units) {
    if (!isPositionInBounds(unit.position, map.width, map.height)) {
      errors.push("unit-out-of-bounds");
      continue;
    }
    if (occupied.has(positionKey(unit.position))) {
      errors.push("duplicate-unit-position");
      continue;
    }
    occupied.add(positionKey(unit.position));
  }
}

function addControlPointPlacementErrors(map: MapDefinition, errors: MapValidationError[]): void {
  const occupied = new Set<string>();

  for (const controlPoint of map.controlPoints) {
    if (!isPositionInBounds(controlPoint.position, map.width, map.height)) {
      errors.push("control-point-out-of-bounds");
      continue;
    }
    if (occupied.has(positionKey(controlPoint.position))) {
      errors.push("duplicate-control-point-position");
      continue;
    }
    occupied.add(positionKey(controlPoint.position));
  }
}

function addTerrainConflictErrors(map: MapDefinition, errors: MapValidationError[]): void {
  const mountainPositions = new Set(
    map.terrain
      .filter((terrain) => terrain.type === "mountain")
      .map((terrain) => positionKey(terrain.position)),
  );

  for (const controlPoint of map.controlPoints) {
    if (mountainPositions.has(positionKey(controlPoint.position))) {
      errors.push("mountain-control-point-conflict");
    }
  }

  for (const unit of map.units) {
    if (unit.type === "tank" && mountainPositions.has(positionKey(unit.position))) {
      errors.push("tank-on-mountain");
    }
    if (unit.type === "artillery" && mountainPositions.has(positionKey(unit.position))) {
      errors.push("artillery-on-mountain");
    }
  }
}

export function createUnits(placements: readonly MapUnitPlacement[]): Record<string, UnitState> {
  const counters: Record<string, number> = {};
  const units: Record<string, UnitState> = {};

  for (const placement of sortPlacements(placements)) {
    const unitId = createPlacementId(placement.side, placement.type, counters);
    const stats = UNIT_STATS[placement.type];
    units[unitId] = {
      id: unitId,
      side: placement.side,
      type: placement.type,
      position: placement.position,
      health: stats.health,
      maxHealth: stats.health,
      movementPoints: stats.movementPoints,
      maxMovementPoints: stats.movementPoints,
      minAttackRange: stats.minAttackRange,
      attackRange: stats.attackRange,
      baseDamage: stats.baseDamage,
      baseDefence: stats.baseDefence,
      ammo: stats.maxAmmo,
      maxAmmo: stats.maxAmmo,
      hasMovedThisTurn: false,
      hasTakenMainAction: false,
    };
  }

  return units;
}

function createControlPoints(
  placements: readonly MapControlPointPlacement[],
): Record<string, ControlPointState> {
  return Object.fromEntries(
    [...placements].sort(comparePlacements).map((placement, index) => {
      const id = `control-point-${index + 1}`;
      return [id, { id, position: placement.position, owner: placement.owner }];
    }),
  );
}

function createPlacementId(side: SideId, type: UnitType, counters: Record<string, number>): string {
  const key = `${side}-${type}`;
  const nextCount = (counters[key] ?? 0) + 1;
  counters[key] = nextCount;
  return `${key}-${nextCount}`;
}

function sortPlacements<T extends { readonly position: Position }>(placements: readonly T[]): T[] {
  return [...placements].sort(comparePlacements);
}

function comparePlacements(
  first: { readonly position: Position },
  second: { readonly position: Position },
): number {
  return first.position.y - second.position.y || first.position.x - second.position.x;
}

function isPositionInBounds(position: Position, width: number, height: number): boolean {
  return (
    isPositiveInteger(width) &&
    isPositiveInteger(height) &&
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < width &&
    position.y < height
  );
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function positionKey(position: Position): string {
  return `${position.x}:${position.y}`;
}

function migrateMapDefinition(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const map = value as Partial<MapDefinition>;

  return map.schemaVersion === LEGACY_MAP_SCHEMA_VERSION
    ? { ...map, schemaVersion: MAP_SCHEMA_VERSION, terrain: [] }
    : value;
}

function isMapDefinition(value: unknown): value is MapDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const map = value as Partial<MapDefinition>;
  return (
    map.schemaVersion === MAP_SCHEMA_VERSION &&
    typeof map.id === "string" &&
    typeof map.name === "string" &&
    typeof map.width === "number" &&
    typeof map.height === "number" &&
    Array.isArray(map.units) &&
    Array.isArray(map.controlPoints) &&
    Array.isArray(map.terrain)
  );
}

function isTerrainType(value: string): value is TerrainType {
  return value === "forest" || value === "mountain";
}
