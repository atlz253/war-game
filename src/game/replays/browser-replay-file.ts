const REPLAY_FILE_EXTENSION = ".ai-war-replay.json";
const REPLAY_FILE_MIME_TYPE = "application/json";

export function downloadReplayFile(name: string, serializedReplay: string): void {
  const blob = new Blob([serializedReplay], { type: REPLAY_FILE_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}${REPLAY_FILE_EXTENSION}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function chooseReplayFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = REPLAY_FILE_MIME_TYPE;
    input.onchange = () => readReplayFile(input.files?.item(0) ?? null, resolve);
    input.click();
  });
}

function readReplayFile(file: File | null, resolve: (value: string | null) => void): void {
  if (!file) {
    resolve(null);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
  reader.onerror = () => resolve(null);
  reader.readAsText(file);
}
