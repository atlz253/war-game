import Phaser from "phaser";

import {
  createMapDefinition,
  isMapReadyForMatch,
  type MapDefinition,
  resizeMapDefinition,
} from "../../core/maps/map-definition";
import type { Position, SideId, UnitType } from "../../core/model/game-state";
import { assetManifest } from "../assets/asset-manifest";
import { calculateEditorWorldViewport } from "../config/editor-presentation";
import {
  calculatePresentationViewport,
  type PresentationViewport,
} from "../config/presentation-layout";
import { calculateInertialCameraVelocity } from "../input/camera-inertia";
import { calculateInertialZoom, calculateNextZoom, INITIAL_MAP_ZOOM } from "../input/camera-zoom";
import { chooseMapFile, downloadMapFile } from "../maps/browser-map-file";
import {
  applyEditorTool,
  type EditorTool,
  getEditorToolRejection,
  isPositionInMap,
  wouldTrimPlacements,
} from "../maps/editor-map-operations";
import { getBrowserMapLibrary } from "../maps/map-library";
import { confirmMapNameEdit } from "../maps/map-name-editor";
import {
  createDefaultMatchConfiguration,
  type MatchConfiguration,
} from "../match/match-configuration";
import { Button } from "../ui/components/Button";
import { MapRenameDialog } from "../ui/components/MapRenameDialog";
import { Panel } from "../ui/components/Panel";
import { uiTheme } from "../ui/theme/ui-theme";
import { calculateCameraCenterLimits } from "./camera-presentation";
import { calculateEditorPanelScroll } from "./editor-panel-scroll";
import { BATTLE_SCENE_KEY, MAIN_MENU_SCENE_KEY } from "./scene-keys";

const TILE_SIZE = 512;
const HALF = 2;
const HUD_X = 56;
const HUD_WIDTH = 864;
const EDITOR_PANEL_RESERVED_WIDTH = HUD_X + HUD_WIDTH;
const TOP_PANEL_Y = 56;
const TOP_PANEL_HEIGHT = 2048;
const EDITOR_CONTENT_OFFSET = 64;
const CONTENT_X = HUD_X + EDITOR_CONTENT_OFFSET;
const PANEL_CONTENT_TOP = TOP_PANEL_Y + uiTheme.spacing.md;
const PANEL_CONTENT_BOTTOM = TOP_PANEL_Y + TOP_PANEL_HEIGHT - uiTheme.spacing.sm;
const PANEL_CONTENT_VIEWPORT_HEIGHT = PANEL_CONTENT_BOTTOM - PANEL_CONTENT_TOP;
const BUTTON_X = HUD_X + HUD_WIDTH / HALF;
const BUTTON_WIDTH = 704;
const BUTTON_HEIGHT = 64;
const BUTTON_GAP = 80;
const FIRST_BUTTON_Y = 332;
const TOOL_TITLE_Y = 148;
const STATUS_Y = 2212;
const PANEL_CONTENT_BOTTOM_Y = STATUS_Y + uiTheme.font.smallSize;
const PANEL_CONTENT_HEIGHT = PANEL_CONTENT_BOTTOM_Y - PANEL_CONTENT_TOP;
const MASK_COLOR = 0xffffff;
const DEFAULT_WIDTH = 12;
const DEFAULT_HEIGHT = 8;
const MAP_ID_PREFIX = "map";
const MAP_NAME_PREFIX = "New Map";
const MAP_ID_SEPARATOR = "-";
const MAP_NAME_SEPARATOR = " ";
const INITIAL_MAP_NUMBER = 1;
const CAMERA_SCROLL_SPEED = 2400;
const CAMERA_DECELERATION = 8;
const ZOOM_RESPONSE_PER_SECOND = 8;
const MILLISECONDS_PER_SECOND = 1000;
const BUTTON_ROW = {
  widthDecrease: 0,
  widthIncrease: 1,
  heightDecrease: 2,
  heightIncrease: 3,
  newMap: 4,
  blueInfantry: 5,
  blueTank: 6,
  blueArtillery: 7,
  redInfantry: 8,
  redTank: 9,
  redArtillery: 10,
  mountain: 11,
  neutralPoint: 12,
  bluePoint: 13,
  redPoint: 14,
  erase: 15,
  rename: 16,
  save: 17,
  saveCopy: 18,
  testMatch: 19,
  import: 20,
  export: 21,
  delete: 22,
  back: 23,
} as const;

const SINGLE_CHARACTER_KEY_LENGTH = 1;
const ENTER_KEY = "Enter";
const ESCAPE_KEY = "Escape";
const BACKSPACE_KEY = "Backspace";

interface MapEditorSceneData {
  readonly mapId?: string;
  readonly matchConfiguration?: MatchConfiguration;
}

interface PendingResize {
  readonly width: number;
  readonly height: number;
}

interface CameraDrag {
  readonly pointerX: number;
  readonly pointerY: number;
  readonly centerX: number;
  readonly centerY: number;
}

export class MapEditorScene extends Phaser.Scene {
  private readonly library = getBrowserMapLibrary();
  private map!: MapDefinition;
  private matchConfiguration = createDefaultMatchConfiguration();
  private worldContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private editorContentContainer!: Phaser.GameObjects.Container;
  private editorContentMask?: Phaser.GameObjects.Graphics;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private presentationViewport!: PresentationViewport;
  private mapZoom = INITIAL_MAP_ZOOM;
  private targetMapZoom = INITIAL_MAP_ZOOM;
  private isZooming = false;
  private panelScrollOffset = 0;
  private cameraVelocity = { x: 0, y: 0 };
  private cameraCenter = { x: 0, y: 0 };
  private tool: EditorTool = { kind: "unit", side: "blue", unitType: "infantry" };
  private statusText!: Phaser.GameObjects.Text;
  private mapInfoText!: Phaser.GameObjects.Text;
  private pendingResize: PendingResize | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private cameraDrag: CameraDrag | null = null;
  private renameDialog: MapRenameDialog | null = null;

  public constructor() {
    super("map-editor");
  }

  public create(data: MapEditorSceneData = {}): void {
    this.matchConfiguration = data.matchConfiguration ?? createDefaultMatchConfiguration();
    this.map = this.loadMap(data.mapId);
    this.mapZoom = INITIAL_MAP_ZOOM;
    this.targetMapZoom = INITIAL_MAP_ZOOM;
    this.isZooming = false;
    this.panelScrollOffset = 0;
    this.renameDialog = null;
    this.worldContainer = this.add.container();
    this.hudContainer = this.add.container().setScrollFactor(0);
    this.configureCameras();
    this.createWorld();
    this.createHud();
    this.bindInput();
    this.render();
  }

  public update(_time: number, delta: number): void {
    if (this.renameDialog) {
      this.stopCameraMotion();
      return;
    }

    this.updateKeyboardCamera(delta);
    this.updateInertialZoom(delta);
  }

  private loadMap(mapId: string | undefined): MapDefinition {
    const storedMap = mapId ? this.library.list().find((map) => map.id === mapId) : undefined;
    return storedMap ?? createNewMap(this.library.list().length + INITIAL_MAP_NUMBER);
  }

  private configureCameras(): void {
    this.uiCamera = this.cameras.add();
    this.cameras.main.ignore(this.hudContainer);
    this.uiCamera.ignore(this.worldContainer);
    const keyboard = this.input.keyboard;
    this.cursors = keyboard?.createCursorKeys();
    this.wasdKeys = keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key> | undefined;
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindResize, this);
  }

  private updatePresentationViewport(): void {
    this.presentationViewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    const { x, y, scale } = this.presentationViewport;
    const worldViewport = calculateEditorWorldViewport(
      this.presentationViewport,
      EDITOR_PANEL_RESERVED_WIDTH,
    );
    this.cameras.main
      .setViewport(worldViewport.x, worldViewport.y, worldViewport.width, worldViewport.height)
      .setZoom(this.mapZoom * scale);
    this.resetCameraCenter();
    this.applyCameraCenter();
    this.stopCameraMotion();
    this.uiCamera.setViewport(0, 0, this.scale.width, this.scale.height).setScroll(0, 0).setZoom(1);
    this.hudContainer.setPosition(x, y).setScale(scale);
    this.updateEditorContentMask();
  }

  private createWorld(): void {
    const grass = this.add.tileSprite(
      (this.map.width * TILE_SIZE) / HALF,
      (this.map.height * TILE_SIZE) / HALF,
      this.map.width * TILE_SIZE,
      this.map.height * TILE_SIZE,
      assetManifest.terrain.plain.textureKey,
    );
    this.worldContainer.add(grass);
  }

  private createHud(): void {
    const panel = new Panel(this, {
      x: HUD_X,
      y: TOP_PANEL_Y,
      width: HUD_WIDTH,
      height: TOP_PANEL_HEIGHT,
      title: "MAP EDITOR",
    });
    this.editorContentContainer = this.add.container().setScrollFactor(0);
    this.mapInfoText = this.addText(CONTENT_X, TOOL_TITLE_Y, "");
    this.statusText = this.addText(CONTENT_X, STATUS_Y, "");
    const buttons = [
      this.createButton("WIDTH -", BUTTON_ROW.widthDecrease, () =>
        this.requestResize(this.map.width - 1, this.map.height),
      ),
      this.createButton("WIDTH +", BUTTON_ROW.widthIncrease, () =>
        this.requestResize(this.map.width + 1, this.map.height),
      ),
      this.createButton("HEIGHT -", BUTTON_ROW.heightDecrease, () =>
        this.requestResize(this.map.width, this.map.height - 1),
      ),
      this.createButton("HEIGHT +", BUTTON_ROW.heightIncrease, () =>
        this.requestResize(this.map.width, this.map.height + 1),
      ),
      this.createButton("NEW MAP", BUTTON_ROW.newMap, () => this.createNewMap()),
      this.createButton("BLUE INFANTRY", BUTTON_ROW.blueInfantry, () =>
        this.selectUnitTool("blue", "infantry"),
      ),
      this.createButton("BLUE TANK", BUTTON_ROW.blueTank, () =>
        this.selectUnitTool("blue", "tank"),
      ),
      this.createButton("BLUE ARTILLERY", BUTTON_ROW.blueArtillery, () =>
        this.selectUnitTool("blue", "artillery"),
      ),
      this.createButton("RED INFANTRY", BUTTON_ROW.redInfantry, () =>
        this.selectUnitTool("red", "infantry"),
      ),
      this.createButton("RED TANK", BUTTON_ROW.redTank, () => this.selectUnitTool("red", "tank")),
      this.createButton("RED ARTILLERY", BUTTON_ROW.redArtillery, () =>
        this.selectUnitTool("red", "artillery"),
      ),
      this.createButton("MOUNTAIN", BUTTON_ROW.mountain, () =>
        this.setTool({ kind: "terrain", terrainType: "mountain" }),
      ),
      this.createButton("POINT: NEUTRAL", BUTTON_ROW.neutralPoint, () =>
        this.selectControlPointTool(null),
      ),
      this.createButton("POINT: BLUE", BUTTON_ROW.bluePoint, () =>
        this.selectControlPointTool("blue"),
      ),
      this.createButton("POINT: RED", BUTTON_ROW.redPoint, () =>
        this.selectControlPointTool("red"),
      ),
      this.createButton("ERASE CELL", BUTTON_ROW.erase, () => this.setTool({ kind: "erase" })),
      this.createButton("RENAME MAP", BUTTON_ROW.rename, () => this.openRenameDialog()),
      this.createButton("SAVE", BUTTON_ROW.save, () => this.save()),
      this.createButton("SAVE AS COPY", BUTTON_ROW.saveCopy, () => this.saveCopy()),
      this.createButton("TEST MATCH", BUTTON_ROW.testMatch, () => this.startTestMatch()),
      this.createButton("IMPORT", BUTTON_ROW.import, () => void this.importMap()),
      this.createButton("EXPORT", BUTTON_ROW.export, () => this.exportMap()),
      this.createButton("DELETE MAP", BUTTON_ROW.delete, () => this.deleteMap()),
      this.createButton("BACK TO MENU", BUTTON_ROW.back, () =>
        this.scene.start(MAIN_MENU_SCENE_KEY),
      ),
    ];

    this.editorContentContainer.add([
      this.mapInfoText,
      this.statusText,
      ...buttons.map((button) => button.container),
    ]);
    this.createEditorContentMask();
    this.hudContainer.add([panel.container, this.editorContentContainer]);
  }

  private createButton(label: string, row: number, onClick: () => void): Button {
    return new Button(this, {
      x: BUTTON_X,
      y: FIRST_BUTTON_Y + row * BUTTON_GAP,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label,
      onClick,
    });
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.renameDialog) return;
      if (pointer.middleButtonDown() && this.isMapPointer(pointer)) {
        this.startCameraDrag(pointer);
        return;
      }
      if (!this.isMapPointer(pointer)) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const position = { x: Math.floor(world.x / TILE_SIZE), y: Math.floor(world.y / TILE_SIZE) };
      if (isPositionInMap(position, this.map)) this.applyTool(position);
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (pointer: Phaser.Input.Pointer, _objects: unknown[], _x: number, y: number) => {
        if (!this.scrollEditorPanel(pointer, y)) this.zoom(pointer, y);
      },
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.updateCameraDrag(pointer);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.cameraDrag = null;
    });
  }

  private startCameraDrag(pointer: Phaser.Input.Pointer): void {
    this.cameraDrag = {
      pointerX: pointer.x,
      pointerY: pointer.y,
      centerX: this.cameraCenter.x,
      centerY: this.cameraCenter.y,
    };
  }

  private updateCameraDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.cameraDrag || !pointer.middleButtonDown()) return;
    this.cameraCenter = {
      x: this.cameraDrag.centerX - (pointer.x - this.cameraDrag.pointerX) / this.cameras.main.zoom,
      y: this.cameraDrag.centerY - (pointer.y - this.cameraDrag.pointerY) / this.cameras.main.zoom,
    };
    this.applyCameraCenter();
    this.stopCameraMotion();
  }

  private isMapPointer(pointer: Phaser.Input.Pointer): boolean {
    if (this.renameDialog) return false;
    const logical = this.toLogicalPointer(pointer);
    return logical !== null && logical.x >= EDITOR_PANEL_RESERVED_WIDTH;
  }

  private scrollEditorPanel(pointer: Phaser.Input.Pointer, wheelDeltaY: number): boolean {
    const logical = this.toLogicalPointer(pointer);
    if (
      !logical ||
      logical.x < HUD_X ||
      logical.x >= HUD_X + HUD_WIDTH ||
      logical.y < TOP_PANEL_Y ||
      logical.y >= TOP_PANEL_Y + TOP_PANEL_HEIGHT
    )
      return false;

    this.panelScrollOffset = calculateEditorPanelScroll({
      currentOffset: this.panelScrollOffset,
      wheelDeltaY: wheelDeltaY / this.presentationViewport.scale,
      contentHeight: PANEL_CONTENT_HEIGHT,
      viewportHeight: PANEL_CONTENT_VIEWPORT_HEIGHT,
    });
    this.editorContentContainer.setY(-this.panelScrollOffset);
    return true;
  }

  private zoom(pointer: Phaser.Input.Pointer, wheelDeltaY: number): void {
    if (this.renameDialog) return;
    if (!this.isMapPointer(pointer)) return;
    const nextMapZoom = calculateNextZoom(this.targetMapZoom, wheelDeltaY);
    if (nextMapZoom === this.targetMapZoom) return;
    this.targetMapZoom = nextMapZoom;
    this.isZooming = true;
    this.stopCameraMotion();
  }

  private updateInertialZoom(delta: number): void {
    if (!this.isZooming || this.mapZoom === this.targetMapZoom) return;
    const camera = this.cameras.main;
    const nextMapZoom = calculateInertialZoom({
      currentZoom: this.mapZoom,
      targetZoom: this.targetMapZoom,
      deltaMs: delta,
      responsePerSecond: ZOOM_RESPONSE_PER_SECOND,
    });
    const nextZoom = nextMapZoom * this.presentationViewport.scale;
    this.mapZoom = nextMapZoom;
    camera.setZoom(nextZoom);
    this.resetCameraCenter();
    this.applyCameraCenter();
    if (this.mapZoom === this.targetMapZoom) this.isZooming = false;
  }

  private updateKeyboardCamera(delta: number): void {
    const limits = this.getCameraCenterLimits(this.cameraCenter.x, this.cameraCenter.y);
    const direction = this.getKeyboardCameraDirection();
    const velocity = calculateInertialCameraVelocity({
      velocityX: limits.canPanHorizontally ? this.cameraVelocity.x : 0,
      velocityY: limits.canPanVertically ? this.cameraVelocity.y : 0,
      horizontal: limits.canPanHorizontally ? direction.horizontal : 0,
      vertical: limits.canPanVertically ? direction.vertical : 0,
      deltaMs: delta,
      speed: CAMERA_SCROLL_SPEED,
      deceleration: CAMERA_DECELERATION,
    });

    this.cameraVelocity = velocity;
    this.cameraCenter = {
      x: this.cameraCenter.x + (velocity.x * delta) / MILLISECONDS_PER_SECOND,
      y: this.cameraCenter.y + (velocity.y * delta) / MILLISECONDS_PER_SECOND,
    };
    this.applyCameraCenter();
  }

  private resetCameraCenter(): void {
    this.cameraCenter = {
      x: (this.map.width * TILE_SIZE) / HALF,
      y: (this.map.height * TILE_SIZE) / HALF,
    };
  }

  private applyCameraCenter(): void {
    const limits = this.getCameraCenterLimits(this.cameraCenter.x, this.cameraCenter.y);
    this.cameraCenter = { x: limits.centerX, y: limits.centerY };
    this.cameras.main.centerOn(limits.centerX, limits.centerY);
  }

  private getCameraCenterLimits(requestedCenterX: number, requestedCenterY: number) {
    const camera = this.cameras.main;
    return calculateCameraCenterLimits({
      requestedCenterX,
      requestedCenterY,
      boardLeft: 0,
      boardTop: 0,
      boardWidth: this.map.width * TILE_SIZE,
      boardHeight: this.map.height * TILE_SIZE,
      visibleWidth: camera.width / camera.zoom,
      visibleHeight: camera.height / camera.zoom,
    });
  }

  private createEditorContentMask(): void {
    this.editorContentMask = this.make.graphics();
    this.editorContentMask
      .fillStyle(MASK_COLOR)
      .fillRect(HUD_X, PANEL_CONTENT_TOP, HUD_WIDTH, PANEL_CONTENT_VIEWPORT_HEIGHT);
    this.editorContentContainer.setMask(this.editorContentMask.createGeometryMask());
    this.updateEditorContentMask();
  }

  private updateEditorContentMask(): void {
    this.editorContentMask
      ?.setPosition(this.presentationViewport.x, this.presentationViewport.y)
      .setScale(this.presentationViewport.scale);
  }

  private getKeyboardCameraDirection(): { horizontal: number; vertical: number } {
    return {
      horizontal:
        Number(Boolean(this.cursors?.right.isDown || this.wasdKeys?.right.isDown)) -
        Number(Boolean(this.cursors?.left.isDown || this.wasdKeys?.left.isDown)),
      vertical:
        Number(Boolean(this.cursors?.down.isDown || this.wasdKeys?.down.isDown)) -
        Number(Boolean(this.cursors?.up.isDown || this.wasdKeys?.up.isDown)),
    };
  }

  private stopCameraMotion(): void {
    this.cameraVelocity = { x: 0, y: 0 };
  }

  private applyTool(position: Position): void {
    const rejection = getEditorToolRejection(this.map, this.tool, position);

    if (rejection) {
      this.statusText.setText(editorToolRejectionMessage(rejection));
      return;
    }

    this.map = applyEditorTool(this.map, this.tool, position);
    this.render();
  }

  private selectUnitTool(side: SideId, unitType: UnitType): void {
    this.setTool({ kind: "unit", side, unitType });
  }
  private selectControlPointTool(owner: SideId | null): void {
    this.setTool({ kind: "control-point", owner });
  }
  private setTool(tool: EditorTool): void {
    this.tool = tool;
    this.render();
  }

  private requestResize(width: number, height: number): void {
    if (width < 1 || height < 1) {
      this.statusText.setText("Map dimensions must stay positive.");
      return;
    }
    if (!wouldTrimPlacements(this.map, width, height)) {
      this.commitResize(width, height);
      return;
    }
    this.pendingResize = { width, height };
    this.statusText.setText(
      "Resize removes out-of-bounds placements. Click SAVE to confirm resize.",
    );
  }

  private commitResize(width: number, height: number): void {
    this.map = resizeMapDefinition(this.map, width, height);
    this.pendingResize = null;
    this.worldContainer.destroy(true);
    this.worldContainer = this.add.container();
    this.uiCamera.ignore(this.worldContainer);
    this.createWorld();
    this.updatePresentationViewport();
    this.render();
  }

  private save(): void {
    if (this.pendingResize) {
      this.commitResize(this.pendingResize.width, this.pendingResize.height);
    }
    this.library.save(this.map);
    this.statusText.setText("Map saved locally.");
  }

  private saveCopy(): void {
    this.library.save(this.map);
    this.map = this.library.copy(this.map.id);
    this.render();
  }

  private createNewMap(): void {
    this.map = createNewMap(this.nextMapNumber());
    this.pendingResize = null;
    this.updatePresentationViewport();
    this.render();
  }

  private openRenameDialog(): void {
    if (this.renameDialog) return;
    this.cameraDrag = null;
    this.renameDialog = new MapRenameDialog(this, {
      initialName: this.map.name,
      onConfirm: () => this.confirmRename(),
      onCancel: () => this.cancelRename(),
    });
    this.hudContainer.add(this.renameDialog.container);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleRenameKey, this);
  }

  private confirmRename(): void {
    const dialog = this.renameDialog;
    if (!dialog) return;
    const name = confirmMapNameEdit(dialog.editState);

    if (!name) {
      dialog.setError("Enter a map name.");
      return;
    }
    if (!this.library.isNameAvailable(this.map.id, name)) {
      dialog.setError("Another local map already uses this name.");
      return;
    }

    this.map = { ...this.map, name };
    this.closeRenameDialog();
    this.render();
    this.statusText.setText("Name changed. Click SAVE to keep it.");
  }

  private cancelRename(): void {
    if (!this.renameDialog) return;
    this.closeRenameDialog();
    this.statusText.setText("Rename cancelled.");
  }

  private handleRenameKey(event: KeyboardEvent): void {
    if (!this.renameDialog) return;
    event.preventDefault();

    if (event.key === ENTER_KEY) {
      this.confirmRename();
      return;
    }
    if (event.key === ESCAPE_KEY) {
      this.cancelRename();
      return;
    }
    if (event.key === BACKSPACE_KEY) {
      this.renameDialog.deleteLastCharacter();
      return;
    }
    if (this.isMapNameCharacter(event)) this.renameDialog.appendCharacter(event.key);
  }

  private isMapNameCharacter(event: KeyboardEvent): boolean {
    return (
      event.key.length === SINGLE_CHARACTER_KEY_LENGTH &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    );
  }

  private closeRenameDialog(): void {
    this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleRenameKey, this);
    this.renameDialog?.destroy();
    this.renameDialog = null;
  }

  private startTestMatch(): void {
    if (!isMapReadyForMatch(this.map)) {
      this.statusText.setText("Add at least one Blue and Red unit to test this map.");
      return;
    }
    this.scene.start(BATTLE_SCENE_KEY, {
      mapDefinition: this.map,
      matchConfiguration: this.matchConfiguration,
    });
  }
  private async importMap(): Promise<void> {
    const serialized = await chooseMapFile();
    if (!serialized) return;
    try {
      this.map = this.library.import(serialized);
      this.updatePresentationViewport();
      this.statusText.setText("Map imported.");
      this.render();
    } catch {
      this.statusText.setText("Import failed: invalid map file.");
    }
  }
  private exportMap(): void {
    downloadMapFile(this.map.name, JSON.stringify(this.map, null, 2));
    this.statusText.setText("Map export started.");
  }
  private deleteMap(): void {
    this.library.delete(this.map.id);
    this.scene.start(MAIN_MENU_SCENE_KEY);
  }

  private render(): void {
    this.worldContainer.removeAll(true);
    this.createWorld();
    for (const terrain of this.map.terrain)
      this.worldContainer.add(
        this.add.image(
          tileCenter(terrain.position.x),
          tileCenter(terrain.position.y),
          terrainTextureKey(terrain.type),
        ),
      );
    for (const point of this.map.controlPoints)
      this.worldContainer.add(
        this.add.image(
          tileCenter(point.position.x),
          tileCenter(point.position.y),
          controlPointTextureKey(point.owner),
        ),
      );
    for (const unit of this.map.units)
      this.worldContainer.add(
        this.add.image(
          tileCenter(unit.position.x),
          tileCenter(unit.position.y),
          assetManifest.units[`${unit.side}-${unit.type}`].textureKey,
        ),
      );
    this.mapInfoText.setText(
      `${this.map.name}\n${this.map.width} × ${this.map.height}\nTool: ${toolLabel(this.tool)}`,
    );
    if (!this.pendingResize)
      this.statusText.setText(
        isMapReadyForMatch(this.map) ? "Ready for test match." : "Draft: place Blue and Red units.",
      );
  }

  private toLogicalPointer(pointer: Phaser.Input.Pointer): Position | null {
    const { x, y, width, height, scale } = this.presentationViewport;
    const localX = pointer.x - x;
    const localY = pointer.y - y;
    return localX < 0 || localX >= width || localY < 0 || localY >= height
      ? null
      : { x: Math.floor(localX / scale), y: Math.floor(localY / scale) };
  }
  private addText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: `${uiTheme.font.smallSize}px`,
    });
  }
  private unbindResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.closeRenameDialog();
  }

  private nextMapNumber(): number {
    const mapIds = new Set(this.library.list().map((map) => map.id));
    let number = INITIAL_MAP_NUMBER;

    while (mapIds.has(`${MAP_ID_PREFIX}${MAP_ID_SEPARATOR}${number}`)) {
      number += INITIAL_MAP_NUMBER;
    }

    return number;
  }
}

function createNewMap(number: number): MapDefinition {
  return createMapDefinition(
    `${MAP_ID_PREFIX}${MAP_ID_SEPARATOR}${number}`,
    `${MAP_NAME_PREFIX}${MAP_NAME_SEPARATOR}${number}`,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
  );
}
function tileCenter(coordinate: number): number {
  return coordinate * TILE_SIZE + TILE_SIZE / HALF;
}
function controlPointTextureKey(owner: SideId | null): string {
  return assetManifest.terrain[`control-point-${owner ?? "neutral"}`].textureKey;
}
function terrainTextureKey(terrainType: "mountain"): string {
  return assetManifest.terrain[terrainType].textureKey;
}
function toolLabel(tool: EditorTool): string {
  if (tool.kind === "erase") return "ERASE";
  if (tool.kind === "unit") return `${tool.side.toUpperCase()} ${tool.unitType.toUpperCase()}`;
  if (tool.kind === "terrain") return tool.terrainType.toUpperCase();
  return `POINT ${tool.owner?.toUpperCase() ?? "NEUTRAL"}`;
}
function editorToolRejectionMessage(rejection: ReturnType<typeof getEditorToolRejection>): string {
  switch (rejection) {
    case "mountain-on-control-point":
      return "Remove the control point before placing a mountain.";
    case "mountain-on-tank":
      return "Tanks cannot occupy mountain cells.";
    case "mountain-on-artillery":
      return "Artillery cannot occupy mountain cells.";
    case "control-point-on-mountain":
      return "Control points cannot be placed on mountains.";
    case "tank-on-mountain":
      return "Tanks cannot be placed on mountains.";
    case "artillery-on-mountain":
      return "Artillery cannot be placed on mountains.";
    case null:
      return "";
  }
}
