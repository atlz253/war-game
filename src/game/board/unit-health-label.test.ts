import { describe, expect, it } from "vitest";

import {
  calculateUnitHealthLabelScale,
  calculateUnitHealthLabelY,
  formatUnitHealthLabel,
} from "./unit-health-label";

const CURRENT_HEALTH = 7;
const UNIT_CENTER_Y = 768;
const TILE_SIZE = 512;
const LABEL_GAP = 24;
const EXPECTED_LABEL_Y = 488;
const HALF_CAMERA_ZOOM = 0.5;
const FULL_CAMERA_ZOOM = 1;
const DOUBLE_LABEL_SCALE = 2;
const DEFAULT_LABEL_SCALE = 1;

describe("formatUnitHealthLabel", () => {
  it("formats current health for a unit marker", () => {
    expect(formatUnitHealthLabel(CURRENT_HEALTH)).toBe("7");
  });

  it("places the health label above the unit tile", () => {
    expect(calculateUnitHealthLabelY(UNIT_CENTER_Y, TILE_SIZE, LABEL_GAP)).toBe(EXPECTED_LABEL_Y);
  });

  it("counter-scales the label to keep it readable while the camera zooms out", () => {
    expect(calculateUnitHealthLabelScale(HALF_CAMERA_ZOOM)).toBe(DOUBLE_LABEL_SCALE);
    expect(calculateUnitHealthLabelScale(FULL_CAMERA_ZOOM)).toBe(DEFAULT_LABEL_SCALE);
  });
});
