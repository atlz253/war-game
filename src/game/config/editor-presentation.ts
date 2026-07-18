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
): EditorWorldViewport {
  const panelWidth = editorPanelWidth * presentationViewport.scale;

  return {
    x: presentationViewport.x + panelWidth,
    y: presentationViewport.y,
    width: presentationViewport.width - panelWidth,
    height: presentationViewport.height,
  };
}
