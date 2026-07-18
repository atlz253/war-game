export interface UnitAssetDefinition {
  readonly textureKey: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
}

export interface TerrainAssetDefinition {
  readonly textureKey: string;
  readonly path: string;
  readonly tileWidth: number;
  readonly tileHeight: number;
}

export interface AssetManifest {
  readonly units: Readonly<Record<string, UnitAssetDefinition>>;
  readonly terrain: Readonly<Record<string, TerrainAssetDefinition>>;
  readonly effects: Readonly<
    Record<string, { readonly textureKey: string; readonly path: string }>
  >;
}

export const ASSET_FRAME_SIZE = 512;

export const assetManifest: AssetManifest = {
  units: {
    "blue-infantry": createUnitDefinition("blue-infantry", "/assets/units/blue/infantry.png"),
    "blue-tank": createUnitDefinition("blue-tank", "/assets/units/blue/tank.png"),
    "red-infantry": createUnitDefinition("red-infantry", "/assets/units/red/infantry.png"),
    "red-tank": createUnitDefinition("red-tank", "/assets/units/red/tank.png"),
  },
  terrain: {
    plain: createTerrainDefinition("terrain-plain", "/assets/terrain/plain.png"),
    forest: createTerrainDefinition("terrain-forest", "/assets/terrain/forest.png"),
    road: createTerrainDefinition("terrain-road", "/assets/terrain/road.png"),
    water: createTerrainDefinition("terrain-water", "/assets/terrain/water.png"),
    mountain: createTerrainDefinition("terrain-mountain", "/assets/terrain/mountain.png"),
    "control-point-neutral": createTerrainDefinition(
      "control-point-neutral",
      "/assets/terrain/control-point-neutral.png",
    ),
    "control-point-blue": createTerrainDefinition(
      "control-point-blue",
      "/assets/terrain/control-point-blue.png",
    ),
    "control-point-red": createTerrainDefinition(
      "control-point-red",
      "/assets/terrain/control-point-red.png",
    ),
  },
  effects: {},
};

function createUnitDefinition(textureKey: string, path: string): UnitAssetDefinition {
  return {
    textureKey,
    path,
    frameWidth: ASSET_FRAME_SIZE,
    frameHeight: ASSET_FRAME_SIZE,
    frameCount: 1,
  };
}

function createTerrainDefinition(textureKey: string, path: string): TerrainAssetDefinition {
  return {
    textureKey,
    path,
    tileWidth: ASSET_FRAME_SIZE,
    tileHeight: ASSET_FRAME_SIZE,
  };
}
