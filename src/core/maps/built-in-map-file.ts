import type { MapDefinition } from "./map-definition";

const MAP_ID_PREFIX = "map";
const MAP_FILE_EXTENSION = ".json";
const MAP_FILE_SEPARATOR = "--";
const UNNAMED_MAP_SLUG = "map";

export function createBuiltInMapId(createUuid: () => string = () => crypto.randomUUID()): string {
  return `${MAP_ID_PREFIX}-${createUuid()}`;
}

export function getBuiltInMapFileName(map: Pick<MapDefinition, "id" | "name">): string {
  return `${toMapFileSlug(map.name)}${MAP_FILE_SEPARATOR}${map.id}${MAP_FILE_EXTENSION}`;
}

function toMapFileSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || UNNAMED_MAP_SLUG;
}
