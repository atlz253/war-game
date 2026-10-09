import { createMapDefinition } from "../maps/map-definition";
import type { CampaignDefinition, MissionDefinition } from "./definition";

const LESSON_WIDTH = 12;
const LESSON_HEIGHT = 5;
export const map = {
  ...createMapDefinition("lesson", "Lesson", LESSON_WIDTH, LESSON_HEIGHT),
  units: [
    { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 1 } },
    { side: "blue" as const, type: "infantry" as const, position: { x: 0, y: 3 } },
  ],
};
export const mission: MissionDefinition = {
  id: "m",
  name: "Lesson",
  builtInMapId: map.id,
  conditions: {
    type: "standard-match-or-reach-cell",
    unit: { type: "any" },
    cell: { x: 11, y: 2 },
    mapBinding: map.id,
  },
  events: [],
};
export const campaign: CampaignDefinition = {
  schemaVersion: 1,
  id: "c",
  name: "Lessons",
  missions: [mission],
};
