import Phaser from "phaser";

import { createGameStateFromMap } from "../../core/maps/map-definition";
import type { GameState } from "../../core/model/game-state";
import { createReplayTimeline, type ReplayTimeline } from "../../core/replay/replay-timeline";
import { BattleMapRenderer } from "../board/BattleMapRenderer";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import {
  calculatePresentationViewport,
  calculateRightAlignedContentX,
  type PresentationViewport,
} from "../config/presentation-layout";
import { calculateInertialCameraVelocity } from "../input/camera-inertia";
import { calculateInertialZoom, calculateNextZoom, INITIAL_MAP_ZOOM } from "../input/camera-zoom";
import { getBrowserReplayLibrary } from "../replays/replay-library";
import {
  getNextReplayFrameIndex,
  getPreviousReplayFrameIndex,
  getReplayDelay,
} from "../replays/replay-playback";
import { Button } from "../ui/components/Button";
import { EventLogDialog } from "../ui/components/EventLogDialog";
import { EVENT_LOG_VISIBLE_ENTRY_COUNT, EventLogModel } from "../ui/components/EventLogModel";
import { Panel } from "../ui/components/Panel";
import { PauseMenu } from "../ui/components/PauseMenu";
import { uiTheme } from "../ui/theme/ui-theme";
import { calculateWorldViewportWidth } from "./battle-presentation";
import { formatEvent } from "./battle-view-helpers";
import { calculateCameraCenterLimits } from "./camera-presentation";
import { MAIN_MENU_SCENE_KEY } from "./scene-keys";

const TILE_SIZE = 512;
const BOARD_ORIGIN_Y = 56;
const HUD_X = 3104;
const HUD_WIDTH = 704;
const TOP_PANEL_Y = 56;
const TOP_PANEL_HEIGHT = 584;
const HUD_TEXT_X = HUD_X + uiTheme.spacing.md;
const TITLE_OFFSET_Y = 128;
const STATUS_OFFSET_Y = 240;
const CONTROL_ROW_ONE_OFFSET_Y = 376;
const CONTROL_ROW_TWO_OFFSET_Y = 488;
const TITLE_Y = TOP_PANEL_Y + TITLE_OFFSET_Y;
const STATUS_Y = TOP_PANEL_Y + STATUS_OFFSET_Y;
const CONTROL_ROW_ONE_Y = TOP_PANEL_Y + CONTROL_ROW_ONE_OFFSET_Y;
const CONTROL_ROW_TWO_Y = TOP_PANEL_Y + CONTROL_ROW_TWO_OFFSET_Y;
const CONTROL_WIDTH = 176;
const CONTROL_HEIGHT = 96;
const FIRST_CONTROL_OFFSET_X = 96;
const CONTROL_GAP_X = 216;
const START_X = HUD_TEXT_X + FIRST_CONTROL_OFFSET_X;
const PREVIOUS_X = START_X + CONTROL_GAP_X;
const NEXT_X = PREVIOUS_X + CONTROL_GAP_X;
const PLAY_X = START_X;
const SPEED_X = PREVIOUS_X;
const BACK_X = NEXT_X;
const CAMERA_SCROLL_SPEED = 2400;
const CAMERA_DECELERATION = 8;
const ZOOM_RESPONSE_PER_SECOND = 8;
const MILLISECONDS_PER_SECOND = 1000;
const TOP_LEFT_ORIGIN = 0;

export interface ReplaySceneData {
  readonly replayId?: string;
}

interface DragState {
  readonly pointerX: number;
  readonly pointerY: number;
  readonly centerX: number;
  readonly centerY: number;
}

export class ReplayScene extends Phaser.Scene {
  private worldContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private presentationViewport!: PresentationViewport;
  private timeline!: ReplayTimeline;
  private frameIndex = 0;
  private isPlaying = false;
  private speed = 1;
  private elapsedPlaybackMs = 0;
  private mapZoom = INITIAL_MAP_ZOOM;
  private targetMapZoom = INITIAL_MAP_ZOOM;
  private isZooming = false;
  private cameraVelocity = { x: 0, y: 0 };
  private cameraCenter = { x: 0, y: 0 };
  private dragState: DragState | null = null;
  private mapRenderer!: BattleMapRenderer;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private statusText!: Phaser.GameObjects.Text;
  private playButton!: Button;
  private speedButton!: Button;
  private eventLog = new EventLogModel(EVENT_LOG_VISIBLE_ENTRY_COUNT);
  private pauseMenu!: PauseMenu;
  private eventLogDialog?: EventLogDialog;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private resumePlaybackAfterPause = false;

  public constructor() {
    super("replay");
  }

  public create(data: ReplaySceneData): void {
    this.resetRenderingState();
    const replay = data.replayId ? getBrowserReplayLibrary().get(data.replayId) : undefined;
    if (!replay) {
      this.scene.start(MAIN_MENU_SCENE_KEY);
      return;
    }

    this.timeline = createReplayTimeline(
      () => createGameStateFromMap(replay.mapDefinition),
      replay.replay.actions,
    );
    this.worldContainer = this.add.container();
    this.hudContainer = this.add.container().setScrollFactor(0);
    this.createWorld(this.timeline.frames[0]?.state);
    this.createHud(replay.name);
    this.configureCameras();
    this.createPauseMenu();
    this.bindInput();
    this.showFrame(0);
  }

  private resetRenderingState(): void {
    this.mapRenderer?.reset();
    this.frameIndex = 0;
    this.isPlaying = false;
    this.speed = 1;
    this.elapsedPlaybackMs = 0;
    this.mapZoom = INITIAL_MAP_ZOOM;
    this.targetMapZoom = INITIAL_MAP_ZOOM;
    this.isZooming = false;
    this.cameraVelocity = { x: 0, y: 0 };
    this.cameraCenter = { x: 0, y: 0 };
    this.dragState = null;
    this.eventLog = new EventLogModel(EVENT_LOG_VISIBLE_ENTRY_COUNT);
    this.eventLogDialog = undefined;
  }

  public update(_time: number, delta: number): void {
    if (this.pauseMenu.isOpen) return;
    this.updateKeyboardCamera(delta);
    this.updateInertialZoom(delta);
    if (!this.isPlaying) return;
    this.elapsedPlaybackMs += delta;
    if (this.elapsedPlaybackMs >= getReplayDelay(this.speed)) {
      this.elapsedPlaybackMs = 0;
      this.showFrame(getNextReplayFrameIndex(this.frameIndex, this.timeline.frames.length));
    }
  }

  private createWorld(state: GameState | undefined): void {
    if (!state) return;
    this.mapRenderer = new BattleMapRenderer(this, this.worldContainer, {
      boardOriginX: 0,
      boardOriginY: BOARD_ORIGIN_Y,
      tileSize: TILE_SIZE,
      initialZoom: this.mapZoom,
    });
    this.mapRenderer.createTerrain(state);
  }

  private createHud(name: string): void {
    const turnPanel = new Panel(this, {
      x: HUD_X,
      y: TOP_PANEL_Y,
      width: HUD_WIDTH,
      height: TOP_PANEL_HEIGHT,
      title: "REPLAY",
    });
    const title = this.add
      .text(HUD_TEXT_X, TITLE_Y, name, this.textStyle(uiTheme.font.smallSize))
      .setOrigin(TOP_LEFT_ORIGIN);
    this.statusText = this.add
      .text(HUD_TEXT_X, STATUS_Y, "", this.textStyle(uiTheme.font.smallSize))
      .setOrigin(TOP_LEFT_ORIGIN);
    const start = this.createControl(START_X, CONTROL_ROW_ONE_Y, "START", () => this.showFrame(0));
    const previous = this.createControl(PREVIOUS_X, CONTROL_ROW_ONE_Y, "<", () =>
      this.showFrame(getPreviousReplayFrameIndex(this.frameIndex)),
    );
    const next = this.createControl(NEXT_X, CONTROL_ROW_ONE_Y, ">", () =>
      this.showFrame(getNextReplayFrameIndex(this.frameIndex, this.timeline.frames.length)),
    );
    this.playButton = this.createControl(PLAY_X, CONTROL_ROW_TWO_Y, "PLAY", () =>
      this.togglePlayback(),
    );
    this.speedButton = this.createControl(SPEED_X, CONTROL_ROW_TWO_Y, "1×", () =>
      this.toggleSpeed(),
    );
    const back = this.createControl(BACK_X, CONTROL_ROW_TWO_Y, "BACK", () =>
      this.scene.start(MAIN_MENU_SCENE_KEY),
    );
    this.hudContainer.add([
      turnPanel.container,
      title,
      this.statusText,
      start.container,
      previous.container,
      next.container,
      this.playButton.container,
      this.speedButton.container,
      back.container,
    ]);
  }

  private textStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: `${fontSize}px`,
    };
  }

  private createControl(x: number, y: number, label: string, onClick: () => void): Button {
    return new Button(this, {
      x,
      y,
      width: CONTROL_WIDTH,
      height: CONTROL_HEIGHT,
      label,
      onClick,
    });
  }

  private configureCameras(): void {
    const state = this.timeline.frames[0]?.state;
    if (!state) return;
    this.uiCamera = this.cameras.add();
    this.cameras.main.removeBounds();
    this.cameras.main.ignore(this.hudContainer);
    this.uiCamera.ignore(this.worldContainer);
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.bindKeyboardCamera();
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindResize, this);
  }

  private bindInput(): void {
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (pointer: Phaser.Input.Pointer, _objects: unknown[], _x: number, deltaY: number) =>
        this.handleWheel(pointer, deltaY),
    );
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) =>
      this.handlePointerDown(pointer),
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) =>
      this.handlePointerMove(pointer),
    );
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.pauseMenu.isOpen) return;
      this.dragState = null;
    });
    this.bindPauseKey();
  }

  private createPauseMenu(): void {
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.resumeFromPause(),
      onExit: () => this.scene.start(MAIN_MENU_SCENE_KEY),
      onShowEventLog: () => this.openEventLog(),
    });
    this.eventLogDialog = new EventLogDialog(this, this.eventLog);
    this.cameras.main.ignore([this.pauseMenu.overlay, this.pauseMenu.container]);
    this.cameras.main.ignore(this.eventLogDialog.container);
    this.updatePauseMenuPresentation();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownPauseMenu, this);
  }

  private updatePauseMenuPresentation(): void {
    if (!this.pauseMenu) return;
    this.pauseMenu.container
      .setPosition(this.presentationViewport.contentX, this.presentationViewport.contentY)
      .setScale(this.presentationViewport.scale);
    this.eventLogDialog?.container
      .setPosition(this.presentationViewport.contentX, this.presentationViewport.contentY)
      .setScale(this.presentationViewport.scale);
    this.pauseMenu.setOverlaySize(this.scale.width, this.scale.height);
  }

  private bindPauseKey(): void {
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey?.on(Phaser.Input.Keyboard.Events.DOWN, this.handleEscapeKey, this);
  }

  private handleEscapeKey(): void {
    if (this.eventLogDialog?.isOpen) {
      this.eventLogDialog.close();
      return;
    }
    if (this.pauseMenu.isOpen) this.resumeFromPause();
    else this.openPauseMenu();
  }

  private openPauseMenu(): void {
    this.resumePlaybackAfterPause = this.isPlaying;
    this.pausePlayback();
    this.stopCameraMotion();
    this.pauseMenu.open();
  }

  private resumeFromPause(): void {
    this.eventLogDialog?.close();
    this.pauseMenu.close();
    if (this.resumePlaybackAfterPause) this.togglePlayback();
    this.resumePlaybackAfterPause = false;
  }

  private shutdownPauseMenu(): void {
    this.escapeKey?.off(Phaser.Input.Keyboard.Events.DOWN, this.handleEscapeKey, this);
    this.eventLogDialog?.destroy(this);
    this.eventLogDialog = undefined;
  }

  private openEventLog(): void {
    this.eventLogDialog?.open();
  }

  private handleWheel(pointer: Phaser.Input.Pointer, deltaY: number): void {
    if (!this.pauseMenu.isOpen) this.zoom(pointer, deltaY);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.pauseMenu.isOpen) this.startDrag(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pauseMenu.isOpen) this.updateDrag(pointer);
  }

  private zoom(pointer: Phaser.Input.Pointer, deltaY: number): void {
    if (!this.isWorldPointer(pointer)) return;
    const nextMapZoom = calculateNextZoom(this.targetMapZoom, deltaY);
    if (nextMapZoom === this.targetMapZoom) return;
    this.targetMapZoom = nextMapZoom;
    this.isZooming = true;
    this.stopCameraMotion();
  }

  private startDrag(pointer: Phaser.Input.Pointer): void {
    if (!pointer.middleButtonDown() || !this.isWorldPointer(pointer)) return;
    this.dragState = {
      pointerX: pointer.x,
      pointerY: pointer.y,
      centerX: this.cameraCenter.x,
      centerY: this.cameraCenter.y,
    };
    this.stopCameraMotion();
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState || !pointer.middleButtonDown()) return;
    this.cameraCenter = {
      x: this.dragState.centerX - (pointer.x - this.dragState.pointerX) / this.cameras.main.zoom,
      y: this.dragState.centerY - (pointer.y - this.dragState.pointerY) / this.cameras.main.zoom,
    };
    this.applyCameraCenter();
    this.stopCameraMotion();
  }

  private bindKeyboardCamera(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.cursors = keyboard.createCursorKeys();
    this.wasdKeys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
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
    this.mapRenderer.updateHealthLabelScales(nextMapZoom);
    if (this.mapZoom === this.targetMapZoom) this.isZooming = false;
  }

  private stopCameraMotion(): void {
    this.cameraVelocity = { x: 0, y: 0 };
  }

  private isWorldPointer(pointer: Phaser.Input.Pointer): boolean {
    const camera = this.cameras.main;
    return (
      pointer.x >= camera.x &&
      pointer.x < camera.x + camera.width &&
      pointer.y >= camera.y &&
      pointer.y < camera.y + camera.height
    );
  }

  private showFrame(index: number): void {
    this.frameIndex = index;
    const frame = this.timeline.frames[index];
    if (!frame) return;
    this.renderState(frame.state);
    this.eventLog.setEntries(
      this.timeline.frames.slice(1, index + 1).flatMap((item) => item.events.map(formatEvent)),
    );
    this.statusText.setText(
      `Frame ${index}/${this.timeline.frames.length - 1} · Turn ${frame.state.turn} — ${frame.state.activeSide.toUpperCase()}`,
    );
    if (index >= this.timeline.frames.length - 1) this.pausePlayback();
  }

  private renderState(state: GameState): void {
    this.mapRenderer.renderState(state);
  }

  private togglePlayback(): void {
    if (this.isPlaying) this.pausePlayback();
    else {
      this.isPlaying = true;
      this.playButton.setLabel("PAUSE");
    }
  }

  private pausePlayback(): void {
    this.isPlaying = false;
    this.playButton.setLabel("PLAY");
  }

  private toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
    this.speedButton.setLabel(`${this.speed}×`);
  }

  private updatePresentationViewport(): void {
    this.presentationViewport = calculatePresentationViewport(this.scale.width, this.scale.height);
    this.configureWorldCamera();
    const { contentY, scale } = this.presentationViewport;
    const hudX = calculateRightAlignedContentX(this.presentationViewport, HUD_X + HUD_WIDTH);
    this.uiCamera.setViewport(0, 0, this.scale.width, this.scale.height).setScroll(0, 0).setZoom(1);
    this.hudContainer.setPosition(hudX, contentY).setScale(scale);
    this.updatePauseMenuPresentation();
  }

  private configureWorldCamera(): void {
    const { x, y, width, height, scale } = this.presentationViewport;
    const state = this.timeline.frames[0]?.state;
    if (!state) return;
    const worldViewportWidth = calculateWorldViewportWidth(width, HUD_WIDTH, scale);
    this.cameras.main.removeBounds();
    this.cameras.main.setViewport(x, y, worldViewportWidth, height).setZoom(this.mapZoom * scale);
    this.resetCameraCenter();
    this.applyCameraCenter();
    this.stopCameraMotion();
    this.mapRenderer?.updateHealthLabelScales(this.mapZoom);
  }

  private resetCameraCenter(): void {
    const state = this.timeline.frames[0]?.state;
    if (!state) return;
    this.cameraCenter = {
      x: (state.board.width * TILE_SIZE) / 2,
      y: BOARD_ORIGIN_Y + (state.board.height * TILE_SIZE) / 2,
    };
  }

  private applyCameraCenter(): void {
    const limits = this.getCameraCenterLimits(this.cameraCenter.x, this.cameraCenter.y);
    this.cameraCenter = { x: limits.centerX, y: limits.centerY };
    this.cameras.main.centerOn(limits.centerX, limits.centerY);
  }

  private getCameraCenterLimits(requestedCenterX: number, requestedCenterY: number) {
    const state = this.timeline.frames[0]?.state;
    if (!state) {
      return {
        centerX: requestedCenterX,
        centerY: requestedCenterY,
        canPanHorizontally: false,
        canPanVertically: false,
      };
    }

    const camera = this.cameras.main;
    return calculateCameraCenterLimits({
      requestedCenterX,
      requestedCenterY,
      boardLeft: 0,
      boardTop: BOARD_ORIGIN_Y,
      boardWidth: state.board.width * TILE_SIZE,
      boardHeight: state.board.height * TILE_SIZE,
      visibleWidth: camera.width / camera.zoom,
      visibleHeight: camera.height / camera.zoom,
    });
  }

  private unbindResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
