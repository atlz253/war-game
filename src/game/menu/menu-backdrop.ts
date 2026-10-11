import type Phaser from "phaser";
import { menuBattleUi } from "../ui/theme/menu-battle-ui";
import { uiTheme } from "../ui/theme/ui-theme";

interface BackdropObject {
  readonly type?: string;
  readonly fillColor?: number;
  readonly list?: readonly BackdropObject[];
  setFillStyle?(color: number, alpha: number): unknown;
}

/** Called after supported foreground creation, never for gameplay/editor scenes. */
export function configureMenuBackdrop(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
  const roots = scene.children.list as BackdropObject[];
  const safeArea = roots.find(
    (object) => object.type === "Rectangle" && object.fillColor === uiTheme.colors.background,
  );
  let dim: Phaser.GameObjects.Rectangle | undefined;
  if (safeArea) safeArea.setFillStyle?.(uiTheme.colors.background, menuBattleUi.dimAlpha);
  else {
    dim = scene.add
      .rectangle(
        0,
        0,
        scene.scale.width,
        scene.scale.height,
        uiTheme.colors.background,
        menuBattleUi.dimAlpha,
      )
      .setOrigin(0)
      .setScrollFactor(0);
    scene.children.sendToBack(dim);
  }
  setPanelOpacity(roots);
  const resize = () => dim?.setSize(scene.scale.width, scene.scale.height);
  scene.scale.on("resize", resize);
  scene.events.once("shutdown", () => scene.scale.off("resize", resize));
}

function setPanelOpacity(objects: readonly BackdropObject[]): void {
  for (const object of objects) {
    if (object.type === "Rectangle" && object.fillColor === uiTheme.colors.panel)
      object.setFillStyle?.(uiTheme.colors.panel, menuBattleUi.panelAlpha);
    if (object.list) setPanelOpacity(object.list);
  }
}
