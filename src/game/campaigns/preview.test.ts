import type Phaser from "phaser";
import { expect, it, vi } from "vitest";
import { map } from "../../core/campaigns/test-fixtures";
import { createCampaignPreview } from "./preview";

it("uses bounded existing sprites rather than a full-screen battle background", () => {
  const sprite = () => ({
    setDisplaySize: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
  });
  const image = vi.fn(sprite);
  const container = { setScale: vi.fn(), add: vi.fn() };
  const scene = {
    add: { container: () => container, image, rectangle: sprite },
  } as unknown as Phaser.Scene;
  createCampaignPreview(
    scene,
    { add: vi.fn() } as unknown as Phaser.GameObjects.Container,
    map,
    { x: 11, y: 2 },
    vi.fn(),
  );
  expect(image).toHaveBeenCalled();
});
