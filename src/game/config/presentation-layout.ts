import { GAME_CANVAS_HEIGHT, GAME_CANVAS_WIDTH } from "./game-config";

export interface PresentationViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly contentX: number;
  readonly contentY: number;
}

export function calculatePresentationViewport(
  canvasWidth: number,
  canvasHeight: number,
): PresentationViewport {
  const scale = Math.min(canvasWidth / GAME_CANVAS_WIDTH, canvasHeight / GAME_CANVAS_HEIGHT);

  return {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
    scale,
    contentX: Math.round((canvasWidth - GAME_CANVAS_WIDTH * scale) / 2),
    contentY: Math.round((canvasHeight - GAME_CANVAS_HEIGHT * scale) / 2),
  };
}

export function calculateRightAlignedContentX(
  viewport: PresentationViewport,
  contentRightEdge: number,
): number {
  return viewport.width - contentRightEdge * viewport.scale;
}
