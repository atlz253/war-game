export type SideId = "blue" | "red";

export interface TeamScores {
  readonly blue: number;
  readonly red: number;
}

export type UnitType = "infantry" | "tank" | "artillery";

export type TerrainType = "mountain";

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface BoardState {
  readonly width: number;
  readonly height: number;
  readonly blockedCells: readonly Position[];
  readonly terrain: readonly TerrainPlacement[];
}

export interface TerrainPlacement {
  readonly type: TerrainType;
  readonly position: Position;
}

export interface UnitState {
  readonly id: string;
  readonly side: SideId;
  readonly type: UnitType;
  readonly position: Position;
  readonly health: number;
  readonly maxHealth: number;
  readonly movementPoints: number;
  readonly maxMovementPoints: number;
  readonly minAttackRange: number;
  readonly attackRange: number;
  readonly baseDamage: number;
  readonly baseDefence: number;
  readonly hasMovedThisTurn: boolean;
  readonly hasTakenMainAction: boolean;
}

export interface ControlPointState {
  readonly id: string;
  readonly position: Position;
  readonly owner: SideId | null;
}

export interface GameState {
  readonly scenarioId: string;
  readonly board: BoardState;
  readonly turn: number;
  readonly activeSide: SideId;
  readonly units: Readonly<Record<string, UnitState>>;
  readonly controlPoints: Readonly<Record<string, ControlPointState>>;
  readonly scores: TeamScores;
  readonly winner: SideId | null;
}
