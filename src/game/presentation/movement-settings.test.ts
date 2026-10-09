import { describe, expect, it } from "vitest";
import { MOVEMENT_SETTINGS_KEY, MovementSettings, movementDuration } from "./movement-settings";

const SLOW_DURATION_MS = 400;
const DEFAULT_SLIDER_VALUE = 50;
const DEFAULT_DURATION_MS = 200;
const INSTANT_SLIDER_VALUE = 100;
const DURATION_STEP_MS = 4;
const SAVED_SLIDER_VALUE = 73;
const SESSION_SLIDER_VALUE = 61;
const ABOVE_SLIDER_RANGE = 101;
const INVALID_FRACTIONAL_VALUE = 3.5;

describe("movement settings", () => {
  it("maps all slider positions monotonically including instant and default", () => {
    expect(movementDuration(0)).toBe(SLOW_DURATION_MS);
    expect(movementDuration(DEFAULT_SLIDER_VALUE)).toBe(DEFAULT_DURATION_MS);
    expect(movementDuration(INSTANT_SLIDER_VALUE)).toBe(0);
    for (let value = 1; value <= INSTANT_SLIDER_VALUE; value++) {
      expect(movementDuration(value)).toBe(movementDuration(value - 1) - DURATION_STEP_MS);
    }
  });
  it("persists an intermediate value", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const settings = new MovementSettings(storage);
    expect(settings.load()).toBe(DEFAULT_SLIDER_VALUE);
    settings.save(SAVED_SLIDER_VALUE);
    expect(new MovementSettings(storage).load()).toBe(SAVED_SLIDER_VALUE);
    expect(data.has(MOVEMENT_SETTINGS_KEY)).toBe(true);
  });
  it.each(["oops", "null", '"50"', "-1", "101", "2.5", "{}", "1e999"])("rejects %s", (value) => {
    expect(new MovementSettings({ getItem: () => value, setItem: () => {} }).load()).toBe(
      DEFAULT_SLIDER_VALUE,
    );
  });
  it("retains session choices when storage throws", () => {
    const settings = new MovementSettings({
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    expect(settings.load()).toBe(DEFAULT_SLIDER_VALUE);
    settings.save(SESSION_SLIDER_VALUE);
    expect(settings.load()).toBe(SESSION_SLIDER_VALUE);
    for (const invalid of [NaN, Infinity, -1, ABOVE_SLIDER_RANGE, INVALID_FRACTIONAL_VALUE]) {
      settings.save(invalid);
      expect(settings.load()).toBe(SESSION_SLIDER_VALUE);
    }
  });
});
