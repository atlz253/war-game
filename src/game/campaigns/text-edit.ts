import { t } from "../localization/runtime";
export const NAME_LIMIT = 120;
export const DIALOGUE_TEXT_LIMIT = 12000;
export interface TextEditState {
  readonly value: string;
  readonly cursor: number;
  readonly multiline: boolean;
  readonly limit: number;
  readonly error: string;
}
export function textState(value: string, multiline: boolean): TextEditState {
  return {
    value,
    cursor: Array.from(value).length,
    multiline,
    limit: multiline ? DIALOGUE_TEXT_LIMIT : NAME_LIMIT,
    error: "",
  };
}
export function insertText(state: TextEditState, inserted: string): TextEditState {
  if (!state.multiline && /[\r\n]/.test(inserted))
    return { ...state, error: t("text-edit.this.field.is.a.single.line") };
  const points = Array.from(state.value);
  const addition = Array.from(inserted.replace(/\r\n?/g, "\n"));
  if (points.length + addition.length > state.limit)
    return {
      ...state,
      error: t("text-edit.maximum.characters.text.retained", { value1: String(state.limit) }),
    };
  points.splice(state.cursor, 0, ...addition);
  return { ...state, value: points.join(""), cursor: state.cursor + addition.length, error: "" };
}
export function editText(state: TextEditState, key: string): TextEditState {
  const points = Array.from(state.value);
  switch (key) {
    case "ArrowLeft":
      return { ...state, cursor: Math.max(0, state.cursor - 1) };
    case "ArrowRight":
      return { ...state, cursor: Math.min(points.length, state.cursor + 1) };
    case "Home":
      return { ...state, cursor: 0 };
    case "End":
      return { ...state, cursor: points.length };
    case "Backspace":
      if (!state.cursor) return state;
      points.splice(state.cursor - 1, 1);
      return { ...state, value: points.join(""), cursor: state.cursor - 1, error: "" };
    case "Delete":
      points.splice(state.cursor, 1);
      return { ...state, value: points.join(""), error: "" };
    case "Enter":
      return state.multiline ? insertText(state, "\n") : state;
    default:
      return Array.from(key).length === 1 ? insertText(state, key) : state;
  }
}
