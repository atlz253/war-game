import type { EditorTool } from "../maps/editor-map-operations";

const ERASE_TOOL: EditorTool = { kind: "erase" };

export function getEditorPointerTool(
  selectedTool: EditorTool,
  isRightButtonDown: boolean,
): EditorTool {
  return isRightButtonDown ? ERASE_TOOL : selectedTool;
}
