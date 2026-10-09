import type { GameAction } from "../../core/actions/game-actions";
import type { VictoryPolicy } from "../../core/campaigns/definition";
import { isVictoryPolicy } from "../../core/campaigns/definition";
import { createMissionState } from "../../core/campaigns/validation";
import {
  createGameStateFromMap,
  deserializeMapDefinition,
  type MapDefinition,
  serializeMapDefinition,
} from "../../core/maps/map-definition";
import type { SideId } from "../../core/model/game-state";
import type { ReplayRecord } from "../../core/replay/replay-actions";
import { createReplayTimeline } from "../../core/replay/replay-timeline";
import { type CampaignNarrative, validateNarrative } from "../campaigns/replay-narrative";
import type { MatchConfiguration } from "../match/match-configuration";

export const RECORDED_MATCH_SCHEMA_VERSION = 2;
const LEGACY_RECORDED_MATCH_SCHEMA_VERSION = 1;
export const LIVE_MATCH_REPLAY_SEED = 0;

export interface RecordedMatch {
  readonly victoryPolicy?: VictoryPolicy;
  readonly narrative?: CampaignNarrative;
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
  readonly narrative?: CampaignNarrative;
  readonly id: string;
  readonly name: string;
  readonly savedAt: string;
  readonly mapDefinition: MapDefinition;
  readonly matchConfiguration: MatchConfiguration;
  readonly actions: readonly GameAction[];
}

export function createRecordedMatch(options: CreateRecordedMatchOptions): RecordedMatch {
  const timeline = createReplayTimeline(
    () =>
      options.narrative
        ? createMissionState(options.narrative.mission, options.mapDefinition)
        : createGameStateFromMap(options.mapDefinition),
    options.actions,
  );
  const winner = timeline.finalState.winner;

  if (!winner) {
    throw new Error("A recorded match must have a winner.");
  }
  if (options.narrative) validateNarrative(options.narrative, timeline);

  return structuredClone({
    schemaVersion: RECORDED_MATCH_SCHEMA_VERSION,
    victoryPolicy: structuredClone(
      options.narrative?.mission.conditions ?? { type: "standard-match" },
    ),
    ...(options.narrative ? { narrative: structuredClone(options.narrative) } : {}),
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
  });
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
      () => recordedInitialState(recordedMatch),
      recordedMatch.replay.actions,
    );

    if (
      timeline.finalState.winner !== recordedMatch.winner ||
      timeline.finalState.turn !== recordedMatch.turn
    ) {
      throw new Error("Replay outcome does not match its recorded summary.");
    }
    if (recordedMatch.narrative) validateNarrative(recordedMatch.narrative, timeline);

    return recordedMatch;
  } catch {
    throw new Error("The imported file is not a supported completed replay.");
  }
}

function isRecordedMatchShape(value: unknown): value is RecordedMatch {
  if (!value || typeof value !== "object") return false;

  const replay = value as Partial<RecordedMatch>;
  return (
    (replay.schemaVersion === RECORDED_MATCH_SCHEMA_VERSION ||
      replay.schemaVersion === LEGACY_RECORDED_MATCH_SCHEMA_VERSION) &&
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

export function recordedInitialState(
  record: Pick<RecordedMatch, "schemaVersion" | "mapDefinition" | "victoryPolicy" | "narrative">,
) {
  if (record.schemaVersion === LEGACY_RECORDED_MATCH_SCHEMA_VERSION) {
    if (record.narrative || record.victoryPolicy) throw new Error("Unexpected legacy extension.");
    return createGameStateFromMap(record.mapDefinition);
  }
  if (!isVictoryPolicy(record.victoryPolicy)) throw new Error("Invalid victory policy.");
  if (!record.narrative) {
    if (record.victoryPolicy.type !== "standard-match")
      throw new Error("Missing mission snapshot.");
    return createGameStateFromMap(record.mapDefinition);
  }
  if (JSON.stringify(record.victoryPolicy) !== JSON.stringify(record.narrative.mission.conditions))
    throw new Error("Mismatched mission policy.");
  return createMissionState(record.narrative.mission, record.mapDefinition);
}
