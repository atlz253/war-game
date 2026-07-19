import type { GameAction } from "../../core/actions/game-actions";
import type { GameState, SideId, TeamScores } from "../../core/model/game-state";
import type { Agent } from "../agents/Agent";
import { HeuristicAgent } from "../agents/HeuristicAgent";
import { LmStudioAgent } from "../agents/LmStudioAgent";
import { RandomAgent } from "../agents/RandomAgent";
import type { LmStudioConnection } from "../lm-studio/lm-studio-client";
import type { SimulationParticipantKind } from "./headless-configuration";
import { runSimulation, type SimulationActionReward } from "./run-simulation";

export interface SimulationMap {
  readonly id: string;
  readonly name: string;
  readonly createInitialState: () => GameState;
}

export interface SimulationParticipant {
  readonly kind: SimulationParticipantKind;
  readonly connection?: LmStudioConnection;
}

export interface BatchSimulationOptions {
  readonly map: SimulationMap;
  readonly blue: SimulationParticipant;
  readonly red: SimulationParticipant;
  readonly seed: number;
  readonly matches: number;
  readonly maxActions: number;
}

export interface MatchSimulationRecord {
  readonly mapId: string;
  readonly mapName: string;
  readonly seed: number;
  readonly blue: SimulationParticipantKind;
  readonly red: SimulationParticipantKind;
  readonly winner: SideId | null;
  readonly completed: boolean;
  readonly turn: number;
  readonly actionCount: number;
  readonly fallbackCount: number;
  readonly actions: readonly GameAction[];
  readonly actionRewards: readonly SimulationActionReward[];
  readonly scores: TeamScores;
  readonly finalState: GameState;
}

export interface BatchSimulationSummary {
  readonly mapId: string;
  readonly mapName: string;
  readonly blue: SimulationParticipantKind;
  readonly red: SimulationParticipantKind;
  readonly requested: number;
  readonly completed: number;
  readonly incomplete: number;
  readonly blueWins: number;
  readonly redWins: number;
  readonly blueWinRate: number;
  readonly redWinRate: number;
  readonly averageTurns: number;
  readonly averageActions: number;
  readonly fallbackCount: number;
  readonly totalBlueScore: number;
  readonly totalRedScore: number;
  readonly averageBlueScore: number;
  readonly averageRedScore: number;
  readonly baseSeed: number;
  readonly finalSeed: number;
}

export interface BatchSimulationResult {
  readonly summary: BatchSimulationSummary;
  readonly records: readonly MatchSimulationRecord[];
}

const FIRST_MATCH_INDEX = 0;
const SEED_INCREMENT = 1;
const ZERO_COUNT = 0;

export async function runBatchSimulation(
  options: BatchSimulationOptions,
): Promise<BatchSimulationResult> {
  const records: MatchSimulationRecord[] = [];

  for (let index = FIRST_MATCH_INDEX; index < options.matches; index += SEED_INCREMENT) {
    records.push(await runMatch(options, options.seed + index));
  }

  return { records, summary: createSummary(options, records) };
}

async function runMatch(
  options: BatchSimulationOptions,
  seed: number,
): Promise<MatchSimulationRecord> {
  const fallbackAgents = { blue: new HeuristicAgent(), red: new HeuristicAgent() };
  const result = await runSimulation({
    seed,
    maxActions: options.maxActions,
    createInitialState: options.map.createInitialState,
    agents: createAgents(options, seed),
    fallbackAgents,
  });

  return {
    mapId: options.map.id,
    mapName: options.map.name,
    seed,
    blue: options.blue.kind,
    red: options.red.kind,
    winner: result.finalState.winner,
    completed: result.completed,
    turn: result.finalState.turn,
    actionCount: result.replay.actions.length,
    fallbackCount: result.fallbackCount,
    actions: result.replay.actions,
    actionRewards: result.actionRewards,
    scores: result.finalState.scores,
    finalState: result.finalState,
  };
}

function createAgents(
  options: BatchSimulationOptions,
  seed: number,
): Readonly<Record<SideId, Agent>> {
  return {
    blue: createAgent(options.blue, seed),
    red: createAgent(options.red, seed),
  };
}

function createAgent(participant: SimulationParticipant, seed: number): Agent {
  if (participant.kind === "random") {
    return new RandomAgent(seed);
  }
  if (participant.kind === "lm-studio" && participant.connection) {
    return new LmStudioAgent(participant.connection);
  }
  return new HeuristicAgent();
}

function createSummary(
  options: BatchSimulationOptions,
  records: readonly MatchSimulationRecord[],
): BatchSimulationSummary {
  const completed = records.filter((record) => record.completed).length;
  const blueWins = records.filter((record) => record.winner === "blue").length;
  const redWins = records.filter((record) => record.winner === "red").length;
  const totalTurns = records.reduce((total, record) => total + record.turn, ZERO_COUNT);
  const totalActions = records.reduce((total, record) => total + record.actionCount, ZERO_COUNT);
  const fallbackCount = records.reduce((total, record) => total + record.fallbackCount, ZERO_COUNT);
  const totalBlueScore = records.reduce((total, record) => total + record.scores.blue, ZERO_COUNT);
  const totalRedScore = records.reduce((total, record) => total + record.scores.red, ZERO_COUNT);

  return {
    mapId: options.map.id,
    mapName: options.map.name,
    blue: options.blue.kind,
    red: options.red.kind,
    requested: options.matches,
    completed,
    incomplete: options.matches - completed,
    blueWins,
    redWins,
    blueWinRate: calculateRate(blueWins, completed),
    redWinRate: calculateRate(redWins, completed),
    averageTurns: calculateAverage(totalTurns, options.matches),
    averageActions: calculateAverage(totalActions, options.matches),
    fallbackCount,
    totalBlueScore,
    totalRedScore,
    averageBlueScore: calculateAverage(totalBlueScore, options.matches),
    averageRedScore: calculateAverage(totalRedScore, options.matches),
    baseSeed: options.seed,
    finalSeed: options.seed + options.matches - SEED_INCREMENT,
  };
}

function calculateRate(wins: number, completed: number): number {
  return completed === ZERO_COUNT ? ZERO_COUNT : wins / completed;
}

function calculateAverage(total: number, count: number): number {
  return count === ZERO_COUNT ? ZERO_COUNT : total / count;
}
