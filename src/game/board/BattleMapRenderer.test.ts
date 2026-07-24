import { describe, expect, it } from "vitest";

import type { GameState } from "../../core/model/game-state";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { BattleMapRenderer } from "./BattleMapRenderer";

const BOARD_ORIGIN = 0;
const TILE_SIZE = 64;
const INITIAL_ZOOM = 1;
const TANK_ID = "blue-tank-1";
const ARTILLERY_ID = "blue-artillery-1";
const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";
const MUTED_UNIT_TINT = 0x8d8d8d;
const ARTILLERY_UNIT_INDEX = 4;

interface FakeDisplayObject {
  readonly kind: "image" | "health-label" | "selection";
  parentContainer?: FakeContainer;
  tint?: number;
  destroy: () => void;
  clearTint: () => FakeDisplayObject;
  setPosition: (x: number, y: number) => FakeDisplayObject;
  setTexture: (textureKey: string) => FakeDisplayObject;
  setTint: (color: number) => FakeDisplayObject;
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
    clearTint: () => {
      displayObject.tint = undefined;
      return displayObject;
    },
    setPosition: () => displayObject,
    setTexture: () => displayObject,
    setTint: (color: number) => {
      displayObject.tint = color;
      return displayObject;
    },
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
    clearTint: () => container,
    setPosition: () => container,
    setScale: () => container,
    setTexture: () => container,
    setTint: () => container,
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

  it("keeps moved enemies at their normal tint", () => {
    const state = withUnit(createSkirmishGameState(), BLUE_INFANTRY_ID, {
      hasMovedThisTurn: true,
      side: "blue",
    });
    const enemyTurnState = { ...state, activeSide: "red" as const };

    expect(renderFirstUnitTint(enemyTurnState)).toBeUndefined();
  });

  it("keeps a moved unit at its normal tint while it can attack or capture", () => {
    const attackState = withUnits(createSkirmishGameState(), {
      [BLUE_INFANTRY_ID]: { hasMovedThisTurn: true, position: { x: 1, y: 1 } },
      [RED_INFANTRY_ID]: { position: { x: 2, y: 1 } },
    });
    const captureState = withUnit(createSkirmishGameState(), BLUE_INFANTRY_ID, {
      hasMovedThisTurn: true,
      position: { x: 5, y: 3 },
    });

    expect(renderFirstUnitTint(attackState)).toBeUndefined();
    expect(renderFirstUnitTint(captureState)).toBeUndefined();
  });

  it("mutes an active unit without a remaining main action, including artillery after attacking", () => {
    const movedWithoutActionState = withUnit(createSkirmishGameState(), BLUE_INFANTRY_ID, {
      hasMovedThisTurn: true,
    });
    const artilleryAttackState = withUnit(createSkirmishGameState(), ARTILLERY_ID, {
      hasTakenMainAction: true,
    });

    expect(renderFirstUnitTint(movedWithoutActionState)).toBe(MUTED_UNIT_TINT);
    expect(renderUnitTint(artilleryAttackState, ARTILLERY_UNIT_INDEX)).toBe(MUTED_UNIT_TINT);
  });
});

function withUnit(
  state: GameState,
  unitId: string,
  changes: Partial<GameState["units"][string]>,
): GameState {
  return withUnits(state, { [unitId]: changes });
}

function withUnits(
  state: GameState,
  changes: Readonly<Record<string, Partial<GameState["units"][string]>>>,
): GameState {
  return {
    ...state,
    units: Object.fromEntries(
      Object.entries(state.units).map(([unitId, unit]) => [
        unitId,
        { ...unit, ...changes[unitId] },
      ]),
    ),
  };
}

function renderFirstUnitTint(state: GameState): number | undefined {
  return renderUnitTint(state, 0);
}

function renderUnitTint(state: GameState, index: number): number | undefined {
  const worldContainer = createWorldContainer();
  const renderer = new BattleMapRenderer(createScene(), worldContainer as never, {
    boardOriginX: BOARD_ORIGIN,
    boardOriginY: BOARD_ORIGIN,
    tileSize: TILE_SIZE,
    initialZoom: INITIAL_ZOOM,
  });
  renderer.renderState(state);
  const unitViewIndex = Object.keys(state.controlPoints).length + index;
  return worldContainer.list.filter((object) => object.kind === "image")[unitViewIndex]?.tint;
}
