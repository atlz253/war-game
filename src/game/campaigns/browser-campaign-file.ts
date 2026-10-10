import { CAMPAIGN_FILE_EXTENSION } from "./campaign-file-format";

const MIME_TYPE = "application/json";
export function downloadCampaignFile(name: string, serialized: string): void {
  const url = URL.createObjectURL(new Blob([serialized], { type: MIME_TYPE }));
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement("a");
    link.hidden = true;
    link.href = url;
    link.download = `${name}${CAMPAIGN_FILE_EXTENSION}`;
    document.body.append(link);
    link.click();
  } finally {
    link?.remove();
    URL.revokeObjectURL(url);
  }
}
export function chooseCampaignFile(signal?: AbortSignal): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.hidden = true;
    input.type = "file";
    input.accept = MIME_TYPE;
    let settled = false;
    const removePicker = () => {
      input.onchange = null;
      input.oncancel = null;
      input.remove();
    };
    const finish = (value: string | null, error?: unknown) => {
      if (settled) return;
      settled = true;
      removePicker();
      signal?.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve(value);
    };
    const cancel = () => finish(null);
    input.oncancel = cancel;
    input.onchange = () => {
      const file = input.files?.item(0);
      removePicker();
      if (!file) return finish(null);
      void file.text().then(
        (value) => finish(value),
        (error) => finish(null, error),
      );
    };
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) return cancel();
    try {
      document.body.append(input);
      input.click();
    } catch (error) {
      finish(null, error);
    }
  });
}
