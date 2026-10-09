import { describe, expect, it } from "vitest";
import { movementSpeedLabel, sliderKeyValue, sliderValueAt } from "./movement-slider-model";

const MAX_SLIDER_VALUE = 100;
const TRACK_WIDTH = 1000;
const OUTSIDE_TRACK_X = 1200;
const INTERMEDIATE_TRACK_X = 731;
const INTERMEDIATE_VALUE = 73;
const TRANSFORMED_POINTER_X = 1662;
const PARENT_OFFSET_X = 200;
const PARENT_SCALE = 2;
const DEFAULT_VALUE = 50;
const NEXT_VALUE = 51;
const PREVIOUS_VALUE = 49;

describe("movement slider model", () => {
  it("clamps and quantizes track positions including transformed local coordinates", () => {
    expect(sliderValueAt(-MAX_SLIDER_VALUE, TRACK_WIDTH)).toBe(0);
    expect(sliderValueAt(OUTSIDE_TRACK_X, TRACK_WIDTH)).toBe(MAX_SLIDER_VALUE);
    expect(sliderValueAt(INTERMEDIATE_TRACK_X, TRACK_WIDTH)).toBe(INTERMEDIATE_VALUE);
    expect(
      sliderValueAt((TRANSFORMED_POINTER_X - PARENT_OFFSET_X) / PARENT_SCALE, TRACK_WIDTH),
    ).toBe(INTERMEDIATE_VALUE);
  });
  it("supports arrows and endpoints without exceeding bounds", () => {
    expect(sliderKeyValue(DEFAULT_VALUE, "ArrowRight")).toBe(NEXT_VALUE);
    expect(sliderKeyValue(DEFAULT_VALUE, "ArrowLeft")).toBe(PREVIOUS_VALUE);
    expect(sliderKeyValue(0, "ArrowDown")).toBe(0);
    expect(sliderKeyValue(MAX_SLIDER_VALUE, "ArrowUp")).toBe(MAX_SLIDER_VALUE);
    expect(sliderKeyValue(DEFAULT_VALUE, "Home")).toBe(0);
    expect(sliderKeyValue(DEFAULT_VALUE, "End")).toBe(MAX_SLIDER_VALUE);
    expect(sliderKeyValue(DEFAULT_VALUE, "Escape")).toBeNull();
    expect(movementSpeedLabel(INTERMEDIATE_VALUE)).toBe("108 ms / cell");
    expect(movementSpeedLabel(MAX_SLIDER_VALUE)).toBe("No animation");
  });
});
