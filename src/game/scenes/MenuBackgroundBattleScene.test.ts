import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
import { MenuBackgroundBattleScene } from "./MenuBackgroundBattleScene";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Scale: { Events: { RESIZE: "resize" } },
    Scenes: { Events: { SHUTDOWN: "shutdown" } },
  },
}));
vi.mock("../board/BattleMapRenderer", () => ({
  BattleMapRenderer: class {
    createTerrain() {}
    renderState() {}
    setMovementPosition() {}
    clearMovementPositions() {}
    updateHealthLabelScales() {}
    reset() {}
  },
}));
const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;
const FRAME_MS = 50;
const HIDDEN_FRAME_MS = 10000;

it("retains the runner through suspension and releases visibility/resize hooks on shutdown", async () => {
  const visibility = new EventEmitter();
  const documentFixture = {
    hidden: false,
    addEventListener: vi.fn((name, callback) => visibility.on(name, callback)),
    removeEventListener: vi.fn((name, callback) => visibility.off(name, callback)),
  };
  vi.stubGlobal("document", documentFixture);
  try {
    const camera = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      zoom: 1,
      setViewport: () => camera,
      setZoom: (zoom: number) => {
        camera.zoom = zoom;
        return camera;
      },
      setScroll: () => camera,
    };
    const scale = Object.assign(new EventEmitter(), {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
    });
    const events = new EventEmitter();
    const scene = Object.assign(new MenuBackgroundBattleScene(), {
      add: { container: () => ({}) },
      cameras: { main: camera },
      input: { enabled: true },
      scale,
      events: {
        once: (name: string, callback: () => void, context: object) =>
          events.once(name, callback.bind(context)),
      },
      scene: { setVisible: vi.fn() },
    });
    scene.create();
    const owner = scene as unknown as {
      runner?: import("../presentation/menu-battle-runner").MenuBattleRunner;
    };
    const runner = owner.runner;
    if (!runner) throw new Error("Missing runner");
    scene.setMenuActive(true);
    scene.update(0, FRAME_MS);
    await runner.idle();
    const state = runner.controller.state;
    scene.setMenuActive(false);
    scene.update(0, HIDDEN_FRAME_MS);
    expect(runner.controller.state).toBe(state);
    scene.setMenuActive(true);
    documentFixture.hidden = true;
    visibility.emit("visibilitychange");
    scene.update(0, HIDDEN_FRAME_MS);
    expect(runner.controller.state).toBe(state);
    expect(owner.runner).toBe(runner);
    documentFixture.hidden = false;
    visibility.emit("visibilitychange");
    expect(scene.input.enabled).toBe(false);
    events.emit("shutdown");
    expect(owner.runner).toBeUndefined();
    expect(scale.listenerCount("resize")).toBe(0);
    expect(visibility.listenerCount("visibilitychange")).toBe(0);
    expect(await runner.controller.step()).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});
