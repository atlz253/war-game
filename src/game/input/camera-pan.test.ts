import { describe, expect, it } from "vitest";

import { calculateDraggedScroll } from "./camera-pan";

describe("calculateDraggedScroll", () => {
  it("moves the camera opposite to a pointer drag and accounts for zoom", () => {
    expect(
      calculateDraggedScroll({
        scrollX: 100,
        scrollY: 200,
        deltaX: 40,
        deltaY: -20,
        zoom: 0.5,
      }),
    ).toEqual({ x: 20, y: 240 });
  });
});
