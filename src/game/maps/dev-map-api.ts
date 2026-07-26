import {
  type MapDefinition,
  serializeMapDefinition,
  validateMapDefinition,
} from "../../core/maps/map-definition";

const DEV_MAP_ENDPOINT = "/__dev-maps";

export const isDevMapEditorAvailable = import.meta.env.DEV;

export async function saveBuiltInMap(map: MapDefinition): Promise<void> {
  const validation = validateMapDefinition(map);
  if (!validation.isValid) throw new Error(`Invalid map: ${validation.errors.join(", ")}`);

  const response = await fetch(DEV_MAP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serializeMapDefinition(map),
  });

  if (!response.ok) throw new Error("The development server rejected the built-in map.");
}

export async function deleteBuiltInMap(mapId: string): Promise<void> {
  const response = await fetch(`${DEV_MAP_ENDPOINT}?id=${encodeURIComponent(mapId)}`, {
    method: "DELETE",
  });

  if (!response.ok) throw new Error("The development server rejected the built-in map deletion.");
}
