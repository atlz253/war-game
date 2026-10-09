import type { CampaignDefinition, DialogueEvent, DialogueTrigger } from "./definition";

const MAP_ID = "tutorial-movement-12x5";
const GOAL_X = 11;
const GOAL_Y = 2;
function dialogue(id: string, trigger: DialogueTrigger, text: string): DialogueEvent {
  return { id, type: "dialogue", trigger, lines: [{ speaker: "Instructor", text }] };
}
const TUTORIAL: CampaignDefinition = {
  schemaVersion: 1,
  id: "tutorial",
  name: "Tutorial Campaign",
  missions: [
    {
      id: "selection-and-movement",
      name: "Selection and Movement",
      builtInMapId: MAP_ID,
      conditions: {
        type: "standard-match-or-reach-cell",
        unit: { type: "any" },
        cell: { x: GOAL_X, y: GOAL_Y },
        mapBinding: MAP_ID,
      },
      events: [
        dialogue(
          "introduction",
          { type: "mission-start" },
          "Welcome! Click either Blue infantry unit to select it. Use the mouse wheel to zoom and WASD or arrow keys to pan the map.",
        ),
        dialogue(
          "selection",
          { type: "unit-selected", unit: { type: "any" }, mapBinding: MAP_ID },
          "Your unit is selected. Highlighted cells are available destinations. Close this dialogue and click an available cell to move.",
        ),
        dialogue(
          "movement",
          { type: "unit-moved", unit: { type: "any" }, mapBinding: MAP_ID },
          "Moving spends movement points. You can move again while points remain. Click END TURN to restore movement; the empty Red turn ends automatically. Reach the marked goal at (11, 2) on the right edge with either Blue unit.",
        ),
        dialogue(
          "completion",
          { type: "mission-end" },
          "Well done! You have learned to select units, move them, and end the turn. You reached the far edge and completed this lesson.",
        ),
      ],
    },
  ],
};
export function getBuiltInCampaigns(): CampaignDefinition[] {
  return structuredClone([TUTORIAL]);
}
