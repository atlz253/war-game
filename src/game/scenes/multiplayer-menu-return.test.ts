import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Scale: { Events: { RESIZE: "resize" } },
    Scenes: { Events: { SHUTDOWN: "shutdown" } },
    Input: {
      Events: {
        POINTER_DOWN: "pointerdown",
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
      },
      Keyboard: { Events: { ANY_KEY_DOWN: "keydown" } },
    },
  },
}));
const session = vi.hoisted(() => ({
  close: vi.fn(),
  host: vi.fn(),
  join: vi.fn(),
  setEvents: vi.fn(),
}));
vi.mock("../multiplayer/multiplayer-session", () => ({
  MultiplayerSession: class {
    close = session.close;
    host = session.host;
    join = session.join;
    setEvents = session.setEvents;
  },
}));

import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { t } from "../localization/runtime";
import { createDefaultMatchConfiguration } from "../match/match-configuration";
import { MultiplayerHostScene } from "./MultiplayerHostScene";
import { MultiplayerJoinScene } from "./MultiplayerJoinScene";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: vi.fn() } });
});
describe.each([MultiplayerHostScene, MultiplayerJoinScene])("multiplayer menu return", (Scene) => {
  it("cleans connections before returning the separate pending setup payload", () => {
    const f = canvasFixture();
    const scene = Object.assign(new Scene(), f.props);
    const returnMenu = {
      view: "multiplayer" as const,
      selectedMapKey: "local:pending",
      matchConfiguration: createDefaultMatchConfiguration(),
    };
    scene.create({ returnMenu });
    const internals = scene as unknown as {
      presentationContainer: Parameters<typeof f.click>[0];
      selectedMapKey?: string | null;
      roomCode?: string;
    };
    expect(internals.selectedMapKey ?? internals.roomCode).not.toBe("local:pending");
    f.click(internals.presentationContainer, t("campaign-library.menu"));
    expect(session.close).toHaveBeenCalled();
    expect(f.start).toHaveBeenCalledWith("main-menu", returnMenu);
    expect(session.close.mock.invocationCallOrder[0]).toBeLessThan(
      f.start.mock.invocationCallOrder[0] as number,
    );
  });
  it("retains the root return for direct entry and resets context on reuse", () => {
    const f = canvasFixture();
    const scene = Object.assign(new Scene(), f.props);
    scene.create({ returnMenu: { view: "multiplayer" } });
    scene.create();
    const root = (scene as unknown as { presentationContainer: Parameters<typeof f.click>[0] })
      .presentationContainer;
    f.click(root, t("campaign-library.menu"));
    expect(f.start).toHaveBeenCalledWith("main-menu");
  });
});
