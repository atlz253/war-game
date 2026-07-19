import type { SideId, TeamScores } from "../model/game-state";

export type ScoreReason = "attack" | "capture";

export const CAPTURE_SCORE = 5;

const ZERO_SCORE = 0;

export function createInitialTeamScores(): TeamScores {
  return { blue: ZERO_SCORE, red: ZERO_SCORE };
}

export function calculateAttackScore(targetHealth: number, damage: number): number {
  return Math.min(targetHealth, damage);
}

export function addTeamScore(scores: TeamScores, side: SideId, points: number): TeamScores {
  return { ...scores, [side]: scores[side] + points };
}

export function calculateScoreDelta(previous: TeamScores, next: TeamScores): TeamScores {
  return { blue: next.blue - previous.blue, red: next.red - previous.red };
}
