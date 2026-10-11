const NAVIGATION_ROUNDS = 3;

import { expect, it } from "vitest";
import { MENU_BATTLE_FOREGROUNDS, MenuBattleLifecycle } from "./menu-battle-lifecycle";

it("starts once and retains a session through every menu and activity round trip", () => {
  const lifecycle = new MenuBattleLifecycle();
  expect(lifecycle.reconcile(["boot"])).toEqual({ start: false, active: false });
  for (let repeat = 0; repeat < NAVIGATION_ROUNDS; repeat++) {
    for (const key of MENU_BATTLE_FOREGROUNDS) {
      expect(lifecycle.reconcile([key]).start).toBe(repeat === 0 && key === "main-menu");
      expect(lifecycle.reconcile([key]).active).toBe(true);
      // Foreground self restart / handoff is evaluated by destination membership.
      expect(lifecycle.reconcile([key, key]).start).toBe(false);
    }
    for (const key of ["battle", "result", "map-editor", "campaign-editor", "replay"]) {
      expect(lifecycle.reconcile([key])).toEqual({ start: false, active: false });
      expect(lifecycle.reconcile(["main-menu"])).toEqual({ start: false, active: true });
    }
  }
  expect(new MenuBattleLifecycle().reconcile(["main-menu"]).start).toBe(true);
});
