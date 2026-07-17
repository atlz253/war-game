import Phaser from "phaser";

import type { SideId } from "../../core/model/game-state";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { uiTheme } from "../ui/theme/ui-theme";
import { BATTLE_SCENE_KEY, MAIN_MENU_SCENE_KEY } from "./scene-keys";

interface ResultSceneData {
  readonly winner: SideId;
  readonly turn: number;
}

const CENTER_X = 480;
const CENTER_Y = 270;
const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 260;
const TITLE_Y = 185;
const STATS_Y = 250;
const BUTTON_Y = 330;
const REPLAY_BUTTON_X = 380;
const MENU_BUTTON_X = 580;
const BUTTON_WIDTH = 160;
const BUTTON_HEIGHT = 40;
const CENTER_ORIGIN = 0.5;
const HALF_DIMENSION = 2;

export class ResultScene extends Phaser.Scene {
  public constructor() {
    super("result");
  }

  public create(data: ResultSceneData): void {
    this.cameras.main.setBackgroundColor(uiTheme.colors.background);
    new Panel(this, {
      x: CENTER_X - PANEL_WIDTH / HALF_DIMENSION,
      y: CENTER_Y - PANEL_HEIGHT / HALF_DIMENSION,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
    });
    this.add
      .text(CENTER_X, TITLE_Y, `${data.winner.toUpperCase()} VICTORY`, {
        color: uiTheme.colors.text,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.titleSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    this.add
      .text(CENTER_X, STATS_Y, `Turns: ${data.turn}`, {
        color: uiTheme.colors.mutedText,
        fontFamily: uiTheme.font.family,
        fontSize: `${uiTheme.font.normalSize}px`,
      })
      .setOrigin(CENTER_ORIGIN);
    new Button(this, {
      x: REPLAY_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "PLAY AGAIN",
      onClick: () => this.scene.start(BATTLE_SCENE_KEY),
    });
    new Button(this, {
      x: MENU_BUTTON_X,
      y: BUTTON_Y,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      label: "MENU",
      onClick: () => this.scene.start(MAIN_MENU_SCENE_KEY),
    });
  }
}
