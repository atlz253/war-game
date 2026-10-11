import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";

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
    },
  },
}));

import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { getMovementSettings } from "../presentation/movement-settings";
import { MainMenuScene } from "./MainMenuScene";

const SPEED = 73;
const POINTER_ID = 7;
const MAX_SPEED = 100;
class ContextEmitter extends EventEmitter {
  private callbacks = new Map<(...args: unknown[]) => void, (...args: unknown[]) => void>();
  public override on(
    event: string,
    callback: (...args: unknown[]) => void,
    context?: unknown,
  ): this {
    const bound = context ? callback.bind(context) : callback;
    this.callbacks.set(callback, bound);
    return super.on(event, bound);
  }
  public override once(
    event: string,
    callback: (...args: unknown[]) => void,
    context?: unknown,
  ): this {
    // EventEmitter's wrapper is removed before the callback runs.
    const bound = context ? callback.bind(context) : callback;
    this.callbacks.set(callback, bound);
    return super.once(event, bound);
  }
  public override off(event: string, callback: (...args: unknown[]) => void): this {
    return super.off(event, this.callbacks.get(callback) ?? callback);
  }
}
it("destroys the inline slider, releases drag/focus, and bounds listener counts on repeated visits", () => {
  const stored = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
  const f = canvasFixture();
  const input = Object.assign(new ContextEmitter(), { keyboard: new ContextEmitter() });
  const events = new ContextEmitter();
  const scene = Object.assign(new MainMenuScene(), f.props, { input, events });
  scene.create({ view: "settings" });
  const root = (scene as unknown as { presentationContainer: Parameters<typeof f.click>[0] })
    .presentationContainer;
  const hit = f
    .descendants(root)
    .find((object) => object.handlers.has("pointerdown") && !object.list.length);
  if (!hit) throw Error("missing slider hit target");
  hit.emit("pointerdown", { id: POINTER_ID, x: 0, y: 0 }, 0, 0, { stopPropagation: vi.fn() });
  input.keyboard.emit("keydown", { key: "End", preventDefault: vi.fn() });
  expect(getMovementSettings().load()).toBe(MAX_SPEED);
  getMovementSettings().save(SPEED);
  f.click(root, "BACK");
  input.emit("pointermove", { id: POINTER_ID, x: 0, y: 0 });
  input.keyboard.emit("keydown", { key: "Home", preventDefault: vi.fn() });
  expect(getMovementSettings().load()).toBe(SPEED);
  expect(input.listenerCount("pointermove")).toBe(0);
  expect(input.keyboard.listenerCount("keydown")).toBe(0);
  f.click(root, "SETTINGS");
  expect(input.listenerCount("pointermove")).toBe(1);
  f.click(root, "BACK");
  f.click(root, "SETTINGS");
  expect(input.listenerCount("pointermove")).toBe(1);
  expect(input.keyboard.listenerCount("keydown")).toBe(1);
  const EXPECTED_SHUTDOWN_LISTENERS = 2;
  expect(events.listenerCount("shutdown")).toBe(EXPECTED_SHUTDOWN_LISTENERS);
  expect(f.descendants(root).some((object) => object.text === "Movement: 108 ms / cell")).toBe(
    true,
  );
  events.emit("shutdown");
  expect(input.listenerCount("pointermove")).toBe(0);
  expect(input.keyboard.listenerCount("keydown")).toBe(0);
  expect(f.props.scale.off).toHaveBeenCalledWith("resize", expect.any(Function), scene);
});
