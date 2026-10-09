import {
  type CampaignDefinition,
  deserializeCampaign,
  isRecord,
} from "../../core/campaigns/definition";
import type { StorageLike } from "../maps/map-library";

const STORAGE_KEY = "ai-war-game.campaigns.v1";
const LIBRARY_VERSION = 1;
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
        throw new Error("Unsupported campaign library.");
      const campaigns = envelope.campaigns.map((value) =>
        deserializeCampaign(JSON.stringify(value)),
      );
      if (new Set(campaigns.map((item) => item.id)).size !== campaigns.length)
        throw new Error("Duplicate campaign identities.");
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
  return error instanceof Error ? error.message : String(error);
}
