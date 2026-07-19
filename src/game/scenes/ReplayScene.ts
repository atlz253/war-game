import Phaser from "phaser";

import { createGameStateFromMap } from "../../core/maps/map-definition";
import type { GameState } from "../../core/model/game-state";
import { createReplayTimeline, type ReplayTimeline } from "../../core/replay/replay-timeline";
import { BattleMapRenderer } from "../board/BattleMapRenderer";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import {
  calculatePresentationViewport,
  type PresentationViewport,
} from "../config/presentation-layout";
import { calculateInertialCameraVelocity } from "../input/camera-inertia";
import {
  calculateAnchoredScroll,
  calculateInertialZoom,
  calculateNextZoom,
  INITIAL_MAP_ZOOM,
} from "../input/camera-zoom";
import { getBrowserReplayLibrary } from "../replays/replay-library";
import {
  getNextReplayFrameIndex,
  getPreviousReplayFrameIndex,
  getReplayDelay,
} from "../replays/replay-playback";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { ScrollableList } from "../ui/components/ScrollableList";
import { uiTheme } from "../ui/theme/ui-theme";
import { formatEvent } from "./battle-view-helpers";
import { MAIN_MENU_SCENE_KEY } from "./scene-keys";

const TILE_SIZE = 512;
const BOARD_ORIGIN_Y = 56;
const HUD_X = 3104;
const HUD_WIDTH = 704;
const TOP_PANEL_Y = 56;
const TOP_PANEL_HEIGHT = 584;
const LOG_PANEL_Y = 672;
const LOG_PANEL_HEIGHT = 1432;
const HUD_TEXT_X = HUD_X + uiTheme.spacing.md;
const TITLE_OFFSET_Y = 128;
const STATUS_OFFSET_Y = 240;
const CONTROL_ROW_ONE_OFFSET_Y = 376;
const CONTROL_ROW_TWO_OFFSET_Y = 488;
const LOG_TEXT_OFFSET_Y = 112;
const TITLE_Y = TOP_PANEL_Y + TITLE_OFFSET_Y;
const STATUS_Y = TOP_PANEL_Y + STATUS_OFFSET_Y;
const CONTROL_ROW_ONE_Y = TOP_PANEL_Y + CONTROL_ROW_ONE_OFFSET_Y;
const CONTROL_ROW_TWO_Y = TOP_PANEL_Y + CONTROL_ROW_TWO_OFFSET_Y;
const LOG_TEXT_Y = LOG_PANEL_Y + LOG_TEXT_OFFSET_Y;
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
  readonly scrollX: number;
  readonly scrollY: number;
}

interface ZoomAnchor {
  readonly pointerX: number;
  readonly pointerY: number;
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
  private zoomAnchor: ZoomAnchor | null = null;
  private cameraVelocity = { x: 0, y: 0 };
  private dragState: DragState | null = null;
  private mapRenderer!: BattleMapRenderer;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private statusText!: Phaser.GameObjects.Text;
  private playButton!: Button;
  private speedButton!: Button;
  private eventLog!: ScrollableList;

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
    this.zoomAnchor = null;
    this.cameraVelocity = { x: 0, y: 0 };
    this.dragState = null;
  }

  public update(_time: number, delta: number): void {
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
    const logPanel = new Panel(this, {
      x: HUD_X,
      y: LOG_PANEL_Y,
      width: HUD_WIDTH,
      height: LOG_PANEL_HEIGHT,
      title: "EVENT LOG",
    });
    const title = this.add
      .text(HUD_TEXT_X, TITLE_Y, name, this.textStyle(uiTheme.font.smallSize))
      .setOrigin(TOP_LEFT_ORIGIN);
    this.statusText = this.add
      .text(HUD_TEXT_X, STATUS_Y, "", this.textStyle(uiTheme.font.smallSize))
      .setOrigin(TOP_LEFT_ORIGIN);
    this.eventLog = new ScrollableList(this, {
      x: HUD_TEXT_X,
      y: LOG_TEXT_Y,
      width: HUD_WIDTH - uiTheme.spacing.lg,
      maxEntries: 8,
    });
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
      logPanel.container,
      title,
      this.statusText,
      this.eventLog.container,
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
    this.cameras.main.setBounds(
      0,
      BOARD_ORIGIN_Y,
      state.board.width * TILE_SIZE,
      state.board.height * TILE_SIZE,
    );
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
        this.zoom(pointer, deltaY),
    );
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) =>
      this.startDrag(pointer),
    );
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) =>
      this.updateDrag(pointer),
    );
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.dragState = null;
    });
  }

  private zoom(pointer: Phaser.Input.Pointer, deltaY: number): void {
    if (!this.isWorldPointer(pointer)) return;
    const nextMapZoom = calculateNextZoom(this.targetMapZoom, deltaY);
    if (nextMapZoom === this.targetMapZoom) return;
    this.targetMapZoom = nextMapZoom;
    this.zoomAnchor = {
      pointerX: pointer.x - this.presentationViewport.x,
      pointerY: pointer.y - this.presentationViewport.y,
    };
    this.stopCameraMotion();
  }

  private startDrag(pointer: Phaser.Input.Pointer): void {
    if (!pointer.middleButtonDown() || !this.isWorldPointer(pointer)) return;
    const camera = this.cameras.main;
    this.dragState = {
      pointerX: pointer.x,
      pointerY: pointer.y,
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
    };
    this.stopCameraMotion();
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState || !pointer.middleButtonDown()) return;
    const camera = this.cameras.main;
    const zoom = camera.zoom;
    camera.setScroll(
      this.dragState.scrollX - (pointer.x - this.dragState.pointerX) / zoom,
      this.dragState.scrollY - (pointer.y - this.dragState.pointerY) / zoom,
    );
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
    const velocity = calculateInertialCameraVelocity({
      velocityX: this.cameraVelocity.x,
      velocityY: this.cameraVelocity.y,
      ...this.getKeyboardCameraDirection(),
      deltaMs: delta,
      speed: CAMERA_SCROLL_SPEED,
      deceleration: CAMERA_DECELERATION,
    });
    this.cameraVelocity = velocity;
    const camera = this.cameras.main;
    camera.setScroll(
      camera.scrollX + (velocity.x * delta) / MILLISECONDS_PER_SECOND,
      camera.scrollY + (velocity.y * delta) / MILLISECONDS_PER_SECOND,
    );
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
    if (!this.zoomAnchor || this.mapZoom === this.targetMapZoom) return;
    const camera = this.cameras.main;
    const nextMapZoom = calculateInertialZoom({
      currentZoom: this.mapZoom,
      targetZoom: this.targetMapZoom,
      deltaMs: delta,
      responsePerSecond: ZOOM_RESPONSE_PER_SECOND,
    });
    const nextZoom = nextMapZoom * this.presentationViewport.scale;
    const nextScroll = calculateAnchoredScroll({
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      pointerX: this.zoomAnchor.pointerX,
      pointerY: this.zoomAnchor.pointerY,
      previousZoom: camera.zoom,
      nextZoom,
    });
    this.mapZoom = nextMapZoom;
    camera.setZoom(nextZoom).setScroll(nextScroll.x, nextScroll.y);
    this.mapRenderer.updateHealthLabelScales(nextMapZoom);
    if (this.mapZoom === this.targetMapZoom) this.zoomAnchor = null;
  }

  private stopCameraMotion(): void {
    this.cameraVelocity = { x: 0, y: 0 };
  }

  private isWorldPointer(pointer: Phaser.Input.Pointer): boolean {
    const { x, y, width, height } = this.presentationViewport;
    return (
      pointer.x >= x &&
      pointer.x < x + width &&
      pointer.y >= y &&
      pointer.y < y + height &&
      pointer.x < x + HUD_X * this.presentationViewport.scale
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
    const { x, y, scale } = this.presentationViewport;
    this.uiCamera.setViewport(0, 0, this.scale.width, this.scale.height).setScroll(0, 0).setZoom(1);
    this.hudContainer.setPosition(x, y).setScale(scale);
  }

  private configureWorldCamera(): void {
    const { x, y, width, height, scale } = this.presentationViewport;
    this.cameras.main.setViewport(x, y, width, height).setZoom(this.mapZoom * scale);
    this.mapRenderer?.updateHealthLabelScales(this.mapZoom);
  }

  private unbindResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
