import type { GameAction } from "../../core/actions/game-actions";
import type { GameState, Position } from "../../core/model/game-state";
import { findPath } from "../../core/pathfinding/find-path";

export interface MovementRoute {
  readonly unitId: string;
  readonly from: Position;
  readonly cells: readonly Position[];
}

/** Derive display data only from the snapshot against which the move was accepted. */
export function movementRoute(
  before: GameState,
  action: GameAction,
  accepted: boolean,
): MovementRoute | null {
  if (!accepted || action.type !== "move") return null;
  const unit = before.units[action.unitId];
  if (!unit) return null;
  const cells = findPath(before.board, before.units, unit.id, unit.position, action.destination);
  return cells?.length ? { unitId: unit.id, from: unit.position, cells } : null;
}
