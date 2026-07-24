import { describe, expect, it } from "vitest";

import { BattleAiPauseController } from "./battle-ai-pause-controller";

const AI_DECISION = { actionId: "ai-order" };

describe("BattleAiPauseController", () => {
  it("reschedules an AI delay that was pending when the game was paused", () => {
    const controller = new BattleAiPauseController<typeof AI_DECISION>();

    controller.beginDelay();

    expect(controller.pause().cancelDelay).toBe(true);
    expect(controller.resume()).toEqual({ kind: "start-delay" });
  });

  it("defers an AI decision that resolves while the game is paused", () => {
    const controller = new BattleAiPauseController<typeof AI_DECISION>();

    controller.pause();

    expect(controller.receiveDecision(AI_DECISION)).toEqual({ kind: "defer" });
    expect(controller.resume()).toEqual({ kind: "apply", decision: AI_DECISION });
  });

  it("discards an AI decision after leaving for the main menu", () => {
    const controller = new BattleAiPauseController<typeof AI_DECISION>();

    controller.pause();
    controller.exit();

    expect(controller.receiveDecision(AI_DECISION)).toEqual({ kind: "discard" });
    expect(controller.resume()).toEqual({ kind: "none" });
  });
});
