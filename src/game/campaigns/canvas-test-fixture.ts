import { vi } from "vitest";

type Handler = (...args: unknown[]) => void;
class CanvasObject {
  public list: CanvasObject[] = [];
  public parentContainer?: CanvasObject;
  public text = "";
  public visible = true;
  public depth = 0;
  public x = 0;
  public y = 0;
  public handlers = new Map<string, Handler>();
  public add(children: CanvasObject | CanvasObject[]): this {
    for (const child of Array.isArray(children) ? children : [children]) {
      this.list.push(child);
      child.parentContainer = this;
    }
    return this;
  }
  public removeAll(): this {
    this.list = [];
    return this;
  }
  public on(event: string, handler: Handler): this {
    this.handlers.set(event, handler);
    return this;
  }
  public emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.(...args);
  }
  public destroy(): void {
    this.list = [];
  }
  public setText(value: string): this {
    this.text = value;
    return this;
  }
  public setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }
  public setDepth(value: number): this {
    this.depth = value;
    return this;
  }
  public setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  public setScale(): this {
    return this;
  }
  public setSize(): this {
    return this;
  }
  public setOrigin(): this {
    return this;
  }
  public setInteractive(): this {
    return this;
  }
  public setScrollFactor(): this {
    return this;
  }
  public setStrokeStyle(): this {
    return this;
  }
  public setFillStyle(): this {
    return this;
  }
  public setAlpha(): this {
    return this;
  }
  public setColor(): this {
    return this;
  }
  public setDisplaySize(): this {
    return this;
  }
  public getWrappedText(value: string): string[] {
    return value.split("\n");
  }
}

export function canvasFixture() {
  const start = vi.fn();
  const camera = {
    setBackgroundColor: vi.fn(),
    setViewport: vi.fn().mockReturnThis(),
    setScroll: vi.fn().mockReturnThis(),
    setZoom: vi.fn().mockReturnThis(),
  };
  const props = {
    add: {
      container: (_x?: number, _y?: number, children?: CanvasObject[]) =>
        new CanvasObject().add(children ?? []),
      text: (_x: number, _y: number, text: string) => new CanvasObject().setText(text),
      rectangle: () => new CanvasObject(),
      image: () => new CanvasObject(),
    },
    cameras: { main: camera },
    scale: { width: 1920, height: 1080, on: vi.fn(), off: vi.fn() },
    events: { once: vi.fn() },
    input: { keyboard: { on: vi.fn(), off: vi.fn() } },
    scene: { start },
  };
  const descendants = (object: CanvasObject): CanvasObject[] => [
    object,
    ...object.list.flatMap(descendants),
  ];
  function click(root: CanvasObject, label: string): void {
    const text = descendants(root).find((item) => item.text === label);
    if (!text?.parentContainer) throw new Error(`Missing button ${label}`);
    text.parentContainer.emit("pointerdown");
  }
  return { props, start, click, descendants };
}
