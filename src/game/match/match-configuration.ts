import type { Agent } from "../../ai/agents/Agent";
import { HeuristicAgent } from "../../ai/agents/HeuristicAgent";
import type { SideId } from "../../core/model/game-state";

export type ParticipantKind = "human" | "heuristic-ai";

export interface MatchConfiguration {
  readonly blue: ParticipantKind;
  readonly red: ParticipantKind;
}

const DEFAULT_MATCH_CONFIGURATION: MatchConfiguration = {
  blue: "human",
  red: "heuristic-ai",
};

const PARTICIPANT_LABELS: Readonly<Record<ParticipantKind, string>> = {
  human: "HUMAN",
  "heuristic-ai": "HEURISTIC AI",
};

const NEXT_PARTICIPANT: Readonly<Record<ParticipantKind, ParticipantKind>> = {
  human: "heuristic-ai",
  "heuristic-ai": "human",
};

export function createDefaultMatchConfiguration(): MatchConfiguration {
  return { ...DEFAULT_MATCH_CONFIGURATION };
}

export function toggleParticipant(
  configuration: MatchConfiguration,
  side: SideId,
): MatchConfiguration {
  return { ...configuration, [side]: NEXT_PARTICIPANT[configuration[side]] };
}

export function createAgentForParticipant(participant: ParticipantKind): Agent | null {
  return participant === "heuristic-ai" ? new HeuristicAgent() : null;
}

export function isHumanTurn(configuration: MatchConfiguration, side: SideId): boolean {
  return configuration[side] === "human";
}

export function getParticipantLabel(participant: ParticipantKind): string {
  return PARTICIPANT_LABELS[participant];
}
