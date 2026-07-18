import type { Agent } from "../../ai/agents/Agent";
import { HeuristicAgent } from "../../ai/agents/HeuristicAgent";
import { LmStudioAgent } from "../../ai/agents/LmStudioAgent";
import type { SideId } from "../../core/model/game-state";
import {
  createDefaultLmStudioSettings,
  createLmStudioConnection,
  type LmStudioSettings,
} from "../lm-studio/lm-studio-settings";

export type ParticipantKind = "human" | "heuristic-ai" | "lm-studio-ai";

export interface MatchConfiguration {
  readonly blue: ParticipantKind;
  readonly red: ParticipantKind;
  readonly lmStudioConnections: Readonly<Record<SideId, LmStudioSettingsConnection>>;
}

type LmStudioSettingsConnection = Readonly<{ baseUrl: string; modelId: string }>;

const DEFAULT_MATCH_CONFIGURATION: MatchConfiguration = {
  blue: "human",
  red: "heuristic-ai",
  lmStudioConnections: {
    blue: { baseUrl: "", modelId: "" },
    red: { baseUrl: "", modelId: "" },
  },
};

const PARTICIPANT_LABELS: Readonly<Record<ParticipantKind, string>> = {
  human: "HUMAN",
  "heuristic-ai": "HEURISTIC AI",
  "lm-studio-ai": "LM STUDIO AI",
};

const NEXT_PARTICIPANT: Readonly<Record<ParticipantKind, ParticipantKind>> = {
  human: "heuristic-ai",
  "heuristic-ai": "lm-studio-ai",
  "lm-studio-ai": "human",
};

export function createDefaultMatchConfiguration(
  settings = createDefaultLmStudioSettings(),
): MatchConfiguration {
  return withLmStudioSettings(DEFAULT_MATCH_CONFIGURATION, settings);
}

export function withLmStudioSettings(
  configuration: MatchConfiguration,
  settings: LmStudioSettings,
): MatchConfiguration {
  return {
    ...configuration,
    lmStudioConnections: {
      blue: createLmStudioConnection(settings, "blue"),
      red: createLmStudioConnection(settings, "red"),
    },
  };
}

export function toggleParticipant(
  configuration: MatchConfiguration,
  side: SideId,
): MatchConfiguration {
  return { ...configuration, [side]: NEXT_PARTICIPANT[configuration[side]] };
}

export function createAgentForParticipant(
  participant: ParticipantKind,
  lmStudioConnection?: LmStudioSettingsConnection,
): Agent | null {
  if (participant === "heuristic-ai") return new HeuristicAgent();
  if (participant === "lm-studio-ai" && lmStudioConnection)
    return new LmStudioAgent(lmStudioConnection);
  return null;
}

export function isHumanTurn(configuration: MatchConfiguration, side: SideId): boolean {
  return configuration[side] === "human";
}

export function getParticipantLabel(participant: ParticipantKind): string {
  return PARTICIPANT_LABELS[participant];
}
