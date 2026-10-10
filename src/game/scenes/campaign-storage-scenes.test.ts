import { afterEach, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
    Input: {
      Events: {
        POINTER_OVER: "pointerover",
        POINTER_OUT: "pointerout",
        POINTER_DOWN: "pointerdown",
      },
    },
  },
}));
const files = vi.hoisted(() => ({ choose: vi.fn(), download: vi.fn(), save: vi.fn() }));
vi.mock("../campaigns/browser-campaign-file", () => ({
  chooseCampaignFile: files.choose,
  downloadCampaignFile: files.download,
}));
vi.mock("../campaigns/dev-campaign-api", () => ({
  isDevCampaignEditorAvailable: () => import.meta.env.DEV,
  saveBuiltInCampaign: files.save,
}));

import { getBuiltInCampaigns } from "../../core/campaigns/built-in-campaigns";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { CampaignEditorScene } from "./CampaignEditorScene";
import { CampaignLibraryScene } from "./CampaignLibraryScene";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
function tutorial() {
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  return campaign;
}
function storage() {
  let stored: string | null = null;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  return () => stored;
}
it("SAVE creates one independent local copy and updates it without source writes", async () => {
  const stored = storage();
  vi.stubEnv("DEV", true);
  const fixture = canvasFixture();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = tutorial();
  editor.create({ campaign, builtIn: true });
  const harness = editor as unknown as {
    model: { draft: typeof campaign; dirty: boolean };
    save(destination?: "local" | "built-in"): Promise<boolean>;
  };
  window.localStorage.setItem(
    "ai-war-game.campaigns.v1",
    JSON.stringify({
      schemaVersion: 1,
      campaigns: [{ ...campaign, id: `${campaign.id}-2` }],
    }),
  );
  harness.model.draft = { ...harness.model.draft, name: "Local lesson" };
  expect(await harness.save()).toBe(true);
  expect(harness.model.draft.id).toBe(`${campaign.id}-3`);
  expect(harness.model.draft.missions).toEqual(campaign.missions);
  harness.model.draft = { ...harness.model.draft, name: "Latest local lesson" };
  expect(await harness.save()).toBe(true);
  const entries = JSON.parse(stored() ?? "{}").campaigns;
  expect(entries).toHaveLength(2);
  expect(entries[1].name).toBe("Latest local lesson");
  expect(files.save).not.toHaveBeenCalled();
  expect(getBuiltInCampaigns()[0]).toEqual(campaign);
});
it("local SAVE failure retains the built-in draft and existing storage", async () => {
  storage();
  vi.stubEnv("DEV", true);
  const fixture = canvasFixture();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = tutorial();
  editor.create({ campaign, builtIn: true });
  const harness = editor as unknown as {
    model: { draft: typeof campaign; dirty: boolean };
    save(destination?: "local" | "built-in"): Promise<boolean>;
    message: string;
  };
  harness.model.draft = { ...harness.model.draft, name: "Unsaved" };
  vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(await harness.save()).toBe(false);
  expect(harness.model.draft.id).toBe(campaign.id);
  expect(harness.model.dirty).toBe(true);
  expect(harness.message).toContain("quota");
  expect(files.save).not.toHaveBeenCalled();
});
it("rejects production built-in editing in the library and direct scene entry", () => {
  storage();
  vi.stubEnv("DEV", false);
  const fixture = canvasFixture();
  const library = new CampaignLibraryScene();
  Object.assign(library, fixture.props);
  library.create();
  const root = (library as unknown as { root: Parameters<typeof fixture.click>[0] }).root;
  fixture.click(root, "OPEN / RENAME");
  expect(fixture.start).not.toHaveBeenCalled();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  editor.create({ campaign, builtIn: true });
  expect(fixture.start).toHaveBeenCalledWith("campaign-library");
  expect(files.save).not.toHaveBeenCalled();
});
it("offers DEV source save for new/local drafts and preserves local entries", async () => {
  const stored = storage();
  vi.stubEnv("DEV", true);
  const fixture = canvasFixture();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = { ...tutorial(), id: "new-lesson" };
  editor.create({ campaign, isNew: true, builtIn: false });
  const harness = editor as unknown as {
    root: Parameters<typeof fixture.click>[0];
    save(destination?: "local" | "built-in"): Promise<boolean>;
  };
  files.save.mockResolvedValue(undefined);
  fixture.click(harness.root, "BUILT IN SAVE");
  await vi.waitFor(() => expect((editor as unknown as { saving: boolean }).saving).toBe(false));
  expect(files.save).toHaveBeenCalledWith(campaign);
  expect(stored()).toBeNull();
  expect(await harness.save()).toBe(true);
  const before = stored();
  expect(await harness.save("built-in")).toBe(true);
  expect(stored()).toBe(before);
});
it("opens a local entry sharing a built-in ID in production and blocks source save", async () => {
  const stored = storage();
  vi.stubEnv("DEV", false);
  const campaign = { ...tutorial(), name: "Local same ID" };
  window.localStorage.setItem(
    "ai-war-game.campaigns.v1",
    JSON.stringify({ schemaVersion: 1, campaigns: [campaign] }),
  );
  const fixture = canvasFixture();
  const library = new CampaignLibraryScene();
  Object.assign(library, fixture.props);
  library.create();
  const libraryHarness = library as unknown as {
    selected: number;
    refresh(): void;
    root: Parameters<typeof fixture.click>[0];
  };
  libraryHarness.selected = getBuiltInCampaigns().length;
  libraryHarness.refresh();
  fixture.click(libraryHarness.root, "OPEN / RENAME");
  expect(fixture.start).toHaveBeenCalledWith("campaign-editor", { campaign, builtIn: false });
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  editor.create({ campaign, builtIn: false });
  const harness = editor as unknown as {
    save(destination?: "local" | "built-in"): Promise<boolean>;
    model: { draft: typeof campaign };
  };
  harness.model.draft = { ...harness.model.draft, name: "Updated local" };
  expect(await harness.save()).toBe(true);
  expect(JSON.parse(stored() ?? "{}").campaigns[0].name).toBe("Updated local");
  expect(await harness.save("built-in")).toBe(false);
  expect(files.save).not.toHaveBeenCalled();
});
it("saves DEV source without local storage and preserves dirty drafts on failure", async () => {
  const stored = storage();
  vi.stubEnv("DEV", true);
  const fixture = canvasFixture();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  editor.create({ campaign, builtIn: true });
  const harness = editor as unknown as {
    model: { draft: typeof campaign; dirty: boolean };
    save(destination?: "local" | "built-in"): Promise<boolean>;
    message: string;
  };
  harness.model.draft = { ...campaign, name: "Changed" };
  files.save.mockRejectedValueOnce(new Error("write failed"));
  expect(await harness.save("built-in")).toBe(false);
  expect(harness.model.dirty).toBe(true);
  expect(harness.message).toBe("write failed");
  expect(stored()).toBeNull();
  files.save.mockResolvedValueOnce(undefined);
  expect(await harness.save("built-in")).toBe(true);
  expect(harness.model.dirty).toBe(false);
  expect(files.save).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: "tutorial", name: "Changed" }),
  );
  expect(stored()).toBeNull();
});
it("imports builtin exports as local content in production and exports dirty drafts without saving", async () => {
  const stored = storage();
  vi.stubEnv("DEV", false);
  const fixture = canvasFixture();
  const library = new CampaignLibraryScene();
  Object.assign(library, fixture.props);
  library.create();
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  files.choose.mockResolvedValue(JSON.stringify(campaign));
  await (library as unknown as { importCampaign(): Promise<void> }).importCampaign();
  const copy = JSON.parse(stored() ?? "{}").campaigns[0];
  expect(copy.id).not.toBe(campaign.id);
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  editor.create({ campaign: copy });
  const harness = editor as unknown as {
    root: Parameters<typeof fixture.click>[0];
    model: { draft: typeof campaign; dirty: boolean };
  };
  harness.model.draft = { ...copy, name: "Unsaved" };
  const before = stored();
  fixture.click(harness.root, "EXPORT");
  expect(files.download).toHaveBeenCalledWith(
    "Unsaved",
    expect.stringContaining('"name": "Unsaved"'),
  );
  expect(stored()).toBe(before);
  expect(harness.model.dirty).toBe(true);
});

it("ignores imports completed after scene shutdown", async () => {
  const stored = storage();
  const fixture = canvasFixture();
  const library = new CampaignLibraryScene();
  Object.assign(library, fixture.props);
  library.create();
  let complete!: (value: string) => void;
  files.choose.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        complete = resolve;
      }),
  );
  const pending = (library as unknown as { importCampaign(): Promise<void> }).importCampaign();
  for (const [event, handler] of fixture.props.events.once.mock.calls) {
    if (event === "shutdown") handler();
  }
  complete(JSON.stringify(getBuiltInCampaigns()[0]));
  await pending;
  expect(stored()).toBeNull();
  expect(files.choose.mock.calls.at(-1)?.[0].aborted).toBe(true);
});

it("retains edits made during a source save and ignores saves after shutdown", async () => {
  storage();
  vi.stubEnv("DEV", true);
  const fixture = canvasFixture();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  editor.create({ campaign });
  const harness = editor as unknown as {
    model: { draft: typeof campaign; dirty: boolean };
    save(destination?: "local" | "built-in"): Promise<boolean>;
    message: string;
  };
  let complete!: () => void;
  files.save.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const saving = harness.save("built-in");
  harness.model.draft = { ...harness.model.draft, name: "Later edit" };
  complete();
  expect(await saving).toBe(true);
  expect(harness.model.dirty).toBe(true);
  files.save.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const late = harness.save("built-in");
  for (const [event, handler] of fixture.props.events.once.mock.calls) {
    if (event === "shutdown") handler();
  }
  const before = harness.message;
  complete();
  expect(await late).toBe(false);
  expect(harness.message).toBe(before);
  expect(harness.model.dirty).toBe(true);
});

it("SAVE AND LEAVE saves a built-in locally and keeps the editor on quota failure", async () => {
  const stored = storage();
  vi.stubEnv("DEV", true);
  const fixture = canvasFixture();
  const editor = new CampaignEditorScene();
  Object.assign(editor, fixture.props);
  const campaign = tutorial();
  editor.create({ campaign, builtIn: true });
  const harness = editor as unknown as {
    root: Parameters<typeof fixture.click>[0];
    model: { draft: typeof campaign; dirty: boolean };
    saveAndLeave(): Promise<void>;
    message: string;
  };
  harness.model.draft = { ...harness.model.draft, name: "Local on exit" };
  const write = vi.spyOn(window.localStorage, "setItem");
  write.mockImplementationOnce(() => {
    throw new Error("quota");
  });
  await harness.saveAndLeave();
  expect(fixture.start).not.toHaveBeenCalled();
  expect(harness.message).toContain("quota");
  expect(harness.model.dirty).toBe(true);
  expect(stored()).toBeNull();
  fixture.click(harness.root, "BACK");
  fixture.click(harness.root, "SAVE AND LEAVE");
  await vi.waitFor(() => expect(fixture.start).toHaveBeenCalledWith("campaign-library"));
  expect(JSON.parse(stored() ?? "{}").campaigns[0]).toMatchObject({
    id: "tutorial-2",
    name: "Local on exit",
  });
  expect(files.save).not.toHaveBeenCalled();
});

it.each(["newer edit", "shutdown"])(
  "local save ignores navigation after %s",
  async (interruption) => {
    const stored = storage();
    vi.stubEnv("DEV", false);
    const fixture = canvasFixture();
    const editor = new CampaignEditorScene();
    Object.assign(editor, fixture.props);
    const campaign = { ...tutorial(), id: "local-lesson" };
    editor.create({ campaign, isNew: true });
    const harness = editor as unknown as {
      model: { draft: typeof campaign; dirty: boolean };
      saveAndLeave(): Promise<void>;
      message: string;
    };
    const pending = harness.saveAndLeave();
    if (interruption === "newer edit")
      harness.model.draft = { ...harness.model.draft, name: "Later edit" };
    else
      for (const [event, handler] of fixture.props.events.once.mock.calls) {
        if (event === "shutdown") handler();
      }
    await pending;
    expect(fixture.start).not.toHaveBeenCalled();
    expect(JSON.parse(stored() ?? "{}").campaigns[0].name).toBe(campaign.name);
    if (interruption === "newer edit") expect(harness.model.dirty).toBe(true);
    else expect(harness.message).toBe("");
  },
);
