export interface CanvasGameConfig {
  parent: string;
  width: number;
  height: number;
  pixelArt: boolean;
  roundPixels: boolean;
  scale: {
    mode: "FIT";
    autoCenter: "CENTER_BOTH";
  };
}

export const GAME_CANVAS_PARENT = "game";
export const GAME_CANVAS_WIDTH = 3840;
export const GAME_CANVAS_HEIGHT = 2160;

export function createGameConfig(): CanvasGameConfig {
  return {
    parent: GAME_CANVAS_PARENT,
    width: GAME_CANVAS_WIDTH,
    height: GAME_CANVAS_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: "FIT",
      autoCenter: "CENTER_BOTH",
    },
  };
}
