import { describe, expect, it } from "vitest";
import { applyAction } from "../rules/apply-action";
import type { DialogueEvent, MissionDefinition } from "./definition";
import {
  actionSignals,
  emptyJournal,
  initialSignals,
  matchSignal,
  selectionSignal,
} from "./signals";
import { campaign, map, mission } from "./test-fixtures";
import { createMissionState } from "./validation";

const event = (id: string, trigger: DialogueEvent["trigger"]): DialogueEvent => ({
  id,
  type: "dialogue",
  trigger,
  lines: [{ speaker: "Teacher", text: "Hello" }],
});
const lesson: MissionDefinition = {
  ...mission,
  conditions: {
    type: "standard-match-or-reach-cell",
    unit: { type: "any" },
    mapBinding: map.id,
    cell: { x: 2, y: 1 },
  },
  events: [
    event("start", { type: "mission-start" }),
    event("turn1", { type: "turn", number: 1 }),
    event("arrive", {
      type: "unit-arrived",
      unit: { type: "any" },
      cell: { x: 2, y: 1 },
      mapBinding: map.id,
    }),
    event("move", { type: "unit-moved", unit: { type: "any" }, mapBinding: map.id }),
    event("end", { type: "mission-end" }),
  ],
};

it("counts both sides and leaves repeated combat simulations identical with narrative", () => {
  const definition = {
    ...mission,
    events: [
      event("red-turn", { type: "turn", number: 2 }),
      event("blue-turn", { type: "turn", number: 3 }),
    ],
  };
  const run = () => {
    let state = createMissionState(definition, map);
    let journal = emptyJournal();
    for (let boundary = 1; boundary <= 2; boundary++) {
      const accepted = applyAction(state, { type: "end-turn" });
      state = accepted.state;
      for (const signal of actionSignals(accepted))
        journal = matchSignal(definition, journal, signal, boundary);
    }
    return { state, journal };
  };
  const first = run();
  expect(run()).toEqual(first);
  expect(first.journal.occurrences.map((o) => o.eventId)).toEqual(["red-turn", "blue-turn"]);
  const baseline = applyAction(
    applyAction(createMissionState(definition, map), { type: "end-turn" }).state,
    { type: "end-turn" },
  ).state;
  expect(first.state).toEqual(baseline);
});
describe("pure narrative", () => {
  it("journals once in authored order, startup before turn, arrival before ending", () => {
    let journal = emptyJournal();
    const state = createMissionState(lesson, map);
    for (const signal of initialSignals(state)) journal = matchSignal(lesson, journal, signal, 0);
    expect(journal.occurrences.map((o) => o.eventId)).toEqual(["start", "turn1"]);
    const won = applyAction(state, {
      type: "move",
      unitId: "blue-infantry-1",
      destination: { x: 2, y: 1 },
    });
    for (const signal of actionSignals(won)) journal = matchSignal(lesson, journal, signal, 1);
    expect(journal.occurrences.map((o) => o.eventId)).toEqual([
      "start",
      "turn1",
      "arrive",
      "move",
      "end",
    ]);
    expect(matchSignal(lesson, journal, { type: "mission-end", winner: "blue" }, 1)).toEqual(
      journal,
    );
    expect(journal.occurrences.map((o) => o.sequence)).toEqual(
      journal.occurrences.map((_, index) => index),
    );
    expect(emptyJournal().occurrences).toEqual([]);
    expect(won.state.scores).toEqual(state.scores);
    expect(campaign.missions[0]).toEqual(mission);
  });
  it("emits no signals for rejected moves or crossing", () => {
    const state = createMissionState(lesson, map);
    expect(
      actionSignals(
        applyAction(state, { type: "move", unitId: "missing", destination: { x: 2, y: 1 } }),
      ),
    ).toEqual([]);
    const moved = applyAction(state, {
      type: "move",
      unitId: "blue-infantry-1",
      destination: { x: 3, y: 1 },
    });
    const journal = actionSignals(moved).reduce(
      (j, s) => matchSignal(lesson, j, s, 1),
      emptyJournal(),
    );
    expect(journal.occurrences.map((o) => o.eventId)).toEqual(["move"]);
  });
  it("selection is a valid human change, never a combat action", () => {
    const state = createMissionState(lesson, map);
    expect(selectionSignal(state, null, "blue-infantry-1", false)).toEqual({
      type: "unit-selected",
      unitId: "blue-infantry-1",
    });
    expect(selectionSignal(state, "blue-infantry-1", "blue-infantry-1", false)).toBeNull();
    expect(selectionSignal(state, null, "blue-infantry-1", true)).toBeNull();
    expect(selectionSignal(state, null, null, false)).toBeNull();
    expect(selectionSignal(state, null, "missing", false)).toBeNull();
  });
});
