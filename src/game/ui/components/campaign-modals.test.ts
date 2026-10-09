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
import { mission } from "../../../core/campaigns/test-fixtures";
import { canvasFixture } from "../../campaigns/canvas-test-fixture";
import { MissionDialogueController } from "../../campaigns/dialogue-controller";
import { CampaignModal } from "./CampaignModal";
import { CanvasTextDialog } from "./CanvasTextDialog";

it("consumes modal pointer input and advances one line with explicit controls", () => {
  const fixture = canvasFixture();
  const resumed = vi.fn();
  const controller = new MissionDialogueController(
    {
      ...mission,
      events: [
        {
          id: "e",
          type: "dialogue",
          trigger: { type: "mission-start" },
          lines: [
            { speaker: "A", text: "One" },
            { speaker: "B", text: "Two" },
          ],
        },
      ],
    },
    resumed,
  );
  controller.signal({ type: "mission-start" }, 0);
  controller.present();
  const modal = new CampaignModal(fixture.props as unknown as Phaser.Scene, controller);
  const root = modal.container as unknown as Parameters<typeof fixture.click>[0];
  const consumed = vi.fn();
  root.list[0]?.emit("pointerdown", null, 0, 0, { stopPropagation: consumed });
  expect(consumed).toHaveBeenCalledTimes(1);
  fixture.click(root, "NEXT / CLOSE");
  expect(controller.current?.speaker).toBe("B");
  fixture.click(root, "NEXT / CLOSE");
  expect(resumed).toHaveBeenCalledTimes(1);
});
it("edits multiline Unicode and releases keyboard focus on close", () => {
  const fixture = canvasFixture();
  const confirm = vi.fn();
  const close = vi.fn();
  const dialog = new CanvasTextDialog(
    fixture.props as unknown as Phaser.Scene,
    "Dialogue",
    "Я",
    true,
    confirm,
    close,
  );
  const state = dialog as unknown as { keydown(event: Partial<KeyboardEvent>): void };
  for (const key of ["Enter", "Ю"])
    state.keydown({ key, preventDefault: vi.fn(), stopPropagation: vi.fn() });
  const root = dialog.container as unknown as Parameters<typeof fixture.click>[0];
  fixture.click(root, "SAVE TEXT");
  expect(confirm).toHaveBeenCalledWith("Я\nЮ");
  expect(close).toHaveBeenCalledTimes(1);
  dialog.destroy();
  expect(fixture.props.input.keyboard.off).toHaveBeenCalled();
});
