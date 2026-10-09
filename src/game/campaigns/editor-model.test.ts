import { expect, it } from "vitest";
import { campaign, map } from "../../core/campaigns/test-fixtures";
import { CampaignEditorModel } from "./editor-model";

it("edits all trigger forms and lines, preserves drafts and explicit bindings", () => {
  const model = new CampaignEditorModel(campaign);
  model.addEvent("event");
  for (const type of [
    "mission-start",
    "turn",
    "unit-selected",
    "unit-moved",
    "unit-arrived",
    "mission-end",
  ] as const) {
    model.setTrigger(type);
    expect(model.event?.trigger.type).toBe(type);
  }
  model.addLine();
  model.updateLine({ speaker: "Commander", text: "Длинная реплика\nВторая строка" });
  expect(model.event?.lines[0]?.text).toContain("\n");
  expect(model.dirty).toBe(true);
  model.setMap("changed");
  model.setTrigger("unit-arrived");
  model.setMap(map.id);
  expect(model.event?.trigger).toMatchObject({ mapBinding: "" });
  model.rebind();
  expect(model.event?.trigger).toMatchObject({ mapBinding: map.id });
});
