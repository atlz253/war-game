import type { BoardState, Position, UnitState } from "../model/game-state";
import { getTerrainMovementCost } from "../terrain/terrain-rules";

const ORTHOGONAL_NORTH = -1;
const ORTHOGONAL_SOUTH = 1;
const ORTHOGONAL_WEST = -1;
const ORTHOGONAL_EAST = 1;
const NO_OFFSET = 0;
const NEIGHBOUR_OFFSETS: readonly Position[] = [
  { x: NO_OFFSET, y: ORTHOGONAL_NORTH },
  { x: ORTHOGONAL_EAST, y: ORTHOGONAL_NORTH },
  { x: ORTHOGONAL_EAST, y: NO_OFFSET },
  { x: ORTHOGONAL_EAST, y: ORTHOGONAL_SOUTH },
  { x: NO_OFFSET, y: ORTHOGONAL_SOUTH },
  { x: ORTHOGONAL_WEST, y: ORTHOGONAL_SOUTH },
  { x: ORTHOGONAL_WEST, y: NO_OFFSET },
  { x: ORTHOGONAL_WEST, y: ORTHOGONAL_NORTH },
];

interface PathNode {
  readonly position: Position;
  readonly path: readonly Position[];
  readonly cost: number;
  readonly sequence: number;
}

export function findPath(
  board: BoardState,
  units: Readonly<Record<string, UnitState>>,
  movingUnitId: string,
  start: Position,
  destination: Position,
): readonly Position[] | null {
  if (positionsEqual(start, destination)) {
    return [];
  }

  const queue: PathNode[] = [{ position: start, path: [], cost: NO_OFFSET, sequence: NO_OFFSET }];
  const bestCosts = new Map([[positionKey(start), NO_OFFSET]]);
  const movingUnit = units[movingUnitId];
  let nextSequence = 1;

  if (!movingUnit) {
    return null;
  }

  while (queue.length > NO_OFFSET) {
    const current = takeLowestCostNode(queue);

    if (!current) {
      return null;
    }

    if (current.cost !== bestCosts.get(positionKey(current.position))) {
      continue;
    }

    const result = visitNeighbours(
      board,
      units,
      movingUnit,
      destination,
      current,
      bestCosts,
      queue,
      nextSequence,
    );
    nextSequence += NEIGHBOUR_OFFSETS.length;

    if (result) {
      return result;
    }
  }

  return null;
}

function visitNeighbours(
  board: BoardState,
  units: Readonly<Record<string, UnitState>>,
  movingUnit: UnitState,
  destination: Position,
  current: PathNode,
  bestCosts: Map<string, number>,
  queue: PathNode[],
  initialSequence: number,
): readonly Position[] | null {
  for (const [index, offset] of NEIGHBOUR_OFFSETS.entries()) {
    const next = { x: current.position.x + offset.x, y: current.position.y + offset.y };
    const cost = current.cost + getTerrainMovementCost(board, next);

    if (
      !canEnterCell(board, units, movingUnit, current.position, next) ||
      isKnownAtLowerCost(bestCosts, next, cost)
    ) {
      continue;
    }

    const path = [...current.path, next];

    if (positionsEqual(next, destination)) {
      return path;
    }

    bestCosts.set(positionKey(next), cost);
    queue.push({ position: next, path, cost, sequence: initialSequence + index });
  }

  return null;
}

function takeLowestCostNode(queue: PathNode[]): PathNode | undefined {
  queue.sort((first, second) => first.cost - second.cost || first.sequence - second.sequence);
  return queue.shift();
}

function isKnownAtLowerCost(
  bestCosts: Map<string, number>,
  position: Position,
  cost: number,
): boolean {
  const knownCost = bestCosts.get(positionKey(position));
  return knownCost !== undefined && knownCost <= cost;
}

function canEnterCell(
  board: BoardState,
  units: Readonly<Record<string, UnitState>>,
  movingUnit: UnitState,
  from: Position,
  to: Position,
): boolean {
  return (
    isInBounds(board, to) &&
    !isOccupiedOrBlocked(board, units, movingUnit, to) &&
    !cutsCorner(board, units, movingUnit, from, to)
  );
}

function cutsCorner(
  board: BoardState,
  units: Readonly<Record<string, UnitState>>,
  movingUnit: UnitState,
  from: Position,
  to: Position,
): boolean {
  const isDiagonal = from.x !== to.x && from.y !== to.y;

  if (!isDiagonal) {
    return false;
  }

  const horizontal = { x: to.x, y: from.y };
  const vertical = { x: from.x, y: to.y };

  return (
    isOccupiedOrBlocked(board, units, movingUnit, horizontal) &&
    isOccupiedOrBlocked(board, units, movingUnit, vertical)
  );
}

function isInBounds(board: BoardState, position: Position): boolean {
  return (
    position.x >= NO_OFFSET &&
    position.x < board.width &&
    position.y >= NO_OFFSET &&
    position.y < board.height
  );
}

function isOccupiedOrBlocked(
  board: BoardState,
  units: Readonly<Record<string, UnitState>>,
  movingUnit: UnitState,
  position: Position,
): boolean {
  return (
    board.blockedCells.some((cell) => positionsEqual(cell, position)) ||
    isMountainImpassableFor(movingUnit, board, position) ||
    Object.values(units).some(
      (unit) => unit.id !== movingUnit.id && positionsEqual(unit.position, position),
    )
  );
}

function isMountainImpassableFor(unit: UnitState, board: BoardState, position: Position): boolean {
  return (
    unit.type !== "infantry" &&
    board.terrain.some(
      (terrain) => terrain.type === "mountain" && positionsEqual(terrain.position, position),
    )
  );
}

export function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}

export function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}
