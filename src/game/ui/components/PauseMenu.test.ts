import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: {} }));

import { getPauseMenuActions } from "./PauseMenu";

describe("getPauseMenuActions", () => {
  const onResume = vi.fn();
  const onExit = vi.fn();

  it("omits the event log action when no callback was supplied", () => {
    expect(getPauseMenuActions({ onResume, onExit }).map((action) => action.label)).toEqual([
      "RETURN TO GAME",
      "MAIN MENU",
    ]);
  });

  it("includes the event log action when a callback was supplied", () => {
    expect(
      getPauseMenuActions({ onResume, onExit, onShowEventLog: vi.fn() }).map(
        (action) => action.label,
      ),
    ).toEqual(["RETURN TO GAME", "EVENT LOG", "MAIN MENU"]);
  });
});
