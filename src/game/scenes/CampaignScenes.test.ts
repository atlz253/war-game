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

import { getBuiltInCampaigns } from "../../core/campaigns/built-in-campaigns";
import { canvasFixture } from "../campaigns/canvas-test-fixture";
import { CampaignEditorScene } from "./CampaignEditorScene";
import { CampaignLibraryScene } from "./CampaignLibraryScene";

afterEach(() => vi.unstubAllGlobals());
it("keeps built-in tutorial playable on corrupt storage and disables delete", () => {
  vi.stubGlobal("window", { localStorage: { getItem: () => "corrupt", setItem: vi.fn() } });
  const fixture = canvasFixture();
  const scene = new CampaignLibraryScene();
  Object.assign(scene, fixture.props);
  scene.create();
  const root = (scene as unknown as { root: Parameters<typeof fixture.click>[0] }).root;
  fixture.click(root, "DELETE");
  expect(fixture.start).not.toHaveBeenCalled();
  fixture.click(root, "PLAY");
  expect(fixture.start).toHaveBeenCalledWith(
    "battle",
    expect.objectContaining({ campaignRun: expect.any(Object) }),
  );
  expect(fixture.descendants(root).some((item) => item.text.includes("JSON"))).toBe(true);
});
it("saves built-ins as independent local copies and requires Save/Discard/Cancel on exit", () => {
  let stored: string | null = null;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  const fixture = canvasFixture();
  const scene = new CampaignEditorScene();
  Object.assign(scene, fixture.props);
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  scene.create({ campaign, builtIn: true });
  const root = (scene as unknown as { root: Parameters<typeof fixture.click>[0] }).root;
  fixture.click(root, "SAVE AS COPY");
  const copy = JSON.parse(stored ?? "{}").campaigns[0];
  expect(copy.id).not.toBe(campaign.id);
  fixture.click(root, "+ MISSION");
  fixture.click(root, "BACK");
  expect(fixture.descendants(root).some((item) => item.text === "SAVE AND LEAVE")).toBe(true);
  fixture.click(root, "CANCEL");
  expect(fixture.start).not.toHaveBeenCalled();
  fixture.click(root, "BACK");
  fixture.click(root, "DISCARD AND LEAVE");
  expect(fixture.start).toHaveBeenCalledWith("campaign-library");
});

it("opens, creates and deletes local drafts while disabling unready Play", () => {
  let stored = JSON.stringify({
    schemaVersion: 1,
    campaigns: [{ schemaVersion: 1, id: "draft", name: "Draft", missions: [] }],
  });
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  const fixture = canvasFixture();
  const scene = new CampaignLibraryScene();
  Object.assign(scene, fixture.props);
  scene.create();
  const root = (scene as unknown as { root: Parameters<typeof fixture.click>[0] }).root;
  fixture.click(root, "Draft");
  fixture.click(root, "PLAY");
  expect(fixture.start).not.toHaveBeenCalled();
  fixture.click(root, "OPEN / RENAME");
  expect(fixture.start).toHaveBeenLastCalledWith(
    "campaign-editor",
    expect.objectContaining({ campaign: expect.objectContaining({ id: "draft" }) }),
  );
  fixture.click(root, "DELETE");
  expect(JSON.parse(stored).campaigns).toEqual([]);
  fixture.click(root, "CREATE");
  expect(fixture.start).toHaveBeenLastCalledWith(
    "campaign-editor",
    expect.objectContaining({ isNew: true }),
  );
});

it("applies mission settings and saves dirty drafts before leaving", () => {
  let stored: string | null = null;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  const fixture = canvasFixture();
  const scene = new CampaignEditorScene();
  Object.assign(scene, fixture.props);
  const campaign = getBuiltInCampaigns()[0];
  if (!campaign) throw new Error("Missing tutorial");
  scene.create({ campaign });
  const root = (scene as unknown as { root: Parameters<typeof fixture.click>[0] }).root;
  fixture.click(root, "BLUE: ANY");
  expect(
    fixture
      .descendants(root)
      .some((item) => item.text.includes("blue-infantry-1: blue infantry (0, 1)")),
  ).toBe(true);
  fixture.click(root, "STANDARD + REACH CELL");
  fixture.click(root, "STANDARD VICTORY");
  fixture.click(root, "MAP >");
  fixture.click(root, "CONFIRM MAP BINDINGS");
  fixture.click(root, "BACK");
  fixture.click(root, "SAVE AND LEAVE");
  const saved = JSON.parse(stored ?? "{}").campaigns[0];
  expect(saved.missions[0].conditions).toMatchObject({
    type: "standard-match-or-reach-cell",
    mapBinding: saved.missions[0].builtInMapId,
  });
  expect(saved.missions[0].id).toBe(campaign.missions[0]?.id);
  expect(fixture.start).toHaveBeenLastCalledWith("campaign-library");
});
