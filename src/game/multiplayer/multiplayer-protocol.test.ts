import { describe, expect, it } from "vitest";

import { parseMultiplayerPacket } from "./multiplayer-protocol";

describe("multiplayer protocol", () => {
  it("accepts a client action request with a public GameAction", () => {
    expect(
      parseMultiplayerPacket({ type: "action-request", action: { type: "end-turn" } }),
    ).toEqual({ type: "action-request", action: { type: "end-turn" } });
  });

  it("rejects malformed packets before they reach a game session", () => {
    expect(
      parseMultiplayerPacket({ type: "accepted-action", sequence: 1, action: { type: "move" } }),
    ).toBeNull();
    expect(parseMultiplayerPacket({ type: "unknown" })).toBeNull();
  });

  it("requires an integer sequence for accepted actions", () => {
    expect(
      parseMultiplayerPacket({
        type: "accepted-action",
        sequence: 1.5,
        action: { type: "end-turn" },
      }),
    ).toBeNull();
  });
});
