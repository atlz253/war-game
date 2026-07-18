import { describe, expect, it } from "vitest";

import {
  createAgentForParticipant,
  createDefaultMatchConfiguration,
  getParticipantLabel,
  isHumanTurn,
  toggleParticipant,
} from "./match-configuration";

describe("match configuration", () => {
  it("defaults to a human Blue commander and a Heuristic AI Red commander", () => {
    expect(createDefaultMatchConfiguration()).toEqual({
      blue: "human",
      red: "heuristic-ai",
    });
  });

  it("toggles either side without changing its opponent", () => {
    const configuration = createDefaultMatchConfiguration();

    expect(toggleParticipant(configuration, "blue")).toEqual({
      blue: "heuristic-ai",
      red: "heuristic-ai",
    });
    expect(toggleParticipant(configuration, "red")).toEqual({
      blue: "human",
      red: "human",
    });
  });

  it("creates an agent only for an AI participant", () => {
    expect(createAgentForParticipant("human")).toBeNull();
    expect(createAgentForParticipant("heuristic-ai")?.id).toBe("heuristic");
  });

  it("identifies whether the active side is controlled by a human", () => {
    const configuration = createDefaultMatchConfiguration();

    expect(isHumanTurn(configuration, "blue")).toBe(true);
    expect(isHumanTurn(configuration, "red")).toBe(false);
  });

  it("provides stable labels for Canvas controls", () => {
    expect(getParticipantLabel("human")).toBe("HUMAN");
    expect(getParticipantLabel("heuristic-ai")).toBe("HEURISTIC AI");
  });
});
