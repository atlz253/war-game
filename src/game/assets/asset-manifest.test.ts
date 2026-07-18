import { describe, expect, it } from "vitest";

import { ASSET_FRAME_SIZE, assetManifest } from "./asset-manifest";

const EXPECTED_TERRAIN_COUNT = 8;
const EXPECTED_UNIT_COUNT = 4;

describe("assetManifest", () => {
  it("registers every provisional terrain and faction unit asset at native resolution", () => {
    expect(Object.keys(assetManifest.terrain)).toHaveLength(EXPECTED_TERRAIN_COUNT);
    expect(Object.keys(assetManifest.units)).toHaveLength(EXPECTED_UNIT_COUNT);

    for (const definition of Object.values(assetManifest.terrain)) {
      expect(definition.path).toMatch(/^\/assets\/terrain\//);
      expect(definition.tileWidth).toBe(ASSET_FRAME_SIZE);
      expect(definition.tileHeight).toBe(ASSET_FRAME_SIZE);
    }

    for (const definition of Object.values(assetManifest.units)) {
      expect(definition.path).toMatch(/^\/assets\/units\//);
      expect(definition.frameWidth).toBe(ASSET_FRAME_SIZE);
      expect(definition.frameHeight).toBe(ASSET_FRAME_SIZE);
      expect(definition.frameCount).toBe(1);
    }
  });
});
