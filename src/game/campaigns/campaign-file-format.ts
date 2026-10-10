import {
  type CampaignDefinition,
  deserializeCampaign,
  serializeCampaign,
} from "../../core/campaigns/definition";
export const CAMPAIGN_FILE_EXTENSION = ".ai-war-campaign.json";
export function exportCampaignDefinition(campaign: CampaignDefinition): string {
  const { schemaVersion, id, name, missions } = deserializeCampaign(serializeCampaign(campaign));
  return serializeCampaign({ schemaVersion, id, name, missions });
}
