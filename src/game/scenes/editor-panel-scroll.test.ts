import { describe, expect, it } from "vitest";

import { calculateEditorPanelScroll } from "./editor-panel-scroll";

const CONTENT_HEIGHT = 2124;
const VIEWPORT_HEIGHT = 1952;
const INITIAL_OFFSET = 40;
const WHEEL_DELTA = 80;
const EXPECTED_OFFSET = INITIAL_OFFSET + WHEEL_DELTA;
const MAXIMUM_OFFSET = CONTENT_HEIGHT - VIEWPORT_HEIGHT;
const OFFSET_BEFORE_LAST_ELEMENT = 12;

describe("editor panel scroll", () => {
  it("scrolls the panel content by the wheel delta", () => {
    expect(
      calculateEditorPanelScroll({
        currentOffset: INITIAL_OFFSET,
        wheelDeltaY: WHEEL_DELTA,
        contentHeight: CONTENT_HEIGHT,
        viewportHeight: VIEWPORT_HEIGHT,
      }),
    ).toBe(EXPECTED_OFFSET);
  });

  it("does not scroll above the first panel element", () => {
    expect(
      calculateEditorPanelScroll({
        currentOffset: INITIAL_OFFSET,
        wheelDeltaY: -WHEEL_DELTA,
        contentHeight: CONTENT_HEIGHT,
        viewportHeight: VIEWPORT_HEIGHT,
      }),
    ).toBe(0);
  });

  it("does not scroll beyond the last panel element", () => {
    expect(
      calculateEditorPanelScroll({
        currentOffset: MAXIMUM_OFFSET - OFFSET_BEFORE_LAST_ELEMENT,
        wheelDeltaY: WHEEL_DELTA,
        contentHeight: CONTENT_HEIGHT,
        viewportHeight: VIEWPORT_HEIGHT,
      }),
    ).toBe(MAXIMUM_OFFSET);
  });
});
