import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { createMapDefinitionFromState } from "./create-map-definition-from-state";
import { createGameStateFromMap } from "./map-definition";

const SKIRMISH_NAME = "Skirmish 12×8";

describe("createMapDefinitionFromState", () => {
  it("creates a map snapshot that restores the exact initial skirmish state", () => {
    const initialState = createSkirmishGameState();
    const map = createMapDefinitionFromState(initialState, SKIRMISH_NAME);

    expect(createGameStateFromMap(map)).toEqual(initialState);
  });
});
