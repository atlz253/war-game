# Art Direction

## Visual standard

- Style: crisp pixel art.
- View: strict top-down; no isometric or perspective views.
- Board tile: 32×32 pixels.
- Unit canvas: no larger than 32×32 pixels unless a documented exception is approved.
- Palette: limited; use 16–24 colors per sprite at most.
- Light: from the upper left.
- Outline: dark, one pixel, only where it improves silhouette readability.
- Antialiasing: none. Use hard pixel edges and integer coordinates.
- Asset background: transparent unless the asset is a terrain tile.
- Scaling: nearest neighbour with Phaser `pixelArt` and `roundPixels` enabled.
- Animation: minimal. The first version moves static unit sprites between cells rather than requiring walk sheets.

## Consistency

Terrain, units, effects, and UI must use a coherent limited palette and visual density. Avoid excessive decoration, gradients, smooth shadows, text baked into sprites, or styles mixed from different sources.

Approved assets become references under `references/style/`. Future generation requests name the relevant reference images and explain which traits they preserve. Any intentional change to this standard must update this document first and state its reason.

