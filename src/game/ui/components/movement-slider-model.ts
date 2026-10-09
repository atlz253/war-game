import {
  MOVEMENT_SLIDER_MAX,
  MOVEMENT_SLIDER_MIN,
  MOVEMENT_SLIDER_STEP,
  movementDuration,
} from "../../presentation/movement-settings";

export function sliderValueAt(localX: number, trackWidth: number): number {
  const fraction = Math.max(0, Math.min(1, localX / trackWidth));
  return Math.round((fraction * MOVEMENT_SLIDER_MAX) / MOVEMENT_SLIDER_STEP) * MOVEMENT_SLIDER_STEP;
}

export function sliderKeyValue(value: number, key: string): number | null {
  if (key === "Home") return MOVEMENT_SLIDER_MIN;
  if (key === "End") return MOVEMENT_SLIDER_MAX;
  const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[key];
  return direction === undefined
    ? null
    : Math.max(
        MOVEMENT_SLIDER_MIN,
        Math.min(MOVEMENT_SLIDER_MAX, value + direction * MOVEMENT_SLIDER_STEP),
      );
}

export function movementSpeedLabel(value: number): string {
  const duration = movementDuration(value);
  return duration === 0 ? "No animation" : `${duration} ms / cell`;
}
