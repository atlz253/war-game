import type { CampaignDefinition } from "../../core/campaigns/definition";
import { createMissionState, validateCampaignReadiness } from "../../core/campaigns/validation";
import type { MapDefinition } from "../../core/maps/map-definition";
import type { SideId } from "../../core/model/game-state";
import {
  createDefaultMatchConfiguration,
  type MatchConfiguration,
} from "../match/match-configuration";
export interface CampaignRun {
  readonly campaign: CampaignDefinition;
  readonly maps: readonly MapDefinition[];
  readonly participants: MatchConfiguration;
  readonly index: number;
  readonly complete: boolean;
}
export function startRun(
  campaign: CampaignDefinition,
  maps: readonly MapDefinition[],
): CampaignRun {
  const errors = validateCampaignReadiness(campaign, maps);
  if (errors.length) throw new Error(errors.join("; "));
  return structuredClone({
    campaign,
    maps: campaign.missions.map((mission) => {
      const map = maps.find((item) => item.id === mission.builtInMapId);
      if (!map) throw new Error("Mission map missing.");
      return map;
    }),
    participants: createDefaultMatchConfiguration(),
    index: 0,
    complete: false,
  });
}
export function advanceRun(run: CampaignRun, winner: SideId): CampaignRun {
  if (run.complete || winner === "red") return run;
  const complete = run.index + 1 >= run.campaign.missions.length;
  return { ...run, index: complete ? run.index : run.index + 1, complete };
}
export function launchMission(campaignRun: CampaignRun) {
  const mission = campaignRun.campaign.missions[campaignRun.index];
  const mapDefinition = campaignRun.maps[campaignRun.index];
  if (!mission || !mapDefinition || campaignRun.complete) throw new Error("No mission to launch.");
  return {
    campaignRun,
    mapDefinition,
    initialState: createMissionState(mission, mapDefinition),
    matchConfiguration: campaignRun.participants,
  };
}
