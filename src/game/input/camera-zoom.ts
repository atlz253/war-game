export const MIN_MAP_ZOOM = 0.25;
export const MAX_MAP_ZOOM = 1;
export const WHEEL_ZOOM_STEP = 0.001;
export const INITIAL_MAP_ZOOM = MIN_MAP_ZOOM;
const MILLISECONDS_PER_SECOND = 1000;
const ZOOM_SETTLE_DISTANCE = 0.001;

export interface AnchoredScrollOptions {
  scrollX: number;
  scrollY: number;
  pointerX: number;
  pointerY: number;
  previousZoom: number;
  nextZoom: number;
}

export interface CameraScroll {
  x: number;
  y: number;
}

export interface InertialZoomOptions {
  currentZoom: number;
  targetZoom: number;
  deltaMs: number;
  responsePerSecond: number;
}

export function calculateNextZoom(currentZoom: number, wheelDeltaY: number): number {
  const nextZoom = currentZoom - wheelDeltaY * WHEEL_ZOOM_STEP;

  return Math.min(Math.max(nextZoom, MIN_MAP_ZOOM), MAX_MAP_ZOOM);
}

export function calculateAnchoredScroll(options: AnchoredScrollOptions): CameraScroll {
  const worldX = options.scrollX + options.pointerX / options.previousZoom;
  const worldY = options.scrollY + options.pointerY / options.previousZoom;

  return {
    x: worldX - options.pointerX / options.nextZoom,
    y: worldY - options.pointerY / options.nextZoom,
  };
}

export function calculateInertialZoom(options: InertialZoomOptions): number {
  const zoomDistance = options.targetZoom - options.currentZoom;

  if (Math.abs(zoomDistance) <= ZOOM_SETTLE_DISTANCE) {
    return options.targetZoom;
  }

  const progress =
    1 - Math.exp((-options.responsePerSecond * options.deltaMs) / MILLISECONDS_PER_SECOND);
  return options.currentZoom + zoomDistance * progress;
}
