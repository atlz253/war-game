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

const CENTER_X = 1920;
const CENTER_Y = 1080;
const PANEL_WIDTH = 1680;
const PANEL_HEIGHT = 1040;
const TITLE_Y = 740;
const STATS_Y = 1000;
const BUTTON_Y = 1320;
const REPLAY_BUTTON_X = 1520;
const MENU_BUTTON_X = 2320;
const BUTTON_WIDTH = 640;
const BUTTON_HEIGHT = 160;
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
