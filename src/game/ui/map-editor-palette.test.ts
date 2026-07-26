import { describe, expect, it } from "vitest";

import {
  calculateMapEditorPaletteWidth,
  MAP_EDITOR_PALETTE_X,
  mapEditorPaletteTabs,
} from "./map-editor-palette";

const UNIT_ITEM_COUNT = 6;
const CONTROL_POINT_ITEM_COUNT = 3;
const CANVAS_WIDTH = 1920;
const HUD_SCALE = 0.5;

describe("mapEditorPaletteTabs", () => {
  it("groups every supported placement tool into the expected tabs", () => {
    expect(mapEditorPaletteTabs.map((tab) => tab.id)).toEqual([
      "units",
      "terrain",
      "control-points",
    ]);
    expect(mapEditorPaletteTabs[0]?.items).toHaveLength(UNIT_ITEM_COUNT);
    expect(mapEditorPaletteTabs[1]?.items.map((item) => item.id)).toEqual(["forest", "mountain"]);
    expect(mapEditorPaletteTabs[2]?.items).toHaveLength(CONTROL_POINT_ITEM_COUNT);
  });

  it("does not expose unsupported terrain assets as placement tools", () => {
    const itemIds = mapEditorPaletteTabs.flatMap((tab) => tab.items.map((item) => item.id));

    expect(itemIds).not.toContain("road");
    expect(itemIds).not.toContain("water");
    expect(itemIds).not.toContain("plain");
  });

  it("extends the palette to the physical right edge when the HUD is scaled", () => {
    expect(calculateMapEditorPaletteWidth(CANVAS_WIDTH, HUD_SCALE)).toBe(
      CANVAS_WIDTH / HUD_SCALE - MAP_EDITOR_PALETTE_X,
    );
  });
});
