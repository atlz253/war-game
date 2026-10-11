import { describe, expect, it } from "vitest";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import {
  MAIN_MENU_ENTRIES,
  type MainMenuSceneData,
  menuReturnData,
  menuView,
} from "./menu-navigation";

describe("menu navigation", () => {
  it("orders the six entry points and identifies submenu destinations", () => {
    expect(MAIN_MENU_ENTRIES.map((entry) => entry.id)).toEqual([
      "campaigns",
      "quick-match",
      "multiplayer",
      "replays",
      "map-editor",
      "settings",
    ]);
    expect(MAIN_MENU_ENTRIES.filter((entry) => entry.view).map((entry) => entry.view)).toEqual([
      "quick-match",
      "multiplayer",
      "settings",
    ]);
  });
  it("defaults to root and carries pending setup to every menu view", () => {
    const data: MainMenuSceneData = {
      selectedMapKey: "local:pending",
      matchConfiguration: createDefaultMatchConfiguration(),
    };
    expect(menuView(data)).toBe("main");
    for (const view of ["main", "quick-match", "multiplayer", "settings"] as const) {
      expect(menuReturnData(data, view)).toEqual({ ...data, view });
      expect(menuView(menuReturnData(data, view))).toBe(view);
    }
    expect(data).not.toHaveProperty("view");
  });
});
