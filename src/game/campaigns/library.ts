import {
  type CampaignDefinition,
  deserializeCampaign,
  isRecord,
} from "../../core/campaigns/definition";
import { translateCoreReason } from "../localization/core-reasons";
import { t } from "../localization/runtime";
import type { StorageLike } from "../maps/map-library";
import { exportCampaignDefinition } from "./campaign-file-format";

const STORAGE_KEY = "ai-war-game.campaigns.v1";
const LIBRARY_VERSION = 1;
const FIRST_COLLISION_SUFFIX = 2;
export interface LibraryResult<T> {
  readonly value: T;
  readonly error: string | null;
}
export class BrowserCampaignLibrary {
  public constructor(private readonly storage: StorageLike) {}
  public list(): LibraryResult<readonly CampaignDefinition[]> {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return { value: [], error: null };
      const envelope: unknown = JSON.parse(raw);
      if (
        !isRecord(envelope) ||
        envelope.schemaVersion !== LIBRARY_VERSION ||
        !Array.isArray(envelope.campaigns)
      )
        throw new Error(t("library.unsupported.campaign.library"));
      const campaigns = envelope.campaigns.map((value) =>
        deserializeCampaign(JSON.stringify(value)),
      );
      if (new Set(campaigns.map((item) => item.id)).size !== campaigns.length)
        throw new Error(t("library.duplicate.campaign.identities"));
      return { value: campaigns, error: null };
    } catch (error) {
      return { value: [], error: errorMessage(error) };
    }
  }
  public save(campaign: CampaignDefinition): LibraryResult<boolean> {
    return this.update((items) => [
      ...items.filter((item) => item.id !== campaign.id),
      deserializeCampaign(JSON.stringify(campaign)),
    ]);
  }
  public delete(id: string): LibraryResult<boolean> {
    return this.update((items) => items.filter((item) => item.id !== id));
  }
  public import(
    serialized: string,
    builtInIds: readonly string[] = [],
  ): LibraryResult<CampaignDefinition | null> {
    const loaded = this.list();
    if (loaded.error) return { value: null, error: loaded.error };
    try {
      const campaign = deserializeCampaign(serialized);
      const ids = new Set([...builtInIds, ...loaded.value.map((item) => item.id)]);
      let id = campaign.id;
      let suffix = FIRST_COLLISION_SUFFIX;
      while (ids.has(id)) id = `${campaign.id}-${suffix++}`;
      const imported = { ...campaign, id };
      const saved = this.save(imported);
      return { value: saved.value ? imported : null, error: saved.error };
    } catch (error) {
      return { value: null, error: errorMessage(error) };
    }
  }
  public export(id: string): LibraryResult<string | null> {
    const loaded = this.list();
    if (loaded.error) return { value: null, error: loaded.error };
    const campaign = loaded.value.find((item) => item.id === id);
    return campaign
      ? { value: exportCampaignDefinition(campaign), error: null }
      : { value: null, error: t("library.campaign.does.not.exist", { value1: String(id) }) };
  }
  private update(
    transform: (items: readonly CampaignDefinition[]) => readonly CampaignDefinition[],
  ): LibraryResult<boolean> {
    const loaded = this.list();
    if (loaded.error) return { value: false, error: loaded.error };
    try {
      const campaigns = transform(loaded.value);
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ schemaVersion: LIBRARY_VERSION, campaigns }),
      );
      return { value: true, error: null };
    } catch (error) {
      return { value: false, error: errorMessage(error) };
    }
  }
}
export function browserCampaignLibrary(): BrowserCampaignLibrary {
  return new BrowserCampaignLibrary({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  });
}
function errorMessage(error: unknown): string {
  return translateCoreReason(error instanceof Error ? error.message : String(error));
}
