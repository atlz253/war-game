import { expect, it } from "vitest";
import { mission } from "../../core/campaigns/test-fixtures";
import { ReplayDialogue } from "./replay-dialogue";

it("shows recorded boundaries once per forward traversal and cancels on seek", () => {
  const definition = {
    ...mission,
    events: [
      {
        id: "e",
        type: "dialogue" as const,
        trigger: { type: "mission-start" as const },
        lines: [{ speaker: "Teacher", text: "Recorded" }],
      },
    ],
  };
  const replay = new ReplayDialogue({
    campaignId: "c",
    campaignName: "C",
    mission: definition,
    occurrences: [
      { eventId: "e", sequence: 0, afterActionCount: 1, signal: { type: "mission-start" } },
    ],
  });
  replay.forward(1);
  expect(replay.controller.current?.text).toBe("Recorded");
  replay.seek(0);
  expect(replay.controller.blocked).toBe(false);
  replay.forward(1);
  expect(replay.controller.current?.text).toBe("Recorded");
  replay.controller.next();
  replay.forward(1);
  expect(replay.controller.blocked).toBe(false);
});
