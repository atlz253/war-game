import { expect, it, vi } from "vitest";
import { menuBattleUi } from "../ui/theme/menu-battle-ui";
import { uiTheme } from "../ui/theme/ui-theme";
import { configureMenuBackdrop } from "./menu-backdrop";

it("changes only supported foreground backdrop and panels, releases resize listener", () => {
  const background = {
    type: "Rectangle",
    fillColor: uiTheme.colors.background,
    setFillStyle: vi.fn(),
  };
  const panel = { type: "Rectangle", fillColor: uiTheme.colors.panel, setFillStyle: vi.fn() };
  const field = { type: "Rectangle", fillColor: uiTheme.colors.background, setFillStyle: vi.fn() };
  let shutdown!: () => void;
  const scene = {
    children: { list: [background, { list: [panel, field] }] },
    cameras: { main: { setBackgroundColor: vi.fn() } },
    scale: { on: vi.fn(), off: vi.fn() },
    events: {
      once: (_name: string, callback: () => void) => {
        shutdown = callback;
      },
    },
  };
  configureMenuBackdrop(scene as never);
  expect(background.setFillStyle).toHaveBeenCalledWith(
    uiTheme.colors.background,
    menuBattleUi.dimAlpha,
  );
  expect(panel.setFillStyle).toHaveBeenCalledWith(uiTheme.colors.panel, menuBattleUi.panelAlpha);
  expect(field.setFillStyle).not.toHaveBeenCalled();
  expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith("rgba(0,0,0,0)");
  shutdown();
  expect(scene.scale.off).toHaveBeenCalled();
});
