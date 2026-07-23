export function calculateWorldViewportWidth(
  canvasWidth: number,
  hudWidth: number,
  scale: number,
): number {
  return canvasWidth - hudWidth * scale;
}
