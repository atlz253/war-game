import {
  deserializeMapDefinition,
  type MapDefinition,
  serializeMapDefinition,
} from "../maps/map-definition";

const builtInMapModules =
  import.meta.env?.BASE_URL !== undefined || typeof import.meta.glob === "function"
    ? (import.meta.glob("./maps/*.json", {
        eager: true,
        import: "default",
      }) as Record<string, unknown>)
    : {};

export function getBuiltInMaps(): readonly MapDefinition[] {
  return Object.values(builtInMapModules)
    .map((definition) =>
      deserializeMapDefinition(serializeMapDefinition(definition as MapDefinition)),
    )
    .sort((first, second) => first.id.localeCompare(second.id));
}

export function getBuiltInMap(id: string): MapDefinition | undefined {
  return getBuiltInMaps().find((map) => map.id === id);
}
