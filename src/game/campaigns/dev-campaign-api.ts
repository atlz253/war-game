import {
  type CampaignDefinition,
  deserializeCampaign,
  serializeCampaign,
} from "../../core/campaigns/definition";

export function isDevCampaignEditorAvailable(): boolean {
  return import.meta.env.DEV;
}
export async function saveBuiltInCampaign(campaign: CampaignDefinition): Promise<void> {
  if (!isDevCampaignEditorAvailable()) throw new Error("Built-in editing requires DEV mode.");
  const serialized = serializeCampaign(deserializeCampaign(serializeCampaign(campaign)));
  const response = await fetch("/__dev-campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serialized,
  });
  if (!response.ok) throw new Error("The development server rejected the built-in campaign.");
}
