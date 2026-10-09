import Phaser from "phaser";

import type { MapDefinition } from "../../core/maps/map-definition";
import type { SideId } from "../../core/model/game-state";
import { advanceRun, type CampaignRun, launchMission } from "../campaigns/playthrough";
import { GAME_CANVAS_BACKGROUND_COLOR } from "../config/game-config";
import { calculatePresentationViewport } from "../config/presentation-layout";
import {
  createDefaultMatchConfiguration,
  type MatchConfiguration,
} from "../match/match-configuration";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { uiTheme } from "../ui/theme/ui-theme";
import { BATTLE_SCENE_KEY, MAIN_MENU_SCENE_KEY, REPLAY_SCENE_KEY } from "./scene-keys";

interface ResultSceneData {
  readonly campaignRun?: CampaignRun;
  readonly winner: SideId;
  readonly turn: number;
  readonly matchConfiguration?: MatchConfiguration;
  readonly mapDefinition?: MapDefinition;
  readonly replayId?: string;
}

const CENTER_X = 1920;
const CENTER_Y = 1080;
const PANEL_WIDTH = 1680;
const PANEL_HEIGHT = 1040;
const TITLE_Y = 740;
const STATS_Y = 1000;
const BUTTON_Y = 1320;
const REPLAY_BUTTON_X = 1200;
const WATCH_BUTTON_X = 1920;
const MENU_BUTTON_X = 2640;
const BUTTON_WIDTH = 560;
const BUTTON_HEIGHT = 160;
const CENTER_ORIGIN = 0.5;
const HALF_DIMENSION = 2;

export class ResultScene extends Phaser.Scene {
  private safeAreaBackground!: Phaser.GameObjects.Rectangle;
  private presentationContainer!: Phaser.GameObjects.Container;

  public constructor() {
    super("result");
  }

  public create(data: ResultSceneData): void {
    const continued = data.campaignRun ? advanceRun(data.campaignRun, data.winner) : undefined;
    const matchConfiguration = data.matchConfiguration ?? createDefaultMatchConfiguration();
    const panel = new Panel(this, {
      x: CENTER_X - PANEL_WIDTH / HALF_DIMENSION,
      y: CENTER_Y - PANEL_HEIGHT / HALF_DIMENSION,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
    });
    const title = this.add
      .text(
        CENTER_X,
        TITLE_Y,
        continued?.complete ? "CAMPAIGN COMPLETE" : `${data.winner.toUpperCase()} VICTORY`,
        {
          color: uiTheme.colors.text,
          fontFamily: uiTheme.font.family,
          fontSize: `${uiTheme.font.titleSize}px`,
        },
      )
      .setOrigin(CENTER_ORIGIN);
    const stats = this.add
      .text(CENTER_X, STATS_Y, `Turns: ${data.turn}`, {
        color: uiTheme.colors.mutedText,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    const replayButton = new Button(this, {
      x: REPLAY_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: continued
        ? continued.complete
          ? "COMPLETE"
          : data.winner === "blue"
            ? "NEXT MISSION"
            : "RETRY"
        : "PLAY AGAIN",
      enabled: !continued?.complete,
      onClick: () =>
        this.scene.start(
          BATTLE_SCENE_KEY,
          continued
            ? launchMission(continued)
            : {
                matchConfiguration,
                mapDefinition: data.mapDefinition,
              },
        ),
    });
    const menuButton = new Button(this, {
      x: MENU_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "MENU",
      onClick: () => this.scene.start(MAIN_MENU_SCENE_KEY),
    });
    const watchButton = new Button(this, {
      x: WATCH_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "WATCH REPLAY",
      enabled: Boolean(data.replayId),
      onClick: () => this.scene.start(REPLAY_SCENE_KEY, { replayId: data.replayId }),
    });

    this.cameras.main.setBackgroundColor(GAME_CANVAS_BACKGROUND_COLOR);
    this.safeAreaBackground = this.add
      .rectangle(0, 0, 0, 0, uiTheme.colors.background)
      .setOrigin(0);
    this.presentationContainer = this.add.container(0, 0, [
      panel.container,
      title,
      stats,
      replayButton.container,
      watchButton.container,
      menuButton.container,
    ]);
    this.updatePresentationViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unbindPresentationResize, this);
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

  private unbindPresentationResize(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.updatePresentationViewport, this);
  }
}
