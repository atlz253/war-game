export interface CanvasGameConfig {
  parent: string;
  width: number;
  height: number;
  pixelArt: boolean;
  roundPixels: boolean;
  backgroundColor: number;
  scale: {
    mode: "RESIZE";
  };
}

export const GAME_CANVAS_PARENT = "game";
export const GAME_CANVAS_WIDTH = 3840;
export const GAME_CANVAS_HEIGHT = 2160;
export const GAME_CANVAS_BACKGROUND_COLOR = 0x000000;

export function createGameConfig(): CanvasGameConfig {
  return {
    parent: GAME_CANVAS_PARENT,
    width: GAME_CANVAS_WIDTH,
    height: GAME_CANVAS_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: GAME_CANVAS_BACKGROUND_COLOR,
    scale: {
      mode: "RESIZE",
    },
  };
}
