import { expect, it } from "vitest";
import { labelScale } from "./label-fit";

it("keeps long Unicode labels inside the available Canvas button while preserving short labels", () => {
  const longTextWidth = 1500;
  const labelAreaWidth = 480;
  const wrappedTextHeight = 180;
  const labelAreaHeight = 100;
  const scale = labelScale(longTextWidth, wrappedTextHeight, labelAreaWidth, labelAreaHeight);
  expect(longTextWidth * scale).toBeLessThanOrEqual(labelAreaWidth);
  expect(wrappedTextHeight * scale).toBeLessThanOrEqual(labelAreaHeight);
  const shortTextWidth = 100;
  const shortTextHeight = 40;
  expect(labelScale(shortTextWidth, shortTextHeight, labelAreaWidth, labelAreaHeight)).toBe(1);
});
