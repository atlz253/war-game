import type Phaser from "phaser";
import type { GameState } from "../../core/model/game-state";
import { getCapturableControlPointId } from "../input/capture-availability";
import { displayToken } from "../localization/display-tokens";
import { t } from "../localization/runtime";
import { Button } from "../ui/components/Button";
import { Panel } from "../ui/components/Panel";
import { ProgressBar } from "../ui/components/ProgressBar";
import { uiTheme } from "../ui/theme/ui-theme";
import { formatSelectedUnit } from "./battle-view-helpers";

export const HUD_X = 3104;
export const HUD_WIDTH = 704;
export const TOP_PANEL_Y = 56;
const TOP_PANEL_HEIGHT = 300;
export const SELECTED_PANEL_Y = 388;
export const SELECTED_PANEL_HEIGHT = 480;
const PANEL_CONTENT_X = HUD_X + uiTheme.spacing.md;
const TOP_TEXT_OFFSET = 128;
const TOP_TEXT_Y = TOP_PANEL_Y + TOP_TEXT_OFFSET;
const SCORE_TEXT_OFFSET_X = 384;
const SCORE_TEXT_X = HUD_X + SCORE_TEXT_OFFSET_X;
const SCORE_TEXT_Y = TOP_PANEL_Y + uiTheme.spacing.sm;
const SELECTED_TEXT_OFFSET = 128;
const SELECTED_TEXT_Y = SELECTED_PANEL_Y + SELECTED_TEXT_OFFSET;
const SELECTED_HEALTH_BAR_OFFSET = 264;
const SELECTED_HEALTH_BAR_Y = SELECTED_PANEL_Y + SELECTED_HEALTH_BAR_OFFSET;
const SELECTED_HEALTH_BAR_WIDTH = 256;
const SELECTED_HEALTH_BAR_HEIGHT = 32;
const END_BUTTON_X = 3652;
const END_BUTTON_Y = 292;
const WAIT_BUTTON_X = 3392;
const WAIT_BUTTON_Y = 292;
const BUTTON_WIDTH = 224;
const BUTTON_HEIGHT = 96;
const CAPTURE_BUTTON_WIDTH = 448;
const CAPTURE_BUTTON_OFFSET_Y = 388;
const CAPTURE_BUTTON_X = HUD_X + HUD_WIDTH / 2;
const CAPTURE_BUTTON_Y = SELECTED_PANEL_Y + CAPTURE_BUTTON_OFFSET_Y;
export function createBattleHud(
  scene: Phaser.Scene,
  hudContainer: Phaser.GameObjects.Container,
  orders: { wait: () => void; end: () => void; capture: () => void },
) {
  const turnPanel = new Panel(scene, {
    x: HUD_X,
    y: TOP_PANEL_Y,
    width: HUD_WIDTH,
    height: TOP_PANEL_HEIGHT,
    title: t("battle-hud.turn"),
  });
  const selectedPanel = new Panel(scene, {
    x: HUD_X,
    y: SELECTED_PANEL_Y,
    width: HUD_WIDTH,
    height: SELECTED_PANEL_HEIGHT,
    title: t("battle-hud.selected.unit"),
  });
  const activeTurnText = addText(scene, PANEL_CONTENT_X, TOP_TEXT_Y, "");
  const scoreText = addScoreText(scene, SCORE_TEXT_X, SCORE_TEXT_Y, "");
  const selectedUnitText = addText(
    scene,
    PANEL_CONTENT_X,
    SELECTED_TEXT_Y,
    t("battle-hud.select.a.blue.unit"),
  );
  const goalText = addText(
    scene,
    PANEL_CONTENT_X,
    SELECTED_PANEL_Y + SELECTED_PANEL_HEIGHT + uiTheme.spacing.md,
    "",
  );
  const healthBar = new ProgressBar(scene, {
    x: PANEL_CONTENT_X,
    y: SELECTED_HEALTH_BAR_Y,
    width: SELECTED_HEALTH_BAR_WIDTH,
    height: SELECTED_HEALTH_BAR_HEIGHT,
    color: uiTheme.colors.primary,
  });
  const waitButton = new Button(scene, {
    x: WAIT_BUTTON_X,
    y: WAIT_BUTTON_Y,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    label: t("battle-hud.wait"),
    onClick: orders.wait,
  });
  const endTurnButton = new Button(scene, {
    x: END_BUTTON_X,
    y: END_BUTTON_Y,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    label: t("battle-hud.end.turn"),
    onClick: orders.end,
  });
  const captureButton = new Button(scene, {
    x: CAPTURE_BUTTON_X,
    y: CAPTURE_BUTTON_Y,
    width: CAPTURE_BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    label: t("battle-hud.capture.point"),
    onClick: orders.capture,
  });
  hudContainer.add([
    turnPanel.container,
    selectedPanel.container,
    activeTurnText,
    scoreText,
    selectedUnitText,
    goalText,
    healthBar.container,
    waitButton.container,
    endTurnButton.container,
    captureButton.container,
  ]);
  return {
    activeTurnText,
    scoreText,
    selectedUnitText,
    goalText,
    healthBar,
    waitButton,
    endTurnButton,
    captureButton,
  };
}
function addText(scene: Phaser.Scene, x: number, y: number, text: string): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    color: uiTheme.colors.text,
    fontFamily: uiTheme.font.family,
    fontSize: `${uiTheme.font.normalSize}px`,
  });
}

export function updateBattleHud(
  hud: ReturnType<typeof createBattleHud>,
  state: GameState,
  selectedId: string | null,
  human: boolean,
  canIssueOrders: boolean,
  suffix: string,
): void {
  const selected = selectedId ? state.units[selectedId] : undefined;
  const policy = state.victoryPolicy;
  const goal =
    policy?.type === "standard-match-or-reach-cell"
      ? t("battle-hud.goal", { value1: String(policy.cell.x), value2: String(policy.cell.y) })
      : "";
  hud.activeTurnText.setText(
    t("battle-hud.turn.2", {
      value1: String(state.turn),
      value2: String(displayToken(state.activeSide)),
      value3: String(suffix),
    }),
  );
  hud.goalText.setText(goal.trim());
  hud.scoreText.setText(t("battle-hud.scores", { blue: state.scores.blue, red: state.scores.red }));
  hud.selectedUnitText.setText(formatSelectedUnit(state, selected, state.activeSide, human));
  hud.healthBar.setValue(selected?.health ?? 0, selected?.maxHealth ?? 0);
  hud.waitButton.setEnabled(
    canIssueOrders && selected !== undefined && !selected.hasTakenMainAction,
  );
  hud.endTurnButton.setEnabled(canIssueOrders);
  hud.captureButton.setEnabled(
    canIssueOrders && getCapturableControlPointId(state, selectedId, false) !== null,
  );
}

function addScoreText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    color: uiTheme.colors.mutedText,
    fontFamily: uiTheme.font.family,
    fontSize: `${uiTheme.font.smallSize}px`,
  });
}
