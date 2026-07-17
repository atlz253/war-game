import type { Position } from "../model/game-state";

export interface MoveAction {
  readonly type: "move";
  readonly unitId: string;
  readonly destination: Position;
}

export interface AttackAction {
  readonly type: "attack";
  readonly unitId: string;
  readonly targetUnitId: string;
}

export interface CaptureAction {
  readonly type: "capture";
  readonly unitId: string;
  readonly controlPointId: string;
}

export interface WaitAction {
  readonly type: "wait";
  readonly unitId: string;
}

export interface EndTurnAction {
  readonly type: "end-turn";
}

export type GameAction = MoveAction | AttackAction | CaptureAction | WaitAction | EndTurnAction;
