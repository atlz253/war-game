export type SideId = "blue" | "red";

export type UnitType = "infantry" | "tank";

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface BoardState {
  readonly width: number;
  readonly height: number;
  readonly blockedCells: readonly Position[];
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
  readonly attackRange: number;
  readonly baseDamage: number;
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
  readonly winner: SideId | null;
}
