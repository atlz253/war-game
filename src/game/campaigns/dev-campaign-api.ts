import {
  type CampaignDefinition,
  deserializeCampaign,
  serializeCampaign,
} from "../../core/campaigns/definition";
import { t } from "../localization/runtime";

export function isDevCampaignEditorAvailable(): boolean {
  return import.meta.env.DEV;
}
export async function saveBuiltInCampaign(campaign: CampaignDefinition): Promise<void> {
  if (!isDevCampaignEditorAvailable())
    throw new Error(t("dev-campaign-api.built.in.editing.requires.dev.mode"));
  const serialized = serializeCampaign(deserializeCampaign(serializeCampaign(campaign)));
  const response = await fetch("/__dev-campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serialized,
  });
  if (!response.ok)
    throw new Error(t("dev-campaign-api.the.development.server.rejected.the.built.in.campaign"));
}
