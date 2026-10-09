import type { StorageLike } from "../lm-studio/lm-studio-settings";

export const MOVEMENT_SLIDER_MIN = 0;
export const MOVEMENT_SLIDER_MAX = 100;
export const MOVEMENT_SLIDER_STEP = 1;
export const DEFAULT_MOVEMENT_SPEED = 50;
export const MAX_CELL_DURATION_MS = 400;
export const MOVEMENT_SETTINGS_KEY = "ai-war-game.movement-speed.v1";

export function isMovementSpeed(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MOVEMENT_SLIDER_MIN &&
    value <= MOVEMENT_SLIDER_MAX
  );
}

export function movementDuration(value: number): number {
  return (
    (MAX_CELL_DURATION_MS * (MOVEMENT_SLIDER_MAX - value)) /
    (MOVEMENT_SLIDER_MAX - MOVEMENT_SLIDER_MIN)
  );
}

/** Local presentation preference only; storage failures preserve the session choice. */
export class MovementSettings {
  private value = DEFAULT_MOVEMENT_SPEED;
  private sessionOnly = false;
  public constructor(private readonly storage?: StorageLike) {}

  public load(): number {
    if (this.sessionOnly) return this.value;
    try {
      const raw = this.storage?.getItem(MOVEMENT_SETTINGS_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : DEFAULT_MOVEMENT_SPEED;
      this.value = isMovementSpeed(parsed) ? parsed : DEFAULT_MOVEMENT_SPEED;
    } catch {
      this.sessionOnly = true;
    }
    return this.value;
  }

  public save(value: number): void {
    if (!isMovementSpeed(value)) return;
    this.value = value;
    try {
      if (this.storage) this.storage.setItem(MOVEMENT_SETTINGS_KEY, JSON.stringify(value));
      else this.sessionOnly = true;
    } catch {
      this.sessionOnly = true;
    }
  }
}

let browserSettings: MovementSettings | undefined;
export function getMovementSettings(): MovementSettings {
  if (!browserSettings) {
    try {
      browserSettings = new MovementSettings(window.localStorage);
    } catch {
      browserSettings = new MovementSettings();
    }
  }
  return browserSettings;
}
