import type { PresentationViewport } from "./presentation-layout";

export interface EditorWorldViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function calculateEditorWorldViewport(
  presentationViewport: PresentationViewport,
  editorPanelWidth: number,
  bottomPanelHeight = 0,
): EditorWorldViewport {
  const panelWidth = editorPanelWidth * presentationViewport.scale;
  const paletteHeight = bottomPanelHeight * presentationViewport.scale;

  return {
    x: presentationViewport.x + panelWidth,
    y: presentationViewport.y,
    width: presentationViewport.width - panelWidth,
    height: presentationViewport.height - paletteHeight,
  };
}
