import { describe, expect, it } from "vitest";
import type { GameAction } from "../../core/actions/game-actions";
import { createGameStateFromMap, createMapDefinition } from "../../core/maps/map-definition";
import { createReplayTimeline } from "../../core/replay/replay-timeline";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import {
  createRecordedMatch,
  deserializeRecordedMatch,
  serializeRecordedMatch,
} from "../replays/recorded-match";
import { MovementPresenter } from "./MovementPresenter";
import { movementDuration } from "./movement-settings";
import { movementRoute } from "./movement-transition";

const MAP_WIDTH = 4;
const MAP_HEIGHT = 2;
const RED_X = 2;
const COMPLETE_DELTA_MS = 10000;
const INTERMEDIATE_SPEED = 37;
const DEFAULT_SPEED = 50;
const INSTANT_SPEED = 100;
const SLIDER_VALUES = [0, INTERMEDIATE_SPEED, DEFAULT_SPEED, INSTANT_SPEED];
const MAP = {
  ...createMapDefinition("animated-replay", "Animated replay", MAP_WIDTH, MAP_HEIGHT),
  units: [
    { side: "blue" as const, type: "tank" as const, position: { x: 0, y: 0 } },
    { side: "red" as const, type: "infantry" as const, position: { x: RED_X, y: 0 } },
  ],
};
const ATTACK: GameAction = {
  type: "attack",
  unitId: "blue-tank-1",
  targetUnitId: "red-infantry-1",
};
const END: GameAction = { type: "end-turn" };
const ACTIONS: GameAction[] = [
  { type: "move", unitId: "blue-tank-1", destination: { x: 1, y: 0 } },
  ATTACK,
  END,
  END,
  ATTACK,
  END,
  END,
  ATTACK,
];

describe("presentation-independent match outcomes and old replay format", () => {
  it.each(SLIDER_VALUES)(
    "keeps accepted actions, states, scores and result identical at slider %s",
    (value) => {
      const record = createRecordedMatch({
        id: "animation-test",
        name: "Animation test",
        savedAt: "2026-10-09T00:00:00.000Z",
        mapDefinition: MAP,
        matchConfiguration: createDefaultMatchConfiguration(),
        actions: ACTIONS,
      });
      const restored = deserializeRecordedMatch(serializeRecordedMatch(record));
      const timeline = createReplayTimeline(
        () => createGameStateFromMap(MAP),
        restored.replay.actions,
      );
      let displayed = timeline.frames[0]?.state;
      const presentedActions: GameAction[] = [];
      const presenter = new MovementPresenter(
        {
          render: (state) => {
            displayed = state;
          },
          position: () => {},
          clear: () => {},
          settled: () => {},
        },
        () => movementDuration(value),
      );
      for (let index = 1; index < timeline.frames.length; index++) {
        const before = timeline.frames[index - 1]?.state;
        const frame = timeline.frames[index];
        if (!before || !frame?.action) throw Error("fixture frame missing");
        const action = frame.action;
        presenter.enqueue({
          before,
          after: frame.state,
          route: movementRoute(before, action, true),
          complete: () => presentedActions.push(action),
        });
      }
      while (presenter.busy) presenter.update(COMPLETE_DELTA_MS);
      expect(presentedActions).toEqual(ACTIONS);
      expect(displayed).toEqual(timeline.finalState);
      expect(displayed?.winner).toBe("blue");
      expect(displayed?.scores.blue).toBeGreaterThan(0);
      expect(restored.schemaVersion).toBe(1);
    },
  );
});
