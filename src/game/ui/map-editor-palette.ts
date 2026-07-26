import type { SideId, TerrainType, UnitType } from "../../core/model/game-state";
import { assetManifest } from "../assets/asset-manifest";
import { GAME_CANVAS_HEIGHT, GAME_CANVAS_WIDTH } from "../config/game-config";
import type { EditorTool } from "../maps/editor-map-operations";

export type MapEditorPaletteTabId = "units" | "terrain" | "control-points";

export interface MapEditorPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly textureKey: string;
  readonly tool: EditorTool;
}

export interface MapEditorPaletteTab {
  readonly id: MapEditorPaletteTabId;
  readonly label: string;
  readonly items: readonly MapEditorPaletteItem[];
}

export const MAP_EDITOR_PALETTE_MARGIN = 0;
export const MAP_EDITOR_PALETTE_HEIGHT = 588;
export const MAP_EDITOR_LEFT_PANEL_WIDTH = 920;
export const MAP_EDITOR_PALETTE_X = MAP_EDITOR_LEFT_PANEL_WIDTH + MAP_EDITOR_PALETTE_MARGIN;
export const MAP_EDITOR_PALETTE_Y =
  GAME_CANVAS_HEIGHT - MAP_EDITOR_PALETTE_HEIGHT - MAP_EDITOR_PALETTE_MARGIN;
export const MAP_EDITOR_PALETTE_WIDTH =
  GAME_CANVAS_WIDTH - MAP_EDITOR_PALETTE_X - MAP_EDITOR_PALETTE_MARGIN;
export const MAP_EDITOR_PALETTE_RESERVED_HEIGHT =
  MAP_EDITOR_PALETTE_HEIGHT + MAP_EDITOR_PALETTE_MARGIN;

export function calculateMapEditorPaletteWidth(canvasWidth: number, hudScale: number): number {
  return Math.ceil(canvasWidth / hudScale) - MAP_EDITOR_PALETTE_X;
}

const unitItem = (side: SideId, unitType: UnitType): MapEditorPaletteItem => ({
  id: `${side}-${unitType}`,
  label: `${side.toUpperCase()} ${unitType.toUpperCase()}`,
  textureKey: assetManifest.units[`${side}-${unitType}`].textureKey,
  tool: { kind: "unit", side, unitType },
});

const terrainItem = (terrainType: TerrainType): MapEditorPaletteItem => ({
  id: terrainType,
  label: terrainType.toUpperCase(),
  textureKey: assetManifest.terrain[terrainType].textureKey,
  tool: { kind: "terrain", terrainType },
});

const controlPointItem = (owner: SideId | null): MapEditorPaletteItem => ({
  id: `control-point-${owner ?? "neutral"}`,
  label: `${owner?.toUpperCase() ?? "NEUTRAL"} POINT`,
  textureKey: assetManifest.terrain[`control-point-${owner ?? "neutral"}`].textureKey,
  tool: { kind: "control-point", owner },
});

export const mapEditorPaletteTabs: readonly MapEditorPaletteTab[] = [
  {
    id: "units",
    label: "UNITS",
    items: [
      unitItem("blue", "infantry"),
      unitItem("blue", "tank"),
      unitItem("blue", "artillery"),
      unitItem("red", "infantry"),
      unitItem("red", "tank"),
      unitItem("red", "artillery"),
    ],
  },
  {
    id: "terrain",
    label: "TERRAIN",
    items: [terrainItem("forest"), terrainItem("mountain")],
  },
  {
    id: "control-points",
    label: "CONTROL POINTS",
    items: [controlPointItem(null), controlPointItem("blue"), controlPointItem("red")],
  },
];
