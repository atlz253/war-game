import { describe, expect, it } from "vitest";

import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { getLegalActions } from "./get-legal-actions";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const RED_INFANTRY_ID = "red-infantry-1";

describe("getLegalActions", () => {
  it("does not offer attacks against diagonal targets", () => {
    const state = createSkirmishGameState();
    const diagonalTargetState = {
      ...state,
      units: {
        ...state.units,
        [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position: { x: 2, y: 2 } },
      },
    };

    expect(getLegalActions(diagonalTargetState)).not.toContainEqual({
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });
  });
});
