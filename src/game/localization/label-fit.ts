export function labelScale(
  textWidth: number,
  textHeight: number,
  width: number,
  height: number,
): number {
  if (!Number.isFinite(textWidth) || !Number.isFinite(textHeight)) return 1;
  return Math.min(1, width / Math.max(1, textWidth), height / Math.max(1, textHeight));
}
