import { describe, expect, it } from "vitest";

import { getEditorPointerTool } from "./editor-pointer-tool";

describe("getEditorPointerTool", () => {
  it("uses the erase tool for a right-click without changing the selected tool", () => {
    const selectedTool = {
      kind: "unit" as const,
      side: "blue" as const,
      unitType: "infantry" as const,
    };

    expect(getEditorPointerTool(selectedTool, true)).toEqual({ kind: "erase" });
    expect(getEditorPointerTool(selectedTool, false)).toBe(selectedTool);
  });
});
