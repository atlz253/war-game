import { type CampaignDefinition, deserializeCampaign } from "./definition";

const modules =
  import.meta.env?.BASE_URL !== undefined || typeof import.meta.glob === "function"
    ? (import.meta.glob("./definitions/*.json", { eager: true, import: "default" }) as Record<
        string,
        unknown
      >)
    : {};

export function readBuiltInCampaignModules(source: Record<string, unknown>): CampaignDefinition[] {
  const ids = new Set<string>();
  const campaigns = Object.entries(source).map(([file, value]) => {
    try {
      const campaign = deserializeCampaign(JSON.stringify(value));
      if (ids.has(campaign.id)) throw new Error(`Duplicate campaign ID: ${campaign.id}`);
      ids.add(campaign.id);
      return campaign;
    } catch (error) {
      throw new Error(`${file}: ${error instanceof Error ? error.message : "Invalid campaign"}`);
    }
  });
  return campaigns.sort((first, second) => first.id.localeCompare(second.id));
}
export function getBuiltInCampaigns(): CampaignDefinition[] {
  return readBuiltInCampaignModules(modules);
}
