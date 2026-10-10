import { localeKey, t } from "./runtime";

const messages: Readonly<Record<string, string>> = {
  "unsupported format": localeKey("reason.unsupportedFormat"),
  "at least one mission required": localeKey("reason.missionRequired"),
  "missing or invalid map": localeKey("reason.invalidMap"),
  "both sides required": localeKey("reason.bothSides"),
  "unreachable objective": localeKey("reason.unreachable"),
  "empty or duplicate": localeKey("reason.emptyDuplicate"),
  "dialogue is empty": localeKey("reason.emptyDialogue"),
  "speaker and text required": localeKey("reason.dialogueFields"),
  "positive integer required": localeKey("reason.positiveInteger"),
  required: localeKey("reason.required"),
  "missing or ineligible unit": localeKey("reason.invalidUnit"),
  "cell out of bounds": localeKey("reason.outOfBounds"),
  "Unsupported campaign format.": localeKey("reason.unsupportedCampaign"),
};
const mapCodes: Readonly<Record<string, string>> = {
  "invalid-map-id": localeKey("reason.invalidMapId"),
  "invalid-map-name": localeKey("reason.invalidMapName"),
  "invalid-board-size": localeKey("reason.invalidBoardSize"),
  "invalid-terrain-type": localeKey("reason.invalidTerrain"),
  "terrain-out-of-bounds": localeKey("reason.terrainBounds"),
  "duplicate-terrain-position": localeKey("reason.terrainDuplicate"),
  "unit-out-of-bounds": localeKey("reason.unitBounds"),
  "duplicate-unit-position": localeKey("reason.unitDuplicate"),
  "control-point-out-of-bounds": localeKey("reason.pointBounds"),
  "duplicate-control-point-position": localeKey("reason.pointDuplicate"),
  "mountain-control-point-conflict": localeKey("reason.pointMountain"),
  "tank-on-mountain": localeKey("reason.tankMountain"),
  "artillery-on-mountain": localeKey("reason.artilleryMountain"),
};
export function translateCoreReason(reason: string): string {
  if (mapCodes[reason]) return t(mapCodes[reason]);
  if (messages[reason]) return t(messages[reason]);
  const separator = reason.indexOf(": ");
  if (separator < 0) return reason;
  const detail = reason.slice(separator + ": ".length);
  const translated = detail.startsWith("explicitly rebind to ")
    ? t("reason.rebind", { map: detail.slice("explicitly rebind to ".length) })
    : messages[detail]
      ? t(messages[detail])
      : detail;
  return t("reason.withPath", { path: reason.slice(0, separator), reason: translated });
}
