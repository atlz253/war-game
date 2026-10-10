import type { MapDefinition } from "../../core/maps/map-definition";
import { getBuiltInMaps } from "../../core/scenarios/built-in-maps";
import { t } from "../localization/runtime";
import { type BrowserMapLibrary, getBrowserMapLibrary } from "./map-library";

export type MapSource = "built-in" | "local";

export interface CatalogMap {
  readonly source: MapSource;
  readonly map: MapDefinition;
}

export class MapCatalog {
  public constructor(
    private readonly localMaps: Pick<BrowserMapLibrary, "list">,
    private readonly builtInMaps: () => readonly MapDefinition[] = getBuiltInMaps,
  ) {}

  public list(): readonly CatalogMap[] {
    return [
      ...this.builtInMaps().map((map) => ({ source: "built-in" as const, map })),
      ...this.localMaps.list().map((map) => ({ source: "local" as const, map })),
    ];
  }

  public get(source: MapSource, id: string): CatalogMap | undefined {
    return this.list().find((entry) => entry.source === source && entry.map.id === id);
  }

  public isNameAvailable(source: MapSource, id: string, name: string): boolean {
    const normalizedName = name.trim();
    return (
      normalizedName.length > 0 &&
      !this.list().some(
        (entry) =>
          entry.source === source && entry.map.id !== id && entry.map.name === normalizedName,
      )
    );
  }
}

export function getBrowserMapCatalog(): MapCatalog {
  return new MapCatalog(getBrowserMapLibrary());
}

export function formatCatalogMap(entry: CatalogMap): string {
  return `${entry.map.name} [${entry.source === "built-in" ? t("map-catalog.built.in") : t("map-catalog.local")}]`;
}
