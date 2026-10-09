import { expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Input: {
      Events: {
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
        POINTER_DOWN: "pointerdown",
      },
    },
  },
}));

import type Phaser from "phaser";
import { canvasFixture } from "../../campaigns/canvas-test-fixture";
import { Button } from "./Button";

it("consumes pointer input before a callback can unlock the board", () => {
  const fixture = canvasFixture();
  const stopPropagation = vi.fn();
  const callback = vi.fn(() => expect(stopPropagation).toHaveBeenCalledTimes(1));
  const BUTTON_SIZE = 100;
  const button = new Button(fixture.props as unknown as Phaser.Scene, {
    x: 0,
    y: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    label: "Close",
    onClick: callback,
  });
  button.container.emit("pointerdown", null, 0, 0, { stopPropagation });
  expect(callback).toHaveBeenCalledTimes(1);
});

it("does not repaint a button destroyed by its navigation callback", () => {
  const fixture = canvasFixture();
  const button = new Button(fixture.props as unknown as Phaser.Scene, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    label: "Navigation",
    onClick: () => {
      Object.assign(button.container, { scene: undefined });
    },
  });
  Object.assign(button.container, { scene: fixture.props });
  const label = (button.container as unknown as { list: { setPosition(): void }[] }).list[1];
  if (!label) throw new Error("Missing label");
  const refresh = vi.spyOn(label, "setPosition");
  refresh.mockClear();
  button.container.emit("pointerdown");
  expect(refresh).toHaveBeenCalledTimes(1);
});
