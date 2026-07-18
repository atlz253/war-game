const BASE_SCREEN_SCALE = 1;

export function formatUnitHealthLabel(health: number): string {
  return `${health}`;
}

export function calculateUnitHealthLabelY(
  unitCenterY: number,
  tileSize: number,
  labelGap: number,
): number {
  return unitCenterY - tileSize / 2 - labelGap;
}

export function calculateUnitHealthLabelScale(cameraZoom: number): number {
  return BASE_SCREEN_SCALE / cameraZoom;
}
