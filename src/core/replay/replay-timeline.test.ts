import { describe, expect, it } from "vitest";

import type { GameAction } from "../actions/game-actions";
import { applyAction } from "../rules/apply-action";
import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { createReplayTimeline } from "./replay-timeline";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const FRAME_COUNT_WITH_MOVE_AND_TURN_END = 3;
const MOVE_ACTION: GameAction = {
  type: "move",
  unitId: BLUE_INFANTRY_ID,
  destination: { x: 2, y: 1 },
};

describe("createReplayTimeline", () => {
  it("stores deterministic states and ordered events for every accepted action", () => {
    const initialState = createSkirmishGameState();
    const timeline = createReplayTimeline(() => initialState, [MOVE_ACTION, { type: "end-turn" }]);

    expect(timeline.frames).toHaveLength(FRAME_COUNT_WITH_MOVE_AND_TURN_END);
    expect(timeline.frames[0]?.state).toBe(initialState);
    expect(timeline.frames[1]?.action).toEqual(MOVE_ACTION);
    expect(timeline.frames[1]?.events.map((event) => event.type)).toEqual(["unit-moved"]);
    expect(timeline.frames[2]?.events.map((event) => event.type)).toEqual(["turn-ended"]);
    expect(timeline.finalState).toEqual(
      applyAction(applyAction(initialState, MOVE_ACTION).state, { type: "end-turn" }).state,
    );
  });

  it("rejects a corrupted action without accepting a partial timeline", () => {
    const invalidAction: GameAction = {
      type: "move",
      unitId: BLUE_INFANTRY_ID,
      destination: { x: 99, y: 99 },
    };

    expect(() => createReplayTimeline(createSkirmishGameState, [invalidAction])).toThrow(
      "Replay action was rejected: move",
    );
  });
});
