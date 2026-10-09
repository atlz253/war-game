import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: {} }));
const slider = vi.hoisted(() => ({ container: {}, refresh: vi.fn(), blur: vi.fn() }));
vi.mock("./MovementSlider", () => ({
  MovementSlider: class {
    container = slider.container;
    refresh = slider.refresh;
    blur = slider.blur;
  },
}));
vi.mock("./Button", () => ({
  Button: class {
    container = {};
  },
}));
vi.mock("./Panel", () => ({
  Panel: class {
    container = {};
  },
}));

import { getPauseMenuActions, PauseMenu } from "./PauseMenu";

describe("getPauseMenuActions", () => {
  const onResume = vi.fn();
  const onExit = vi.fn();

  it("omits the event log action when no callback was supplied", () => {
    expect(getPauseMenuActions({ onResume, onExit }).map((action) => action.label)).toEqual([
      "RETURN TO GAME",
      "MAIN MENU",
    ]);
  });

  it("includes the event log action when a callback was supplied", () => {
    expect(
      getPauseMenuActions({ onResume, onExit, onShowEventLog: vi.fn() }).map(
        (action) => action.label,
      ),
    ).toEqual(["RETURN TO GAME", "EVENT LOG", "MAIN MENU"]);
  });
  it("includes the Canvas slider and refreshes on open and blurs on close", () => {
    const display = {
      visible: false,
      add: vi.fn(),
      setScrollFactor: () => display,
      setOrigin: () => display,
      setInteractive: () => display,
      setVisible: (visible: boolean) => {
        display.visible = visible;
        return display;
      },
    };
    const scene = {
      add: { rectangle: () => display, container: () => display, text: () => display },
    } as unknown as Phaser.Scene;
    const menu = new PauseMenu(scene, { onResume, onExit, onShowEventLog: vi.fn() });
    expect(display.add.mock.calls[0]?.[0]).toContain(slider.container);
    menu.open();
    expect(slider.refresh).toHaveBeenCalledTimes(1);
    expect(menu.isOpen).toBe(true);
    menu.close();
    expect(slider.blur).toHaveBeenCalledTimes(1);
    expect(menu.isOpen).toBe(false);
  });
});
