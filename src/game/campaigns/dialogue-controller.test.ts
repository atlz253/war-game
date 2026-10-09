import { expect, it } from "vitest";
import { mission } from "../../core/campaigns/test-fixtures";
import { MissionDialogueController } from "./dialogue-controller";

it("preserves lines through pause and calls continuation once; disposal invalidates callbacks", () => {
  const lesson = {
    ...mission,
    events: [
      {
        id: "start",
        type: "dialogue" as const,
        trigger: { type: "mission-start" as const },
        lines: [
          { speaker: "A", text: "One" },
          { speaker: "B", text: "Two" },
        ],
      },
    ],
  };
  let resumed = 0;
  const controller = new MissionDialogueController(lesson, () => resumed++);
  controller.signal({ type: "mission-start" }, 0);
  expect(controller.blocked).toBe(true);
  controller.present();
  controller.next();
  controller.pause(true);
  controller.next();
  expect(controller.current?.text).toBe("Two");
  controller.pause(false);
  controller.next();
  controller.next();
  expect(resumed).toBe(1);
  controller.dispose();
  controller.signal({ type: "mission-start" }, 0);
  expect(controller.blocked).toBe(false);
});
