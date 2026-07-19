import type { GameAction } from "../../core/actions/game-actions";
import {
  createGameStateFromMap,
  deserializeMapDefinition,
  type MapDefinition,
  serializeMapDefinition,
} from "../../core/maps/map-definition";
import type { SideId } from "../../core/model/game-state";
import type { ReplayRecord } from "../../core/replay/replay-actions";
import { createReplayTimeline } from "../../core/replay/replay-timeline";
import type { MatchConfiguration } from "../match/match-configuration";

export const RECORDED_MATCH_SCHEMA_VERSION = 1;
export const LIVE_MATCH_REPLAY_SEED = 0;

export interface RecordedMatch {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly savedAt: string;
  readonly winner: SideId;
  readonly turn: number;
  readonly mapDefinition: MapDefinition;
  readonly matchConfiguration: MatchConfiguration;
  readonly replay: ReplayRecord;
}

export interface CreateRecordedMatchOptions {
  readonly id: string;
  readonly name: string;
  readonly savedAt: string;
  readonly mapDefinition: MapDefinition;
  readonly matchConfiguration: MatchConfiguration;
  readonly actions: readonly GameAction[];
}

export function createRecordedMatch(options: CreateRecordedMatchOptions): RecordedMatch {
  const timeline = createReplayTimeline(
    () => createGameStateFromMap(options.mapDefinition),
    options.actions,
  );
  const winner = timeline.finalState.winner;

  if (!winner) {
    throw new Error("A recorded match must have a winner.");
  }

  return {
    schemaVersion: RECORDED_MATCH_SCHEMA_VERSION,
    id: options.id,
    name: options.name,
    savedAt: options.savedAt,
    winner,
    turn: timeline.finalState.turn,
    mapDefinition: options.mapDefinition,
    matchConfiguration: options.matchConfiguration,
    replay: {
      scenarioId: options.mapDefinition.id,
      seed: LIVE_MATCH_REPLAY_SEED,
      actions: [...options.actions],
    },
  };
}

export function serializeRecordedMatch(recordedMatch: RecordedMatch): string {
  return JSON.stringify(recordedMatch, null, 2);
}

export function deserializeRecordedMatch(serialized: string): RecordedMatch {
  const parsed: unknown = JSON.parse(serialized);

  if (!isRecordedMatchShape(parsed)) {
    throw new Error("The imported file is not a supported completed replay.");
  }

  try {
    const mapDefinition = deserializeMapDefinition(serializeMapDefinition(parsed.mapDefinition));
    const recordedMatch = { ...parsed, mapDefinition };
    const timeline = createReplayTimeline(
      () => createGameStateFromMap(mapDefinition),
      recordedMatch.replay.actions,
    );

    if (
      timeline.finalState.winner !== recordedMatch.winner ||
      timeline.finalState.turn !== recordedMatch.turn
    ) {
      throw new Error("Replay outcome does not match its recorded summary.");
    }

    return recordedMatch;
  } catch {
    throw new Error("The imported file is not a supported completed replay.");
  }
}

function isRecordedMatchShape(value: unknown): value is RecordedMatch {
  if (!value || typeof value !== "object") return false;

  const replay = value as Partial<RecordedMatch>;
  return (
    replay.schemaVersion === RECORDED_MATCH_SCHEMA_VERSION &&
    typeof replay.id === "string" &&
    typeof replay.name === "string" &&
    typeof replay.savedAt === "string" &&
    (replay.winner === "blue" || replay.winner === "red") &&
    typeof replay.turn === "number" &&
    Boolean(replay.mapDefinition) &&
    Boolean(replay.matchConfiguration) &&
    Boolean(replay.replay) &&
    Array.isArray((replay.replay as ReplayRecord | undefined)?.actions)
  );
}
