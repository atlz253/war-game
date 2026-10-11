const DESKTOP_WIDTH = 1920;
const DESKTOP_HEIGHT = 1080;
const TALL_WIDTH = 800;
const TALL_HEIGHT = 1200;
const WIDE_WIDTH = 3200;
const WIDE_HEIGHT = 600;
const SMALL_WIDTH = 640;
const SMALL_HEIGHT = 360;
const LAYOUT_EPSILON = 0.001;

import { expect, it } from "vitest";
import { MENU_BATTLE_CONFIG } from "../../core/menu-battle/menu-battle";
import { menuBattleLayout } from "./menu-battle-layout";

it.each([
  [DESKTOP_WIDTH, DESKTOP_HEIGHT],
  [TALL_WIDTH, TALL_HEIGHT],
  [WIDE_WIDTH, WIDE_HEIGHT],
  [SMALL_WIDTH, SMALL_HEIGHT],
])("covers %s by %s without revealing deployment", (width, height) => {
  const layout = menuBattleLayout(width, height, MENU_BATTLE_CONFIG);
  expect(layout.left).toBeGreaterThanOrEqual(MENU_BATTLE_CONFIG.stripWidth * layout.tileSize);
  expect(layout.left + width / layout.zoom).toBeLessThanOrEqual(
    (MENU_BATTLE_CONFIG.stripWidth + MENU_BATTLE_CONFIG.visibleWidth) * layout.tileSize +
      LAYOUT_EPSILON,
  );
  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.top + height / layout.zoom).toBeLessThanOrEqual(
    MENU_BATTLE_CONFIG.height * layout.tileSize + LAYOUT_EPSILON,
  );
});

it("keeps edge combat visible inside the central rectangle on extreme crops", () => {
  const focus = { x: 8, y: 0 };
  const layout = menuBattleLayout(WIDE_WIDTH, WIDE_HEIGHT, MENU_BATTLE_CONFIG, focus);
  expect(layout.top).toBe(0);
  const tall = menuBattleLayout(TALL_WIDTH, TALL_HEIGHT, MENU_BATTLE_CONFIG, { x: 15, y: 4 });
  expect(tall.left + TALL_WIDTH / tall.zoom).toBeLessThanOrEqual(
    (MENU_BATTLE_CONFIG.stripWidth + MENU_BATTLE_CONFIG.visibleWidth) * tall.tileSize +
      LAYOUT_EPSILON,
  );
});
