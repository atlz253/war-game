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

  it("cycles either side through every available participant without changing its opponent", () => {
    const configuration = createDefaultMatchConfiguration();

    expect(toggleParticipant(configuration, "blue")).toEqual({
      blue: "heuristic-ai",
      red: "heuristic-ai",
    });
    expect(toggleParticipant(toggleParticipant(configuration, "blue"), "blue")).toEqual({
      blue: "lm-studio-ai",
      red: "heuristic-ai",
    });
    expect(toggleParticipant(configuration, "red")).toEqual({
      blue: "human",
      red: "lm-studio-ai",
    });
  });

  it("creates an agent only for an AI participant", () => {
    expect(createAgentForParticipant("human")).toBeNull();
    expect(createAgentForParticipant("heuristic-ai")?.id).toBe("heuristic");
    expect(
      createAgentForParticipant("lm-studio-ai", {
        baseUrl: "http://127.0.0.1:1234/v1",
        modelId: "local-model",
      })?.id,
    ).toBe("lm-studio");
  });

  it("identifies whether the active side is controlled by a human", () => {
    const configuration = createDefaultMatchConfiguration();

    expect(isHumanTurn(configuration, "blue")).toBe(true);
    expect(isHumanTurn(configuration, "red")).toBe(false);
  });

  it("provides stable labels for Canvas controls", () => {
    expect(getParticipantLabel("human")).toBe("HUMAN");
    expect(getParticipantLabel("heuristic-ai")).toBe("HEURISTIC AI");
    expect(getParticipantLabel("lm-studio-ai")).toBe("LM STUDIO AI");
  });
});
