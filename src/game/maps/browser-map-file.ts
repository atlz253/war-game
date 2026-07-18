const MAP_FILE_EXTENSION = ".ai-war-map.json";
const MAP_FILE_MIME_TYPE = "application/json";

export function downloadMapFile(name: string, serializedMap: string): void {
  const blob = new Blob([serializedMap], { type: MAP_FILE_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}${MAP_FILE_EXTENSION}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function chooseMapFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = MAP_FILE_MIME_TYPE;
    input.onchange = () => readSelectedFile(input.files?.item(0) ?? null, resolve);
    input.click();
  });
}

function readSelectedFile(file: File | null, resolve: (value: string | null) => void): void {
  if (!file) {
    resolve(null);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
  reader.onerror = () => resolve(null);
  reader.readAsText(file);
}
