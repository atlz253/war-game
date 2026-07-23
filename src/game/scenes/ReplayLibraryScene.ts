import Phaser from "phaser";

import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import { chooseReplayFile, downloadReplayFile } from "../replays/browser-replay-file";
import { getBrowserReplayLibrary } from "../replays/replay-library";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { uiTheme } from "../ui/theme/ui-theme";
import { MAIN_MENU_SCENE_KEY, REPLAY_SCENE_KEY } from "./scene-keys";

const CENTER_X = 1920;
const CENTER_Y = 1080;
const PANEL_WIDTH = 2300;
const PANEL_HEIGHT = 1700;
const TITLE_Y = 420;
const LIST_X = 920;
const LIST_Y = 680;
const LIST_WIDTH = 2000;
const STATUS_Y = 1420;
const SELECT_PREVIOUS_X = 1360;
const SELECT_NEXT_X = 2480;
const SELECT_Y = 1240;
const ACTION_Y = 1560;
const WATCH_X = 1120;
const EXPORT_X = 1680;
const IMPORT_X = 2240;
const DELETE_X = 2800;
const BACK_X = 1920;
const BUTTON_WIDTH = 440;
const BUTTON_HEIGHT = 120;
const CENTER_ORIGIN = 0.5;
const TOP_ORIGIN = 0;
const EMPTY_SELECTION = -1;

export class ReplayLibraryScene extends Phaser.Scene {
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;
  private readonly library = getBrowserReplayLibrary();
  private selectedIndex = EMPTY_SELECTION;
  private listText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private watchButton!: Button;
  private exportButton!: Button;
  private deleteButton!: Button;

  public constructor() {
    super("replay-library");
  }

  public create(): void {
    const panel = new Panel(this, {
      x: CENTER_X - PANEL_WIDTH / 2,
      y: CENTER_Y - PANEL_HEIGHT / 2,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      title: "REPLAY LIBRARY",
    });
    const title = this.add
      .text(CENTER_X, TITLE_Y, "SAVED MATCHES", this.textStyle(uiTheme.font.titleSize))
      .setOrigin(CENTER_ORIGIN);
    this.listText = this.add
      .text(LIST_X, LIST_Y, "", {
        ...this.textStyle(uiTheme.font.normalSize),
        wordWrap: { width: LIST_WIDTH },
        lineSpacing: uiTheme.spacing.sm,
      })
      .setOrigin(TOP_ORIGIN);
    this.statusText = this.add
      .text(CENTER_X, STATUS_Y, "", this.textStyle(uiTheme.font.smallSize))
      .setOrigin(CENTER_ORIGIN);
    this.watchButton = this.createButton(WATCH_X, "WATCH", () => this.watchSelected());
    this.exportButton = this.createButton(EXPORT_X, "EXPORT", () => this.exportSelected());
    const importButton = this.createButton(IMPORT_X, "IMPORT", () => void this.importReplay());
    this.deleteButton = this.createButton(DELETE_X, "DELETE", () => this.deleteSelected());
    const previousButton = this.createButton(
      SELECT_PREVIOUS_X,
      "< PREVIOUS",
      () => this.changeSelection(-1),
      SELECT_Y,
    );
    const nextButton = this.createButton(
      SELECT_NEXT_X,
      "NEXT >",
      () => this.changeSelection(1),
      SELECT_Y,
    );
    const backButton = this.createButton(
      BACK_X,
      "BACK",
      () => this.scene.start(MAIN_MENU_SCENE_KEY),
      ACTION_Y + BUTTON_HEIGHT + uiTheme.spacing.md,
    );

    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    this.presentationContainer = this.add.container(0, 0, [
      panel.container,
      title,
      this.listText,
      this.statusText,
      previousButton.container,
      nextButton.container,
      this.watchButton.container,
      this.exportButton.container,
      importButton.container,
      this.deleteButton.container,
      backButton.container,
    ]);
    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.refresh();
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindResize, this);
  }

  private textStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: uiTheme.colors.text,
      fontFamily: uiTheme.font.family,
      fontSize: `${fontSize}px`,
    };
  }

  private createButton(x: number, label: string, onClick: () => void, y = ACTION_Y): Button {
    return new Button(this, { x, y, width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label, onClick });
  }

  private selectedReplay() {
    return this.library.list()[this.selectedIndex];
  }

  private refresh(): void {
    const replays = this.library.list();
    if (replays.length === 0) this.selectedIndex = EMPTY_SELECTION;
    else if (this.selectedIndex < 0 || this.selectedIndex >= replays.length) this.selectedIndex = 0;

    this.listText.setText(
      replays.length === 0 ? "No completed matches saved yet." : this.formatReplayList(),
    );
    const enabled = Boolean(this.selectedReplay());
    this.watchButton.setEnabled(enabled);
    this.exportButton.setEnabled(enabled);
    this.deleteButton.setEnabled(enabled);
  }

  private formatReplayList(): string {
    return this.library
      .list()
      .map((replay, index) => {
        const marker = index === this.selectedIndex ? ">" : " ";
        return `${marker} ${replay.name}\n   ${replay.mapDefinition.name} · ${replay.winner.toUpperCase()} · Turn ${replay.turn}\n   BLUE: ${replay.matchConfiguration.blue} | RED: ${replay.matchConfiguration.red}`;
      })
      .join("\n\n");
  }

  private changeSelection(direction: number): void {
    const replays = this.library.list();
    if (replays.length === 0) return;
    this.selectedIndex = (this.selectedIndex + direction + replays.length) % replays.length;
    this.refresh();
  }

  private watchSelected(): void {
    const replay = this.selectedReplay();
    if (replay) this.scene.start(REPLAY_SCENE_KEY, { replayId: replay.id });
  }

  private exportSelected(): void {
    const replay = this.selectedReplay();
    if (!replay) return;
    downloadReplayFile(replay.name, this.library.export(replay.id));
    this.statusText.setText("Replay export started.");
  }

  private async importReplay(): Promise<void> {
    const serialized = await chooseReplayFile();
    if (!serialized) return;
    try {
      const replay = this.library.import(serialized);
      this.selectedIndex = this.library.list().findIndex((item) => item.id === replay.id);
      this.statusText.setText("Replay imported.");
      this.refresh();
    } catch {
      this.statusText.setText("Import failed: invalid replay file.");
    }
  }

  private deleteSelected(): void {
    const replay = this.selectedReplay();
    if (!replay) return;
    this.library.delete(replay.id);
    this.statusText.setText("Replay deleted.");
    this.refresh();
  }

  private updatePresentationViewport(): void {
    const { width, height, scale, contentX, contentY } = calculatePresentationViewport(
      this.scale.width,
      this.scale.height,
    );
    this.cameras.main
      .setViewport(0, 0, this.scale.width, this.scale.height)
      .setScroll(0, 0)
      .setZoom(1);
    this.safeAreaBackground.setPosition(0, 0).setSize(width, height);
    this.presentationContainer.setPosition(contentX, contentY).setScale(scale);
  }

  private unbindResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
