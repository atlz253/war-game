# Asset Pipeline

## Ownership and folders

Codex defines asset requirements, validates and integrates user-provided files, and maintains metadata. The user generates and selects assets with Stable Diffusion and ComfyUI, then places them at the requested path.

Use this layout when implementation begins:

```text
assets/generated/raw/       # preserved user-provided source images
assets/processed/           # generated runtime derivatives
assets/manifests/           # asset metadata
public/assets/terrain/
public/assets/units/blue/
public/assets/units/red/
public/assets/effects/
references/style/
references/generation/
```

The root `grass.png` is neither an approved reference nor a runtime asset and must not be loaded by the game.

## Manifest contract

```ts
interface UnitAssetDefinition {
  textureKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

interface TerrainAssetDefinition {
  textureKey: string;
  path: string;
  tileWidth: number;
  tileHeight: number;
}

interface AssetManifest {
  units: Record<string, UnitAssetDefinition>;
  terrain: Record<string, TerrainAssetDefinition>;
  effects: Record<string, { textureKey: string; path: string }>;
}
```

Only the manifest contains runtime asset paths. `BootScene` loads textures from it; scenes and renderers use texture keys only.

## Request assets incrementally

First request terrain tiles: `plain.png`, `forest.png`, `road.png`, `water.png`, `mountain.png`, and neutral/blue/red control points in `public/assets/terrain/`. Each is a native 512×512 PNG, strict top-down, cohesive with `docs/art-direction.md`, and seamless where tiling requires it. Runtime assets are not downscaled. `mountain.png` is the manifest-backed tile used for the current infantry-only mountain terrain.

Next request blue infantry, tank, and artillery. Attempt a palette swap for Red only if it preserves material, skin, metal, and shadow colors; otherwise request separate Red variants. Request muzzle flash, explosion, hit, and destroyed-marker effects only after the playable core works.

Do not request animations before they serve a functional need.

## Required request format

Every request contains:

```text
Asset name:
Purpose:
Save path:
File type:
Image size:
Frame size:
Frame count and layout:
View:
Background:
Palette:
Description:
Must not include:
Stable Diffusion prompt:
Negative prompt:
Additional notes / reference images:
```

## Validation and processing

After a file appears, check its expected path, supported PNG format, dimensions, alpha background where required, frame-grid divisibility, excess transparent margins, cell fit, manifest naming, and successful `BootScene` loading.

`npm run assets:validate` will eventually check required files, dimensions, transparency, frame grids, and unexpected formats. `npm run assets:process` may crop transparent margins, center a sprite on a 512×512 canvas, convert to PNG, create palette variants, or build an atlas. It never deletes original source files.

If a mismatch is safe to correct without quality loss, create a processing step. Otherwise report it and request regeneration; do not silently alter tile sizes or compromise the art direction.
