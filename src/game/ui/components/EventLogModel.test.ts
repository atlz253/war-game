import { describe, expect, it } from "vitest";

import { EVENT_LOG_VISIBLE_ENTRY_COUNT, EventLogModel } from "./EventLogModel";

const THREE_VISIBLE_ENTRIES = 3;
const TWO_VISIBLE_ENTRIES = 2;
const LARGE_SCROLL_DISTANCE = 100;

describe("EventLogModel", () => {
  it("retains every entry and initially displays the newest visible entries", () => {
    const model = new EventLogModel(THREE_VISIBLE_ENTRIES);

    model.setEntries(["one", "two", "three", "four", "five"]);

    expect(model.entries).toEqual(["one", "two", "three", "four", "five"]);
    expect(model.visibleEntries).toEqual(["three", "four", "five"]);
  });

  it("clamps scrolling to the first and last possible entries", () => {
    const model = new EventLogModel(TWO_VISIBLE_ENTRIES);
    model.setEntries(["one", "two", "three", "four"]);

    model.scrollBy(-LARGE_SCROLL_DISTANCE);
    expect(model.visibleEntries).toEqual(["one", "two"]);

    model.scrollBy(LARGE_SCROLL_DISTANCE);
    expect(model.visibleEntries).toEqual(["three", "four"]);
  });

  it("keeps the latest entries in view when a new entry arrives at the bottom", () => {
    const model = new EventLogModel(TWO_VISIBLE_ENTRIES);
    model.setEntries(["one", "two"]);
    model.push("three");

    expect(model.visibleEntries).toEqual(["two", "three"]);
  });

  it("uses the dialog's full vertical capacity", () => {
    const model = new EventLogModel(EVENT_LOG_VISIBLE_ENTRY_COUNT);
    const entries = Array.from({ length: EVENT_LOG_VISIBLE_ENTRY_COUNT + 1 }, (_, index) =>
      String(index),
    );

    model.setEntries(entries);

    expect(model.visibleEntries).toHaveLength(EVENT_LOG_VISIBLE_ENTRY_COUNT);
  });
});
