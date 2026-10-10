import { afterEach, expect, it, vi } from "vitest";
import { chooseCampaignFile, downloadCampaignFile } from "./browser-campaign-file";

afterEach(() => vi.unstubAllGlobals());
function browser() {
  const nodes: Array<{
    remove: ReturnType<typeof vi.fn>;
    click: ReturnType<typeof vi.fn>;
    onchange?: (() => void) | null;
    oncancel?: (() => void) | null;
    files?: { item(): { text(): Promise<string> } | null };
  }> = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const node = { remove: vi.fn(), click: vi.fn() };
      nodes.push(node);
      return node;
    },
    body: { append: vi.fn() },
  });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: () => "blob:campaign", revokeObjectURL: revoke });
  return { nodes, revoke };
}
it("reads a selected file and removes the picker and handlers", async () => {
  const { nodes } = browser();
  const pending = chooseCampaignFile();
  const input = nodes[0];
  if (!input) throw new Error("Missing picker");
  input.files = { item: () => ({ text: async () => "campaign" }) };
  input.onchange?.();
  await expect(pending).resolves.toBe("campaign");
  expect(input.remove).toHaveBeenCalled();
  expect(input.onchange).toBeNull();
});
it("cancels selection and aborts pending reads without retaining elements", async () => {
  const { nodes } = browser();
  const canceled = chooseCampaignFile();
  nodes[0]?.oncancel?.();
  await expect(canceled).resolves.toBeNull();
  const abort = new AbortController();
  const pending = chooseCampaignFile(abort.signal);
  abort.abort();
  await expect(pending).resolves.toBeNull();
  expect(nodes[1]?.remove).toHaveBeenCalled();
});
it("cleans up picker read failures and download URLs", async () => {
  const { nodes, revoke } = browser();
  const pending = chooseCampaignFile();
  const input = nodes[0];
  if (!input) throw new Error("Missing picker");
  input.files = {
    item: () => ({
      text: async () => {
        throw new Error("read failed");
      },
    }),
  };
  input.onchange?.();
  await expect(pending).rejects.toThrow("read failed");
  downloadCampaignFile("Lesson", "{}");
  expect(nodes[1]?.remove).toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:campaign");
});

it("aborts a file read already in progress and removes failed download links", async () => {
  const { nodes, revoke } = browser();
  const abort = new AbortController();
  const pending = chooseCampaignFile(abort.signal);
  let complete!: (text: string) => void;
  const input = nodes[0];
  if (!input) throw new Error("Missing picker");
  input.files = {
    item: () => ({
      text: () =>
        new Promise<string>((resolve) => {
          complete = resolve;
        }),
    }),
  };
  input.onchange?.();
  abort.abort();
  complete("late");
  await expect(pending).resolves.toBeNull();
  const create = document.createElement;
  vi.stubGlobal("document", {
    ...document,
    createElement: () => {
      const link = create("a");
      link.click = () => {
        throw new Error("download failed");
      };
      return link;
    },
  });
  expect(() => downloadCampaignFile("Lesson", "{}")).toThrow("download failed");
  expect(nodes[1]?.remove).toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:campaign");
});
