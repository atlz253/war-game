export interface DraggedScrollInput {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly zoom: number;
}

export function calculateDraggedScroll(input: DraggedScrollInput): { x: number; y: number } {
  return {
    x: input.scrollX - input.deltaX / input.zoom,
    y: input.scrollY - input.deltaY / input.zoom,
  };
}
