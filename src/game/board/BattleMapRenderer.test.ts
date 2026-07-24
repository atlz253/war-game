import { describe, expect, it } from "vitest";

import type { GameState } from "../../core/model/game-state";
import { BattleMapRenderer } from "./BattleMapRenderer";

const BOARD_ORIGIN = 0;
const TILE_SIZE = 64;
const INITIAL_ZOOM = 1;
const TANK_ID = "blue-tank-1";
const ARTILLERY_ID = "blue-artillery-1";

interface FakeDisplayObject {
  readonly kind: "image" | "health-label" | "selection";
  parentContainer?: FakeContainer;
  destroy: () => void;
  setPosition: (x: number, y: number) => FakeDisplayObject;
  setTexture: (textureKey: string) => FakeDisplayObject;
}

interface FakeContainer extends FakeDisplayObject {
  add: (child: FakeDisplayObject | FakeDisplayObject[]) => FakeContainer;
  bringToTop: (child: FakeDisplayObject) => FakeContainer;
  setScale: (scale: number) => FakeContainer;
}

function createDisplayObject(kind: FakeDisplayObject["kind"]): FakeDisplayObject {
  const displayObject: FakeDisplayObject = {
    kind,
    destroy: () => undefined,
    setPosition: () => displayObject,
    setTexture: () => displayObject,
  };
  return displayObject;
}

function createWorldContainer(): FakeContainer & { readonly list: FakeDisplayObject[] } {
  const list: FakeDisplayObject[] = [];
  const container: FakeContainer & { readonly list: FakeDisplayObject[] } = {
    kind: "health-label",
    list,
    add: (child: FakeDisplayObject | FakeDisplayObject[]) => {
      for (const item of Array.isArray(child) ? child : [child]) {
        item.parentContainer = container;
        list.push(item);
      }
      return container;
    },
    bringToTop: (child: FakeDisplayObject) => {
      const index = list.indexOf(child);
      if (index >= 0) list.splice(index, 1);
      list.push(child);
      return container;
    },
    destroy: () => undefined,
    setPosition: () => container,
    setScale: () => container,
    setTexture: () => container,
  };
  return container;
}

function createScene() {
  return {
    add: {
      image: () => createDisplayObject("image"),
      text: () => {
        const text = {
          ...createDisplayObject("health-label"),
          width: 20,
          height: 20,
          setOrigin: () => text,
          setText: () => text,
        };
        return text;
      },
      rectangle: () => {
        const rectangle = {
          ...createDisplayObject("health-label"),
          setSize: () => rectangle,
          setStrokeStyle: () => rectangle,
        };
        return rectangle;
      },
      container: () => createWorldContainer(),
    },
    textures: { exists: () => true },
  } as unknown as Phaser.Scene;
}

const STATE = {
  units: {
    [TANK_ID]: {
      id: TANK_ID,
      side: "blue",
      type: "tank",
      health: 16,
      position: { x: 2, y: 1 },
    },
    [ARTILLERY_ID]: {
      id: ARTILLERY_ID,
      side: "blue",
      type: "artillery",
      health: 8,
      position: { x: 2, y: 0 },
    },
  },
  controlPoints: {},
} as unknown as GameState;

describe("BattleMapRenderer", () => {
  it("renders every health label above all unit sprites", () => {
    const worldContainer = createWorldContainer();
    const renderer = new BattleMapRenderer(createScene(), worldContainer as never, {
      boardOriginX: BOARD_ORIGIN,
      boardOriginY: BOARD_ORIGIN,
      tileSize: TILE_SIZE,
      initialZoom: INITIAL_ZOOM,
    });

    renderer.renderState(STATE);

    expect(worldContainer.list.map((object) => object.kind)).toEqual([
      "image",
      "image",
      "health-label",
      "health-label",
    ]);
  });

  it("restores health labels above a selection added after the units", () => {
    const worldContainer = createWorldContainer();
    const renderer = new BattleMapRenderer(createScene(), worldContainer as never, {
      boardOriginX: BOARD_ORIGIN,
      boardOriginY: BOARD_ORIGIN,
      tileSize: TILE_SIZE,
      initialZoom: INITIAL_ZOOM,
    });

    renderer.renderState(STATE);
    worldContainer.add(createDisplayObject("selection"));
    renderer.bringHealthLabelsToFront();

    expect(worldContainer.list.map((object) => object.kind)).toEqual([
      "image",
      "image",
      "selection",
      "health-label",
      "health-label",
    ]);
  });
});
