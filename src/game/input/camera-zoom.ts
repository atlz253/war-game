export const MIN_MAP_ZOOM = 0.5;
export const MAX_MAP_ZOOM = 1;
export const WHEEL_ZOOM_STEP = 0.001;
export const INITIAL_MAP_ZOOM = MIN_MAP_ZOOM;

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
