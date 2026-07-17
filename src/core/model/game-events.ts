import type { Position, SideId } from "./game-state";

export interface UnitMovedEvent {
  readonly type: "unit-moved";
  readonly unitId: string;
  readonly from: Position;
  readonly to: Position;
  readonly cost: number;
}

export interface UnitAttackedEvent {
  readonly type: "unit-attacked";
  readonly attackerUnitId: string;
  readonly targetUnitId: string;
}

export interface UnitDamagedEvent {
  readonly type: "unit-damaged";
  readonly unitId: string;
  readonly damage: number;
  readonly remainingHealth: number;
}

export interface UnitDestroyedEvent {
  readonly type: "unit-destroyed";
  readonly unitId: string;
}

export interface ControlPointCapturedEvent {
  readonly type: "control-point-captured";
  readonly controlPointId: string;
  readonly owner: SideId;
}

export interface UnitWaitedEvent {
  readonly type: "unit-waited";
  readonly unitId: string;
}

export interface TurnEndedEvent {
  readonly type: "turn-ended";
  readonly turn: number;
  readonly activeSide: SideId;
}

export interface VictoryAchievedEvent {
  readonly type: "victory-achieved";
  readonly winner: SideId;
}

export type GameEvent =
  | UnitMovedEvent
  | UnitAttackedEvent
  | UnitDamagedEvent
  | UnitDestroyedEvent
  | ControlPointCapturedEvent
  | UnitWaitedEvent
  | TurnEndedEvent
  | VictoryAchievedEvent;
