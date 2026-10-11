import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
import { installMenuBattle } from "./install-menu-battle";

vi.mock("./menu-backdrop", () => ({ configureMenuBackdrop: vi.fn() }));

it("suspends at activity creation before the next frame and releases subscriptions", () => {
  const scenes = ["main-menu", "language", "battle", "menu-background-battle"].map((key) => ({
    sys: { settings: { key } },
    events: new EventEmitter(),
  }));
  const background = { setMenuActive: vi.fn() };
  let active = false;
  let foreground = "main-menu";
  const game = {
    events: new EventEmitter(),
    scene: {
      scenes,
      run: vi.fn(() => {
        active = true;
      }),
      isActive: () => active,
      getScene: () => background,
      sendToBack: vi.fn(),
      getScenes: () => scenes.filter((s) => s.sys.settings.key === foreground),
    },
  };
  installMenuBattle(game as never);
  game.events.emit("prestep");
  expect(game.scene.run).toHaveBeenCalledOnce();
  foreground = "battle";
  const battle = scenes.find((scene) => scene.sys.settings.key === foreground);
  battle?.events.emit("create", battle);
  expect(background.setMenuActive).toHaveBeenLastCalledWith(false);
  foreground = "language";
  const language = scenes.find((scene) => scene.sys.settings.key === foreground);
  language?.events.emit("create", language);
  game.events.emit("prestep");
  expect(background.setMenuActive).toHaveBeenLastCalledWith(true);
  expect(game.scene.run).toHaveBeenCalledOnce();
  game.events.emit("destroy");
  expect(game.events.listenerCount("prestep")).toBe(0);
  expect(scenes.every((scene) => scene.events.listenerCount("create") === 0)).toBe(true);
});
