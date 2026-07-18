import { describe, expect, it } from "vitest";

import { calculateEditorWorldViewport } from "./editor-presentation";

const SAFE_X = 0;
const SAFE_Y = 0;
const SAFE_WIDTH = 3840;
const SAFE_HEIGHT = 2160;
const SCALE = 1;
const EDITOR_PANEL_WIDTH = 920;
const WORLD_WIDTH = 2920;

describe("calculateEditorWorldViewport", () => {
  it("reserves the left presentation area for the editor panel", () => {
    expect(
      calculateEditorWorldViewport(
        { x: SAFE_X, y: SAFE_Y, width: SAFE_WIDTH, height: SAFE_HEIGHT, scale: SCALE },
        EDITOR_PANEL_WIDTH,
      ),
    ).toEqual({ x: EDITOR_PANEL_WIDTH, y: SAFE_Y, width: WORLD_WIDTH, height: SAFE_HEIGHT });
  });
});
