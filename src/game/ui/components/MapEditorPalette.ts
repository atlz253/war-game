import Phaser from "phaser";

import type { EditorTool } from "../../maps/editor-map-operations";
import {
  MAP_EDITOR_PALETTE_HEIGHT,
  MAP_EDITOR_PALETTE_WIDTH,
  MAP_EDITOR_PALETTE_X,
  MAP_EDITOR_PALETTE_Y,
  type MapEditorPaletteItem,
  type MapEditorPaletteTabId,
  mapEditorPaletteTabs,
} from "../map-editor-palette";
import { uiTheme } from "../theme/ui-theme";
import { Button } from "./Button";
import { Panel } from "./Panel";

interface MapEditorPaletteOptions {
  readonly selectedTool: EditorTool;
  readonly onToolSelected: (tool: EditorTool) => void;
}

const TAB_X = MAP_EDITOR_PALETTE_X + uiTheme.spacing.md;
const TAB_TITLE_BOTTOM_OFFSET = 120;
const TAB_Y = MAP_EDITOR_PALETTE_Y + TAB_TITLE_BOTTOM_OFFSET;
const TAB_WIDTH = 440;
const TAB_HEIGHT = 64;
const TAB_GAP = 24;
const CARD_X = MAP_EDITOR_PALETTE_X + uiTheme.spacing.md;
const CARD_TOP_OFFSET = 336;
const CARD_Y = MAP_EDITOR_PALETTE_Y + CARD_TOP_OFFSET;
const CARD_WIDTH = 336;
const CARD_HEIGHT = 272;
const CARD_GAP = 32;
const CARD_PREVIEW_SIZE = 176;
const CARD_LABEL_OFFSET_Y = 104;
const CARD_BORDER_WIDTH = 8;
const SELECTED_BORDER_COLOR = 0xffffff;
const HOVER_COLOR = uiTheme.colors.panelBorder;
const CENTER_ORIGIN = 0.5;

export class MapEditorPalette {
  public readonly container: Phaser.GameObjects.Container;
  private readonly onToolSelected: (tool: EditorTool) => void;
  private readonly panel: Panel;
  private readonly tabs = new Map<MapEditorPaletteTabId, Button>();
  private readonly cards: PaletteCard[] = [];
  private activeTabId: MapEditorPaletteTabId = "units";
  private selectedTool: EditorTool;

  public constructor(scene: Phaser.Scene, options: MapEditorPaletteOptions) {
    this.container = scene.add.container().setScrollFactor(0);
    this.onToolSelected = options.onToolSelected;
    this.selectedTool = options.selectedTool;
    this.panel = new Panel(scene, {
      x: MAP_EDITOR_PALETTE_X,
      y: MAP_EDITOR_PALETTE_Y,
      width: MAP_EDITOR_PALETTE_WIDTH,
      height: MAP_EDITOR_PALETTE_HEIGHT,
      title: "PALETTE",
    });
    this.container.add(this.panel.container);
    this.createTabs(scene);
    this.refreshCards(scene);
  }

  public setSelectedTool(tool: EditorTool): void {
    this.selectedTool = tool;
    for (const card of this.cards) card.setSelected(sameTool(card.item.tool, tool));
  }

  public setWidth(width: number): void {
    this.panel.setSize(width, MAP_EDITOR_PALETTE_HEIGHT);
  }

  private createTabs(scene: Phaser.Scene): void {
    mapEditorPaletteTabs.forEach((tab, index) => {
      const button = new Button(scene, {
        x: TAB_X + index * (TAB_WIDTH + TAB_GAP) + TAB_WIDTH / 2,
        y: TAB_Y,
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
        label: tab.label,
        selected: tab.id === this.activeTabId,
        onClick: () => this.selectTab(scene, tab.id),
      });
      this.tabs.set(tab.id, button);
      this.container.add(button.container);
    });
  }

  private selectTab(scene: Phaser.Scene, tabId: MapEditorPaletteTabId): void {
    if (this.activeTabId === tabId) return;
    this.activeTabId = tabId;
    for (const [id, button] of this.tabs) button.setSelected(id === tabId);
    this.refreshCards(scene);
  }

  private refreshCards(scene: Phaser.Scene): void {
    for (const card of this.cards.splice(0)) card.destroy();
    const tab = mapEditorPaletteTabs.find(({ id }) => id === this.activeTabId);
    if (!tab) return;
    tab.items.forEach((item, index) => {
      const card = new PaletteCard(scene, {
        item,
        x: CARD_X + index * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2,
        y: CARD_Y,
        selected: sameTool(item.tool, this.selectedTool),
        onClick: () => {
          this.setSelectedTool(item.tool);
          this.onToolSelected(item.tool);
        },
      });
      this.cards.push(card);
      this.container.add(card.container);
    });
  }
}

interface PaletteCardOptions {
  readonly item: MapEditorPaletteItem;
  readonly x: number;
  readonly y: number;
  readonly selected: boolean;
  readonly onClick: () => void;
}

class PaletteCard {
  public readonly container: Phaser.GameObjects.Container;
  public readonly item: MapEditorPaletteItem;
  private readonly background: Phaser.GameObjects.Rectangle;
  private selected: boolean;

  public constructor(scene: Phaser.Scene, options: PaletteCardOptions) {
    this.item = options.item;
    this.selected = options.selected;
    this.container = scene.add
      .container(options.x, options.y)
      .setSize(CARD_WIDTH, CARD_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0);
    this.background = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, uiTheme.colors.background);
    const preview = scene.add
      .image(0, -CARD_LABEL_OFFSET_Y / 2, options.item.textureKey)
      .setDisplaySize(CARD_PREVIEW_SIZE, CARD_PREVIEW_SIZE);
    const label = scene.add
      .text(0, CARD_LABEL_OFFSET_Y, options.item.label, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.smallSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    this.container.add([this.background, preview, label]);
    this.container.on(Phaser.Input.Events.POINTER_OVER, () => this.setHover(true));
    this.container.on(Phaser.Input.Events.POINTER_OUT, () => this.setHover(false));
    this.container.on(Phaser.Input.Events.POINTER_DOWN, options.onClick);
    this.refreshAppearance();
  }

  public setSelected(selected: boolean): void {
    this.selected = selected;
    this.refreshAppearance();
  }

  public destroy(): void {
    this.container.destroy(true);
  }

  private setHover(isHovering: boolean): void {
    this.background.setFillStyle(isHovering ? HOVER_COLOR : this.getBackgroundColor());
  }

  private refreshAppearance(): void {
    this.background
      .setFillStyle(this.getBackgroundColor())
      .setStrokeStyle(
        CARD_BORDER_WIDTH,
        this.selected ? SELECTED_BORDER_COLOR : uiTheme.colors.panelBorder,
      );
  }

  private getBackgroundColor(): number {
    return this.selected ? uiTheme.colors.panelBorder : uiTheme.colors.background;
  }
}

function sameTool(first: EditorTool, second: EditorTool): boolean {
  if (first.kind !== second.kind) return false;
  if (first.kind === "unit" && second.kind === "unit")
    return first.side === second.side && first.unitType === second.unitType;
  if (first.kind === "terrain" && second.kind === "terrain")
    return first.terrainType === second.terrainType;
  if (first.kind === "control-point" && second.kind === "control-point")
    return first.owner === second.owner;
  return first.kind === "erase" && second.kind === "erase";
}
