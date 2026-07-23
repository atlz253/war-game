export interface EditorPanelScrollOptions {
  readonly currentOffset: number;
  readonly wheelDeltaY: number;
  readonly contentHeight: number;
  readonly viewportHeight: number;
}

export function calculateEditorPanelScroll({
  currentOffset,
  wheelDeltaY,
  contentHeight,
  viewportHeight,
}: EditorPanelScrollOptions): number {
  const maximumOffset = Math.max(contentHeight - viewportHeight, 0);
  return Math.min(Math.max(currentOffset + wheelDeltaY, 0), maximumOffset);
}
