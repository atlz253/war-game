import type { BoardState, Position } from "../model/game-state";
import { positionsEqual } from "../pathfinding/find-path";

const ZERO_DISTANCE = 0;
const HALF_CELL = 0.5;

export function isWithinAttackRange(
  origin: Position,
  target: Position,
  minimumRange: number,
  maximumRange: number,
): boolean {
  const distance = Math.max(Math.abs(origin.x - target.x), Math.abs(origin.y - target.y));

  return distance > ZERO_DISTANCE && distance >= minimumRange && distance <= maximumRange;
}

export function hasClearMountainLineOfFire(
  board: BoardState,
  origin: Position,
  target: Position,
): boolean {
  return !getSupercoverCells(origin, target).some(
    (cell) =>
      !positionsEqual(cell, origin) &&
      !positionsEqual(cell, target) &&
      board.terrain.some(
        (terrain) => terrain.type === "mountain" && positionsEqual(terrain.position, cell),
      ),
  );
}

function getSupercoverCells(origin: Position, target: Position): readonly Position[] {
  const cells = [{ ...origin }];
  const horizontalDistance = target.x - origin.x;
  const verticalDistance = target.y - origin.y;
  const horizontalDirection = Math.sign(horizontalDistance);
  const verticalDirection = Math.sign(verticalDistance);
  const horizontalStep =
    horizontalDistance === ZERO_DISTANCE ? Infinity : 1 / Math.abs(horizontalDistance);
  const verticalStep =
    verticalDistance === ZERO_DISTANCE ? Infinity : 1 / Math.abs(verticalDistance);
  let horizontalProgress = horizontalStep * HALF_CELL;
  let verticalProgress = verticalStep * HALF_CELL;
  let current = { ...origin };

  while (!positionsEqual(current, target)) {
    if (horizontalProgress < verticalProgress) {
      current = { x: current.x + horizontalDirection, y: current.y };
      horizontalProgress += horizontalStep;
    } else if (verticalProgress < horizontalProgress) {
      current = { x: current.x, y: current.y + verticalDirection };
      verticalProgress += verticalStep;
    } else {
      addCornerAdjacentCells(cells, current, horizontalDirection, verticalDirection);
      current = { x: current.x + horizontalDirection, y: current.y + verticalDirection };
      horizontalProgress += horizontalStep;
      verticalProgress += verticalStep;
    }
    cells.push(current);
  }

  return cells;
}

function addCornerAdjacentCells(
  cells: Position[],
  current: Position,
  horizontalDirection: number,
  verticalDirection: number,
): void {
  cells.push({ x: current.x + horizontalDirection, y: current.y });
  cells.push({ x: current.x, y: current.y + verticalDirection });
}
