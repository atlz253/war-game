import { expect, it } from "vitest";
import { editText, textState } from "./text-edit";

it("edits Unicode at cursor, retains multiline and rejects overflow without truncation", () => {
  let state = textState("Я🙂", true);
  state = editText(state, "ArrowLeft");
  state = editText(state, "Backspace");
  expect(state.value).toBe("🙂");
  state = editText(state, "Enter");
  expect(state.value).toBe("\n🙂");
  state = editText(state, "Delete");
  expect(state.value).toBe("\n");
  const full = { ...textState("abc", true), limit: 3 };
  expect(editText(full, "d")).toMatchObject({ value: "abc", error: expect.any(String) });
});
