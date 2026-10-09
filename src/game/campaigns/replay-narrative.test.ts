import { expect, it } from "vitest";
import type { GameAction } from "../../core/actions/game-actions";
import { getBuiltInCampaigns } from "../../core/campaigns/built-in-campaigns";
import type { DialogueEvent } from "../../core/campaigns/definition";
import {
  actionSignals,
  emptyJournal,
  initialSignals,
  matchSignal,
} from "../../core/campaigns/signals";
import { map as fixtureMap, mission as fixtureMission } from "../../core/campaigns/test-fixtures";
import { createMissionState } from "../../core/campaigns/validation";
import { applyAction } from "../../core/rules/apply-action";
import { getBuiltInMap } from "../../core/scenarios/built-in-maps";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import {
  createRecordedMatch,
  deserializeRecordedMatch,
  recordedInitialState,
  serializeRecordedMatch,
} from "../replays/recorded-match";

it("validates selection boundaries, action sources, sequence and snapshot policy", () => {
  const map = fixtureMap;
  const mission = {
    ...fixtureMission,
    conditions: { ...fixtureMission.conditions, cell: { x: 2, y: 1 } },
    events: [
      {
        id: "start",
        type: "dialogue",
        trigger: { type: "mission-start" },
        lines: [{ speaker: "A", text: "Start" }],
      },
      {
        id: "select",
        type: "dialogue",
        trigger: { type: "unit-selected", unit: { type: "any" }, mapBinding: map.id },
        lines: [{ speaker: "A", text: "Select" }],
      },
      {
        id: "end",
        type: "dialogue",
        trigger: { type: "mission-end" },
        lines: [{ speaker: "A", text: "End" }],
      },
    ] as DialogueEvent[],
  };
  const initial = createMissionState(mission, map);
  let journal = emptyJournal();
  for (const signal of initialSignals(initial)) journal = matchSignal(mission, journal, signal, 0);
  journal = matchSignal(mission, journal, { type: "unit-selected", unitId: "blue-infantry-1" }, 0);
  const action: GameAction = {
    type: "move",
    unitId: "blue-infantry-1",
    destination: { x: 2, y: 1 },
  };
  for (const signal of actionSignals(applyAction(initial, action)))
    journal = matchSignal(mission, journal, signal, 1);
  const record = createRecordedMatch({
    id: "sources",
    name: "Sources",
    savedAt: "2026-10-10",
    mapDefinition: map,
    matchConfiguration: createDefaultMatchConfiguration(),
    actions: [action],
    narrative: { campaignId: "c", campaignName: "C", mission, occurrences: journal.occurrences },
  });
  expect(deserializeRecordedMatch(serializeRecordedMatch(record))).toEqual(record);
  const mutations = [
    { ...record, victoryPolicy: { type: "unknown" } },
    { ...record, victoryPolicy: { type: "standard-match" } },
    ...[
      { sequence: 9 },
      { afterActionCount: 2 },
      { signal: { type: "unit-selected", unitId: "missing" } },
      { signal: { type: "mission-end", winner: "red" } },
    ].map((patch) => ({
      ...record,
      narrative: {
        ...record.narrative,
        occurrences: journal.occurrences.map((occurrence, index) =>
          index === 1 ? { ...occurrence, ...patch } : occurrence,
        ),
      },
    })),
  ];
  for (const changed of mutations)
    expect(() => deserializeRecordedMatch(JSON.stringify(changed))).toThrow();
});

it("takes deep map, participant and action snapshots at record creation", () => {
  const map = structuredClone(fixtureMap);
  const mission = {
    ...fixtureMission,
    conditions: {
      type: "standard-match-or-reach-cell" as const,
      unit: { type: "any" as const },
      cell: { x: 2, y: 1 },
      mapBinding: map.id,
    },
  };
  const configuration = createDefaultMatchConfiguration();
  const action = { type: "move" as const, unitId: "blue-infantry-1", destination: { x: 2, y: 1 } };
  const record = createRecordedMatch({
    id: "snapshot",
    name: "Snapshot",
    savedAt: "2026-10-10",
    mapDefinition: map,
    matchConfiguration: configuration,
    actions: [action],
    narrative: { campaignId: "c", campaignName: "C", mission, occurrences: [] },
  });
  const placement = map.units[0];
  if (!placement) throw new Error("Missing fixture unit");
  placement.position.x = 1;
  action.destination.x = 1;
  expect(record.mapDefinition.units[0]?.position.x).toBe(0);
  expect(record.replay.actions[0]).toMatchObject({ destination: { x: 2, y: 1 } });
  expect(record.matchConfiguration).not.toBe(configuration);
});

it("replays a completed tutorial from snapshots and rejects duplicate/incorrect occurrences", () => {
  const campaign = getBuiltInCampaigns()[0];
  const mission = campaign?.missions[0];
  const map = getBuiltInMap("tutorial-movement-12x5");
  if (!mission || !map || !campaign) throw new Error("Missing lesson");
  let state = createMissionState(mission, map);
  let journal = emptyJournal();
  for (const signal of initialSignals(state)) journal = matchSignal(mission, journal, signal, 0);
  const actions: GameAction[] = [
    { type: "move", unitId: "blue-infantry-1", destination: { x: 4, y: 2 } },
    { type: "end-turn" },
    { type: "end-turn" },
    { type: "move", unitId: "blue-infantry-1", destination: { x: 8, y: 2 } },
    { type: "end-turn" },
    { type: "end-turn" },
    { type: "move", unitId: "blue-infantry-1", destination: { x: 11, y: 2 } },
  ];
  actions.forEach((action, index) => {
    const result = applyAction(state, action);
    state = result.state;
    for (const signal of actionSignals(result))
      journal = matchSignal(mission, journal, signal, index + 1);
  });
  const recorded = createRecordedMatch({
    id: "lesson",
    name: "Lesson",
    savedAt: "2026-10-09",
    mapDefinition: map,
    matchConfiguration: createDefaultMatchConfiguration(),
    actions,
    narrative: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      mission,
      occurrences: journal.occurrences,
    },
  });
  expect(recorded.winner).toBe("blue");
  expect(deserializeRecordedMatch(serializeRecordedMatch(recorded))).toEqual(recorded);
  expect(recordedInitialState(recorded).victoryPolicy).toEqual(mission.conditions);
  expect(() =>
    deserializeRecordedMatch(
      JSON.stringify({
        ...recorded,
        narrative: {
          ...recorded.narrative,
          occurrences: [...journal.occurrences, journal.occurrences[0]],
        },
      }),
    ),
  ).toThrow();
});
