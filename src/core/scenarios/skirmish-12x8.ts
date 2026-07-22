import type {
  ControlPointState,
  GameState,
  Position,
  SideId,
  UnitState,
  UnitType,
} from "../model/game-state";
import { createInitialTeamScores } from "../scoring/team-scores";

export const SKIRMISH_SCENARIO_ID = "skirmish-12x8";
export const BOARD_WIDTH = 12;
export const BOARD_HEIGHT = 8;
export const INITIAL_TURN = 1;
export const INFANTRY_HEALTH = 10;
export const INFANTRY_MOVEMENT_POINTS = 4;
export const INFANTRY_MIN_ATTACK_RANGE = 1;
export const INFANTRY_ATTACK_RANGE = 1;
export const INFANTRY_BASE_DAMAGE = 3;
export const TANK_HEALTH = 16;
export const TANK_MOVEMENT_POINTS = 5;
export const TANK_MIN_ATTACK_RANGE = 1;
export const TANK_ATTACK_RANGE = 1;
export const TANK_BASE_DAMAGE = 5;
export const ARTILLERY_HEALTH = 8;
export const ARTILLERY_MOVEMENT_POINTS = 3;
export const ARTILLERY_MIN_ATTACK_RANGE = 2;
export const ARTILLERY_ATTACK_RANGE = 4;
export const ARTILLERY_BASE_DAMAGE = 4;

const BLUE_SIDE: SideId = "blue";
const RED_SIDE: SideId = "red";
const INFANTRY_TYPE: UnitType = "infantry";
const TANK_TYPE: UnitType = "tank";
const ARTILLERY_TYPE: UnitType = "artillery";
const BLUE_INFANTRY_ONE_POSITION: Position = { x: 1, y: 1 };
const BLUE_INFANTRY_TWO_POSITION: Position = { x: 1, y: 3 };
const BLUE_INFANTRY_THREE_POSITION: Position = { x: 1, y: 5 };
const BLUE_TANK_POSITION: Position = { x: 2, y: 6 };
const BLUE_ARTILLERY_POSITION: Position = { x: 2, y: 0 };
const RED_INFANTRY_ONE_POSITION: Position = { x: 10, y: 1 };
const RED_INFANTRY_TWO_POSITION: Position = { x: 10, y: 3 };
const RED_INFANTRY_THREE_POSITION: Position = { x: 10, y: 5 };
const RED_TANK_POSITION: Position = { x: 9, y: 6 };
const RED_ARTILLERY_POSITION: Position = { x: 9, y: 7 };
const CONTROL_POINT_ONE_POSITION: Position = { x: 5, y: 3 };
const CONTROL_POINT_TWO_POSITION: Position = { x: 6, y: 4 };
const MOUNTAIN_ONE_POSITION: Position = { x: 4, y: 2 };
const MOUNTAIN_TWO_POSITION: Position = { x: 7, y: 5 };

export function createSkirmishGameState(): GameState {
  return {
    scenarioId: SKIRMISH_SCENARIO_ID,
    board: {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      blockedCells: [],
      terrain: [
        { type: "mountain", position: MOUNTAIN_ONE_POSITION },
        { type: "mountain", position: MOUNTAIN_TWO_POSITION },
      ],
    },
    turn: INITIAL_TURN,
    activeSide: BLUE_SIDE,
    units: {
      "blue-infantry-1": createUnit(
        "blue-infantry-1",
        BLUE_SIDE,
        INFANTRY_TYPE,
        BLUE_INFANTRY_ONE_POSITION,
      ),
      "blue-infantry-2": createUnit(
        "blue-infantry-2",
        BLUE_SIDE,
        INFANTRY_TYPE,
        BLUE_INFANTRY_TWO_POSITION,
      ),
      "blue-infantry-3": createUnit(
        "blue-infantry-3",
        BLUE_SIDE,
        INFANTRY_TYPE,
        BLUE_INFANTRY_THREE_POSITION,
      ),
      "blue-tank-1": createUnit("blue-tank-1", BLUE_SIDE, TANK_TYPE, BLUE_TANK_POSITION),
      "blue-artillery-1": createUnit(
        "blue-artillery-1",
        BLUE_SIDE,
        ARTILLERY_TYPE,
        BLUE_ARTILLERY_POSITION,
      ),
      "red-infantry-1": createUnit(
        "red-infantry-1",
        RED_SIDE,
        INFANTRY_TYPE,
        RED_INFANTRY_ONE_POSITION,
      ),
      "red-infantry-2": createUnit(
        "red-infantry-2",
        RED_SIDE,
        INFANTRY_TYPE,
        RED_INFANTRY_TWO_POSITION,
      ),
      "red-infantry-3": createUnit(
        "red-infantry-3",
        RED_SIDE,
        INFANTRY_TYPE,
        RED_INFANTRY_THREE_POSITION,
      ),
      "red-tank-1": createUnit("red-tank-1", RED_SIDE, TANK_TYPE, RED_TANK_POSITION),
      "red-artillery-1": createUnit(
        "red-artillery-1",
        RED_SIDE,
        ARTILLERY_TYPE,
        RED_ARTILLERY_POSITION,
      ),
    },
    controlPoints: {
      "control-point-1": createControlPoint("control-point-1", CONTROL_POINT_ONE_POSITION),
      "control-point-2": createControlPoint("control-point-2", CONTROL_POINT_TWO_POSITION),
    },
    scores: createInitialTeamScores(),
    winner: null,
  };
}

function createUnit(id: string, side: SideId, type: UnitType, position: Position): UnitState {
  const stats = getUnitStats(type);

  return {
    id,
    side,
    type,
    position,
    health: stats.health,
    maxHealth: stats.health,
    movementPoints: stats.movementPoints,
    maxMovementPoints: stats.movementPoints,
    minAttackRange: stats.minAttackRange,
    attackRange: stats.attackRange,
    baseDamage: stats.baseDamage,
    hasMovedThisTurn: false,
    hasTakenMainAction: false,
  };
}

function getUnitStats(type: UnitType) {
  if (type === INFANTRY_TYPE) {
    return {
      health: INFANTRY_HEALTH,
      movementPoints: INFANTRY_MOVEMENT_POINTS,
      minAttackRange: INFANTRY_MIN_ATTACK_RANGE,
      attackRange: INFANTRY_ATTACK_RANGE,
      baseDamage: INFANTRY_BASE_DAMAGE,
    };
  }

  if (type === TANK_TYPE) {
    return {
      health: TANK_HEALTH,
      movementPoints: TANK_MOVEMENT_POINTS,
      minAttackRange: TANK_MIN_ATTACK_RANGE,
      attackRange: TANK_ATTACK_RANGE,
      baseDamage: TANK_BASE_DAMAGE,
    };
  }

  return {
    health: ARTILLERY_HEALTH,
    movementPoints: ARTILLERY_MOVEMENT_POINTS,
    minAttackRange: ARTILLERY_MIN_ATTACK_RANGE,
    attackRange: ARTILLERY_ATTACK_RANGE,
    baseDamage: ARTILLERY_BASE_DAMAGE,
  };
}

function createControlPoint(id: string, position: Position): ControlPointState {
  return { id, position, owner: null };
}
