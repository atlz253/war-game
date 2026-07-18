import { GAME_CANVAS_HEIGHT, GAME_CANVAS_WIDTH } from "./game-config";

const WIDE_VIEWPORT_RATIO = GAME_CANVAS_WIDTH / GAME_CANVAS_HEIGHT;
const TALL_VIEWPORT_RATIO = GAME_CANVAS_HEIGHT / GAME_CANVAS_WIDTH;
const HALF_DIMENSION = 2;

export interface PresentationViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

export function calculatePresentationViewport(
  canvasWidth: number,
  canvasHeight: number,
): PresentationViewport {
  return canvasWidth / canvasHeight >= WIDE_VIEWPORT_RATIO
    ? createWideViewport(canvasWidth, canvasHeight)
    : createTallViewport(canvasWidth, canvasHeight);
}

function createWideViewport(canvasWidth: number, canvasHeight: number): PresentationViewport {
  const width = Math.round(canvasHeight * WIDE_VIEWPORT_RATIO);

  return {
    x: Math.floor((canvasWidth - width) / HALF_DIMENSION),
    y: 0,
    width,
    height: canvasHeight,
    scale: canvasHeight / GAME_CANVAS_HEIGHT,
  };
}

function createTallViewport(canvasWidth: number, canvasHeight: number): PresentationViewport {
  const height = Math.round(canvasWidth * TALL_VIEWPORT_RATIO);

  return {
    x: 0,
    y: Math.floor((canvasHeight - height) / HALF_DIMENSION),
    width: canvasWidth,
    height,
    scale: canvasWidth / GAME_CANVAS_WIDTH,
  };
}
