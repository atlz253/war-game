import type { GameAction, MoveAction } from "../../core/actions/game-actions";
import { chebyshevDistance, getLegalActions } from "../../core/actions/get-legal-actions";
import type { GameState, UnitState } from "../../core/model/game-state";
import type { Agent, AgentContext } from "./Agent";

const HEURISTIC_AGENT_ID = "heuristic";
const NO_DISTANCE = 0;

export class HeuristicAgent implements Agent {
  public readonly id = HEURISTIC_AGENT_ID;

  public async chooseAction(state: GameState, _context: AgentContext): Promise<GameAction> {
    const actions = getLegalActions(state);

    return (
      findAttack(actions) ??
      findCapture(actions) ??
      findBestMove(state, actions) ??
      findWait(actions) ??
      endTurn(actions)
    );
  }
}

function findAttack(actions: readonly GameAction[]): GameAction | undefined {
  return actions.find((action) => action.type === "attack");
}

function findCapture(actions: readonly GameAction[]): GameAction | undefined {
  return actions.find((action) => action.type === "capture");
}

function findBestMove(state: GameState, actions: readonly GameAction[]): MoveAction | undefined {
  const moves = actions.filter((action): action is MoveAction => action.type === "move");
  let bestMove: MoveAction | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const move of moves) {
    const unit = state.units[move.unitId];

    if (!unit) {
      continue;
    }

    const distance = distanceToNearestEnemy(state, unit, move);

    if (distance < bestDistance && distance > NO_DISTANCE && isSafeArtilleryMove(unit, distance)) {
      bestMove = move;
      bestDistance = distance;
    }
  }

  return bestMove;
}

function distanceToNearestEnemy(state: GameState, unit: UnitState, move: MoveAction): number {
  const enemies = Object.values(state.units).filter((candidate) => candidate.side !== unit.side);

  return Math.min(...enemies.map((enemy) => chebyshevDistance(move.destination, enemy.position)));
}

function isSafeArtilleryMove(unit: UnitState, distanceToNearestEnemy: number): boolean {
  return unit.type !== "artillery" || distanceToNearestEnemy >= unit.minAttackRange;
}

function findWait(actions: readonly GameAction[]): GameAction | undefined {
  return actions.find((action) => action.type === "wait");
}

function endTurn(actions: readonly GameAction[]): GameAction {
  const action = actions.find((candidate) => candidate.type === "end-turn");

  if (!action) {
    throw new Error("The legal action list has no end-turn action.");
  }

  return action;
}
