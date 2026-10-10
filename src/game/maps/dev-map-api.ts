import {
  type MapDefinition,
  serializeMapDefinition,
  validateMapDefinition,
} from "../../core/maps/map-definition";
import { translateCoreReason } from "../localization/core-reasons";
import { t } from "../localization/runtime";

const DEV_MAP_ENDPOINT = "/__dev-maps";

export const isDevMapEditorAvailable = import.meta.env.DEV;

export async function saveBuiltInMap(map: MapDefinition): Promise<void> {
  const validation = validateMapDefinition(map);
  if (!validation.isValid)
    throw new Error(
      t("dev-map-api.invalid.map", {
        value1: String(validation.errors.map(translateCoreReason).join(", ")),
      }),
    );

  const response = await fetch(DEV_MAP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serializeMapDefinition(map),
  });

  if (!response.ok)
    throw new Error(t("dev-map-api.the.development.server.rejected.the.built.in.map"));
}

export async function deleteBuiltInMap(mapId: string): Promise<void> {
  const response = await fetch(`${DEV_MAP_ENDPOINT}?id=${encodeURIComponent(mapId)}`, {
    method: "DELETE",
  });

  if (!response.ok)
    throw new Error(t("dev-map-api.the.development.server.rejected.the.built.in.map.deletion"));
}
