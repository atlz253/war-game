import type Phaser from "phaser";

import { assetManifest } from "../assets/asset-manifest";

const CENTER_DIVISOR = 2;
const BACKGROUND_TILE_SCALE = 2;
export const WORLD_BACKGROUND_BRIGHTNESS_TINT = 0x222222;

export interface WorldBackgroundBoundsOptions {
  readonly boardLeft: number;
  readonly boardTop: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
}

export interface WorldBackgroundBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorldBackgroundOptions {
  readonly boardLeft: number;
  readonly boardTop: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
}

export class WorldBackground {
  private readonly tiles: Phaser.GameObjects.Image[] = [];
  private renderedTileBounds: TileBounds | null = null;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly container: Phaser.GameObjects.Container,
    private readonly options: WorldBackgroundOptions,
  ) {
    this.refresh();
  }

  public refresh(): void {
    const bounds = this.getTileBounds();
    if (areTileBoundsEqual(this.renderedTileBounds, bounds)) return;

    for (const tile of this.tiles) tile.destroy();
    this.tiles.length = 0;
    this.renderedTileBounds = bounds;

    const { textureKey, tileWidth, tileHeight } = assetManifest.terrain.background;
    const tileStep = calculateBackgroundTileStep(tileWidth, tileHeight);
    for (let y = bounds.top; y < bounds.bottom; y += tileStep.height) {
      for (let x = bounds.left; x < bounds.right; x += tileStep.width) {
        const tile = this.scene.add
          .image(x, y, textureKey)
          .setOrigin(0)
          .setScale(BACKGROUND_TILE_SCALE)
          .setTint(WORLD_BACKGROUND_BRIGHTNESS_TINT);
        this.container.add(tile);
        this.container.sendToBack(tile);
        this.tiles.push(tile);
      }
    }
  }

  private getTileBounds(): TileBounds {
    const camera = this.scene.cameras.main;
    const bounds = calculateWorldBackgroundBounds({
      ...this.options,
      visibleWidth: camera.width / camera.zoom,
      visibleHeight: camera.height / camera.zoom,
    });
    const tileStep = calculateBackgroundTileStep(
      assetManifest.terrain.background.tileWidth,
      assetManifest.terrain.background.tileHeight,
    );
    const left = bounds.x - bounds.width / CENTER_DIVISOR;
    const top = bounds.y - bounds.height / CENTER_DIVISOR;

    return {
      left: Math.floor(left / tileStep.width) * tileStep.width,
      top: Math.floor(top / tileStep.height) * tileStep.height,
      right: Math.ceil((left + bounds.width) / tileStep.width) * tileStep.width,
      bottom: Math.ceil((top + bounds.height) / tileStep.height) * tileStep.height,
    };
  }
}

interface TileBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function calculateBackgroundTileStep(
  tileWidth: number,
  tileHeight: number,
): { width: number; height: number } {
  return {
    width: tileWidth * BACKGROUND_TILE_SCALE,
    height: tileHeight * BACKGROUND_TILE_SCALE,
  };
}

export function calculateWorldBackgroundBounds({
  boardLeft,
  boardTop,
  boardWidth,
  boardHeight,
  visibleWidth,
  visibleHeight,
}: WorldBackgroundBoundsOptions): WorldBackgroundBounds {
  const width = Math.max(boardWidth, visibleWidth);
  const height = Math.max(boardHeight, visibleHeight);

  return {
    x: boardLeft + boardWidth / CENTER_DIVISOR,
    y: boardTop + boardHeight / CENTER_DIVISOR,
    width,
    height,
  };
}

function areTileBoundsEqual(previous: TileBounds | null, next: TileBounds): boolean {
  return (
    previous?.left === next.left &&
    previous.top === next.top &&
    previous.right === next.right &&
    previous.bottom === next.bottom
  );
}
