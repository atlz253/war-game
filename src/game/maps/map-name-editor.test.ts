import { describe, expect, it } from "vitest";

import {
  appendMapNameCharacter,
  cancelMapNameEdit,
  confirmMapNameEdit,
  createMapNameEditState,
  deleteLastMapNameCharacter,
  isMapNameInputValid,
  MAP_NAME_INPUT_MAX_LENGTH,
} from "./map-name-editor";

const MAP_NAME = "Frontline";

describe("map name editor", () => {
  it("accepts a non-empty trimmed name and rejects a blank name", () => {
    expect(isMapNameInputValid(MAP_NAME)).toBe(true);
    expect(isMapNameInputValid("   ")).toBe(false);
  });

  it("adds and removes characters without exceeding the input limit", () => {
    const fullName = "A".repeat(MAP_NAME_INPUT_MAX_LENGTH);

    expect(appendMapNameCharacter(MAP_NAME, "!")).toBe(`${MAP_NAME}!`);
    expect(appendMapNameCharacter(fullName, "B")).toBe(fullName);
    expect(deleteLastMapNameCharacter(`${MAP_NAME}!`)).toBe(MAP_NAME);
  });

  it("confirms a valid trimmed name and cancels back to the original value", () => {
    const state = { ...createMapNameEditState(MAP_NAME), value: "  New Map  " };

    expect(confirmMapNameEdit(state)).toBe("New Map");
    expect(confirmMapNameEdit({ ...state, value: "  " })).toBeNull();
    expect(cancelMapNameEdit(state)).toBe(MAP_NAME);
  });
});
