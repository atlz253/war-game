import { beforeEach, describe, expect, it, vi } from "vitest";
import { canvasFixture } from "../campaigns/canvas-test-fixture";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Input: {
      Events: {
        POINTER_DOWN: "pointerdown",
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
      },
    },
  },
}));
const runtime = vi.hoisted(() => ({ id: "en", select: vi.fn(), listeners: new Set<() => void>() }));
const api = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("./dev-locale-api", () => ({ saveLocale: api.save, refreshLocales: api.refresh }));
vi.mock("./runtime", () => ({
  localeKey: (key: string) => key,
  getLocaleId: () => runtime.id,
  getLocaleCatalog: () => ({
    locales: [
      { schemaVersion: 1, id: "en", name: "English", strings: {} },
      { schemaVersion: 1, id: "ru", name: "Русский", strings: {} },
    ],
    diagnostics: [],
  }),
  selectLocale: (id: string) => {
    runtime.id = id;
    runtime.select(id);
    return true;
  },
  t: (key: string) =>
    key === "language.title"
      ? runtime.id === "ru"
        ? "ЯЗЫК"
        : "LANGUAGE"
      : key === "common.back"
        ? "BACK"
        : key,
  onLocaleCatalogChange: (fn: () => void) => {
    runtime.listeners.add(fn);
    return () => runtime.listeners.delete(fn);
  },
}));

import { LanguageScene } from "../scenes/LanguageScene";

describe("Canvas language selector", () => {
  beforeEach(() => {
    runtime.id = "en";
    vi.clearAllMocks();
    vi.stubEnv("DEV", false);
  });
  it("selects immediately, refreshes labels and returns pending configuration", () => {
    const fixture = canvasFixture();
    const scene = Object.assign(new LanguageScene(), fixture.props);
    const data = {
      selectedMapKey: "local:map",
      matchConfiguration: { blue: "human", red: "heuristic-ai" },
    };
    scene.create(data as never);
    fixture.click(scene.content as never, "Русский");
    expect(runtime.select).toHaveBeenCalledWith("ru");
    expect(
      fixture.descendants(scene.content as never).some((object) => object.text === "ЯЗЫК"),
    ).toBe(true);
    fixture.click(scene.content as never, "BACK");
    expect(fixture.start).toHaveBeenCalledWith("main-menu", data);
  });
  it("hides create/edit in production and rejects direct authoring", () => {
    const fixture = canvasFixture();
    const scene = Object.assign(new LanguageScene(), fixture.props);
    scene.create({ editLocaleId: "en" });
    expect(fixture.start).toHaveBeenCalledWith("language", {});
  });
  it("resets a previous dirty confirmation when the scene is entered again", () => {
    const fixture = canvasFixture();
    const scene = Object.assign(new LanguageScene(), fixture.props);
    Object.assign(scene, { confirming: true, message: "old error" });
    scene.create();
    expect(scene).toMatchObject({ confirming: false, message: "" });
  });
});
describe("DEV authoring lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DEV", true);
  });
  it("offers DEV editing with stable-ID rename and save/discard/cancel", async () => {
    vi.stubEnv("DEV", true);
    const fixture = canvasFixture();
    const scene = Object.assign(new LanguageScene(), fixture.props);
    scene.create({ editLocaleId: "ru" });
    const internals = scene as unknown as {
      draft: import("./draft").LocaleDraft;
      saving: boolean;
      requestLeave(): void;
      save(leave?: boolean): Promise<void>;
    };
    internals.draft.rename("Русский язык");
    internals.requestLeave();
    fixture.click(scene.content as never, "common.cancel");
    expect(internals.draft.dirty).toBe(true);
    let finish!: () => void;
    api.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = internals.save(true);
    expect(internals.saving).toBe(true);
    internals.draft.rename("Новая правка");
    finish();
    await pending;
    expect(internals.draft.dirty).toBe(true);
    expect(internals.draft.value.name).toBe("Новая правка");
    expect(api.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ru", name: "Русский язык" }),
      false,
    );
  });
  it("ignores save callbacks after shutdown and retains failed drafts", async () => {
    vi.stubEnv("DEV", true);
    const fixture = canvasFixture();
    const scene = Object.assign(new LanguageScene(), fixture.props);
    scene.create({ editLocaleId: "ru" });
    const internals = scene as unknown as {
      draft: import("./draft").LocaleDraft;
      save(): Promise<void>;
    };
    internals.draft.rename("Unsaved");
    api.save.mockRejectedValueOnce(new Error("disk failed"));
    await internals.save();
    expect(internals.draft.dirty).toBe(true);
    expect(
      fixture
        .descendants(scene.content as never)
        .some((object) => object.text.includes("disk failed")),
    ).toBe(true);
    let finish!: () => void;
    api.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = internals.save();
    const shutdown = fixture.props.events.once.mock.calls.find(
      ([event]) => event === "shutdown",
    )?.[1] as () => void;
    shutdown();
    finish();
    await pending;
    expect(internals.draft.dirty).toBe(true);
  });
});
