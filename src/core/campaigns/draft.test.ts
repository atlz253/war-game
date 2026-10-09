import { expect, it } from "vitest";
import { append, changeMissionMap, rebindMission, removeAt, reorder } from "./draft";
import { mission } from "./test-fixtures";

it("preserves identity when reordering, adding and removing", () => {
  const second = { ...mission, id: "second" };
  expect(reorder([mission, second], 0, 1)).toEqual([second, mission]);
  expect(removeAt(append([mission], second), 1)).toEqual([mission]);
});
it("requires explicit rebinding even when runtime IDs coincide", () => {
  const changed = changeMissionMap(mission, "new-map");
  expect(changed.conditions).toMatchObject({ mapBinding: "" });
  expect(rebindMission(changed).conditions).toMatchObject({ mapBinding: "new-map" });
});
