import { describe, expect, it, vi } from "vitest";
import { getMovementSettings } from "../../presentation/movement-settings";
import { movementUi } from "../theme/movement-ui";
import { MovementSlider } from "./MovementSlider";

const POINTER_ID = 7;
const PARENT_SCALE = 2;
const PARENT_OFFSET = 200;
const SAVED_VALUE = 73;
const MAX_VALUE = 100;
const POINTER_LOCAL_X = (movementUi.trackWidth * SAVED_VALUE) / MAX_VALUE;
type Handler = (...args: unknown[]) => void;
class Display {
  public list: Display[] = [];
  public handlers = new Map<string, Handler>();
  public x = 0;
  public y = 0;
  public text = "";
  public visible = true;
  public active = true;
  public parentContainer?: Display;
  public setOrigin() {
    return this;
  }
  public setScrollFactor() {
    return this;
  }
  public setInteractive() {
    return this;
  }
  public setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  public setText(text: string) {
    this.text = text;
    return this;
  }
  public on(key: string, handler: Handler, context?: unknown) {
    this.handlers.set(key, handler.bind(context));
    return this;
  }
  public once(key: string, handler: Handler, context?: unknown) {
    return this.on(key, handler, context);
  }
  public off(key: string) {
    this.handlers.delete(key);
    return this;
  }
  public add(children: Display[]) {
    this.list.push(...children);
    return this;
  }
  public willRender() {
    return this.visible && (this.parentContainer?.visible ?? true);
  }
  public getWorldTransformMatrix() {
    return {
      applyInverse: (x: number, y: number) => ({ x: (x - PARENT_OFFSET) / PARENT_SCALE, y }),
    };
  }
}
function fixture() {
  const input = Object.assign(new Display(), { keyboard: new Display() });
  const events = new Display();
  const scene = {
    input,
    events,
    add: {
      container: () => new Display(),
      rectangle: () => new Display(),
      text: () => new Display(),
    },
  };
  getMovementSettings().save(0);
  const slider = new MovementSlider(scene as unknown as Phaser.Scene, 0, 0);
  const container = slider.container as unknown as Display;
  const hit = container.list.find((child) => child.handlers.has("pointerdown"));
  if (!hit) throw Error("missing hit target");
  const event = { stopPropagation: vi.fn() };
  const pointer = { id: POINTER_ID, x: POINTER_LOCAL_X * PARENT_SCALE + PARENT_OFFSET, y: 0 };
  return { slider, container, input, events, hit, event, pointer };
}
describe("Canvas movement slider", () => {
  it("consumes track clicks, inverts parent coordinates, and drags outside the track", () => {
    const { input, hit, event, pointer, container } = fixture();
    hit.handlers.get("pointerdown")?.(pointer, 0, 0, event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(getMovementSettings().load()).toBe(SAVED_VALUE);
    expect(container.list.find((child) => child.text.startsWith("Movement:"))?.text).toBe(
      "Movement: 108 ms / cell",
    );
    input.handlers.get("pointermove")?.({
      ...pointer,
      x: PARENT_OFFSET + movementUi.trackWidth * PARENT_SCALE,
    });
    expect(getMovementSettings().load()).toBe(MAX_VALUE);
    input.handlers.get("pointerup")?.(pointer);
    input.handlers.get("pointermove")?.({ ...pointer, x: 0 });
    expect(getMovementSettings().load()).toBe(MAX_VALUE);
  });
  it("handles focused keyboard input, blurs on close, and removes handlers on shutdown", () => {
    const { slider, hit, input, events, pointer, event } = fixture();
    hit.handlers.get("pointerdown")?.(pointer, 0, 0, event);
    const key = { key: "End", preventDefault: vi.fn() };
    input.keyboard.handlers.get("keydown")?.(key);
    expect(getMovementSettings().load()).toBe(MAX_VALUE);
    expect(key.preventDefault).toHaveBeenCalledTimes(1);
    slider.blur();
    input.keyboard.handlers.get("keydown")?.({ ...key, key: "Home" });
    expect(getMovementSettings().load()).toBe(MAX_VALUE);
    events.handlers.get("shutdown")?.();
    expect(input.handlers.size).toBe(0);
    expect(input.keyboard.handlers.size).toBe(0);
  });
});
