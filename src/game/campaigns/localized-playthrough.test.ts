import { expect, it } from "vitest";
import type { GameAction } from "../../core/actions/game-actions";
import { deserializeCampaign } from "../../core/campaigns/definition";
import { campaign, map, mission } from "../../core/campaigns/test-fixtures";
import { createReplayTimeline } from "../../core/replay/replay-timeline";
import {
  createRecordedMatch,
  deserializeRecordedMatch,
  recordedInitialState,
  serializeRecordedMatch,
} from "../replays/recorded-match";
import { MissionDialogueController } from "./dialogue-controller";
import { advanceRun, launchMission, startRun } from "./playthrough";
import { ReplayDialogue } from "./replay-dialogue";

const authored = deserializeCampaign(
  JSON.stringify({
    ...campaign,
    schemaVersion: 1,
    missions: [
      {
        ...mission,
        conditions: { ...mission.conditions, cell: { x: 2, y: 1 } },
        events: [
          {
            id: "intro",
            type: "dialogue",
            trigger: { type: "mission-start" },
            lines: [{ speaker: "Guide", text: "Hello" }],
          },
        ],
      },
    ],
  }),
);
const event = authored.missions[0]!.events[0]!;
const translated = {
  ...authored,
  missions: [
    {
      ...authored.missions[0]!,
      events: [{ ...event, localizations: { ru: { "line-1": { text: "Привет", speaker: " " } } } }],
    },
  ],
};
const action: GameAction = { type: "move", unitId: "blue-infantry-1", destination: { x: 2, y: 1 } };
it("snapshots language and translations across retry and advancement", () => {
  const twoMissions = structuredClone({
    ...translated,
    missions: [...translated.missions, { ...translated.missions[0]!, id: "second" }],
  });
  const run = startRun(twoMissions, [map], "ru");
  expect(run.localeId).toBe("ru");
  Object.assign(twoMissions.missions[0]?.events[0]?.localizations.ru?.["line-1"] ?? {}, {
    text: "changed",
  });
  const controller = new MissionDialogueController(
    run.campaign.missions[0]!,
    () => {},
    run.localeId,
  );
  controller.enqueue(["intro"]);
  controller.present();
  expect(controller.current).toMatchObject({ speaker: "Guide", text: "Привет" });
  expect(advanceRun(run, "blue").localeId).toBe("ru");
  expect(launchMission(run).initialState).toEqual(launchMission(run).initialState);
});
it("records v3 immutable translated dialogue, reads legacy records, rejects malformed metadata", () => {
  const run = startRun(translated, [map], "ru");
  const controller = new MissionDialogueController(run.campaign.missions[0]!, () => {}, "ru");
  controller.signal({ type: "mission-start" }, 0);
  const record = createRecordedMatch({
    id: "translated",
    name: "Translated",
    savedAt: "2026-10-10",
    mapDefinition: map,
    matchConfiguration: run.participants,
    actions: [action],
    narrative: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      mission: run.campaign.missions[0]!,
      localeId: "ru",
      occurrences: controller.journal.occurrences,
    },
  });
  const localizedReplayVersion = 3;
  expect(record.schemaVersion).toBe(localizedReplayVersion);
  const loaded = deserializeRecordedMatch(serializeRecordedMatch(record));
  const replay = new ReplayDialogue(loaded.narrative!);
  replay.forward(0);
  expect(replay.controller.current?.text).toBe("Привет");
  replay.seek(0);
  expect(replay.controller.current).toBeUndefined();
  for (const localeId of ["../ru", 1, null])
    expect(() =>
      deserializeRecordedMatch(
        JSON.stringify({ ...record, narrative: { ...record.narrative, localeId } }),
      ),
    ).toThrow();
  const legacy = {
    ...record,
    schemaVersion: 2,
    narrative: { ...record.narrative, localeId: undefined, mission: authored.missions[0] },
  };
  expect(deserializeRecordedMatch(JSON.stringify(legacy)).narrative?.localeId).toBe("en");
});
it("produces identical deterministic state, actions and scores for both narrative languages", () => {
  const english = startRun(translated, [map], "en");
  const russian = startRun(translated, [map], "ru");
  const frames = [english, russian].map((run) =>
    createReplayTimeline(() => launchMission(run).initialState, [action]),
  );
  expect(frames[0]).toEqual(frames[1]);
  const record = createRecordedMatch({
    id: "headless",
    name: "Headless",
    savedAt: "2026-10-10",
    mapDefinition: map,
    matchConfiguration: english.participants,
    actions: [action],
    narrative: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      mission: english.campaign.missions[0]!,
      localeId: "ru",
      occurrences: [
        { eventId: "intro", sequence: 0, afterActionCount: 0, signal: { type: "mission-start" } },
      ],
    },
  });
  expect(
    createReplayTimeline(() => recordedInitialState(record), record.replay.actions).finalState,
  ).toEqual(frames[0]?.finalState);
});
