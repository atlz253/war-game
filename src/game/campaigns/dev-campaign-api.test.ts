import { afterEach, expect, it, vi } from "vitest";
import { campaign } from "../../core/campaigns/test-fixtures";
import { saveBuiltInCampaign } from "./dev-campaign-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("sends a validated definition only in DEV and reports failed responses", async () => {
  vi.stubEnv("DEV", true);
  const fetch = vi.fn().mockResolvedValue({ ok: false });
  vi.stubGlobal("fetch", fetch);
  await expect(saveBuiltInCampaign(campaign)).rejects.toThrow(/rejected/);
  expect(fetch).toHaveBeenCalledWith(
    "/__dev-campaigns",
    expect.objectContaining({ method: "POST", body: JSON.stringify(campaign, null, 2) }),
  );
  fetch.mockResolvedValue({ ok: true });
  await expect(saveBuiltInCampaign(campaign)).resolves.toBeUndefined();
  vi.stubEnv("DEV", false);
  fetch.mockClear();
  await expect(saveBuiltInCampaign(campaign)).rejects.toThrow(/DEV/);
  expect(fetch).not.toHaveBeenCalled();
});
