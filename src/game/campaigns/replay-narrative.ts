import {
  isMissionDefinition,
  isNarrativeLocaleId,
  type MissionDefinition,
  normalizeMission,
} from "../../core/campaigns/definition";
import {
  actionSignals,
  type DialogueOccurrence,
  emptyJournal,
  initialSignals,
  type MissionSignal,
  matchSignal,
  selectionSignal,
} from "../../core/campaigns/signals";
import type { ReplayTimeline } from "../../core/replay/replay-timeline";
import { t } from "../localization/runtime";
export interface CampaignNarrative {
  readonly localeId?: string;
  readonly campaignId: string;
  readonly campaignName: string;
  readonly mission: MissionDefinition;
  readonly occurrences: readonly DialogueOccurrence[];
}
export function normalizeNarrative(
  narrative: CampaignNarrative,
  legacy = false,
): CampaignNarrative {
  return {
    ...structuredClone(narrative),
    localeId: legacy ? "en" : (narrative.localeId ?? "en"),
    mission: normalizeMission(narrative.mission),
  };
}
export function validateNarrative(narrative: CampaignNarrative, timeline: ReplayTimeline): void {
  checkSnapshot(narrative);
  validateJournal(narrative, timeline);
}
function checkSnapshot(narrative: CampaignNarrative): void {
  if (
    !isMissionDefinition(narrative.mission) ||
    typeof narrative.campaignId !== "string" ||
    typeof narrative.campaignName !== "string" ||
    !Array.isArray(narrative.occurrences) ||
    (narrative.localeId !== undefined && !isNarrativeLocaleId(narrative.localeId))
  )
    throw new Error(t("replay-narrative.invalid.narrative.snapshot"));
}
function validateJournal(narrative: CampaignNarrative, timeline: ReplayTimeline): void {
  let journal = emptyJournal();
  const mission = narrative.mission;
  const initial = timeline.frames[0];
  if (!initial) throw new Error(t("replay-narrative.missing.initial.frame"));
  for (const signal of initialSignals(initial.state))
    journal = matchSignal(mission, journal, signal, 0);
  for (const [boundary, frame] of timeline.frames.entries()) {
    if (boundary)
      for (const signal of actionSignals({
        accepted: true,
        state: frame.state,
        events: frame.events,
      }))
        journal = matchSignal(mission, journal, signal, boundary);
    const signals = selectionSignalsAt(narrative, boundary);
    for (const signal of signals) {
      if (
        signal.type !== "unit-selected" ||
        !selectionSignal(frame.state, null, signal.unitId, false)
      )
        throw new Error(t("replay-narrative.invalid.recorded.selection"));
      journal = matchSignal(mission, journal, signal, boundary);
    }
  }
  if (JSON.stringify(journal.occurrences) !== JSON.stringify(narrative.occurrences))
    throw new Error(t("replay-narrative.narrative.journal.does.not.match.replay.frames"));
}
function selectionSignalsAt(narrative: CampaignNarrative, boundary: number): MissionSignal[] {
  const result: MissionSignal[] = [];
  let previous = "";
  for (const occurrence of narrative.occurrences) {
    if (occurrence.afterActionCount !== boundary || occurrence.signal?.type !== "unit-selected")
      continue;
    const key = JSON.stringify(occurrence.signal);
    if (key !== previous) result.push(occurrence.signal);
    previous = key;
  }
  return result;
}
