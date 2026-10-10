import type { Position } from "../../core/model/game-state";
import type { PresentationViewport } from "../config/presentation-layout";

export function logicalPointer(pointer: Position, viewport: PresentationViewport): Position | null {
  const x = pointer.x - viewport.x;
  const y = pointer.y - viewport.y;
  if (x < 0 || x >= viewport.width || y < 0 || y >= viewport.height) return null;
  return { x: Math.floor(x / viewport.scale), y: Math.floor(y / viewport.scale) };
}
export interface CameraCenterLimitsOptions {
  readonly requestedCenterX: number;
  readonly requestedCenterY: number;
  readonly boardLeft: number;
  readonly boardTop: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
}

export interface CameraCenterLimits {
  readonly centerX: number;
  readonly centerY: number;
  readonly canPanHorizontally: boolean;
  readonly canPanVertically: boolean;
}

export function calculateCameraCenterLimits({
  requestedCenterX,
  requestedCenterY,
  boardLeft,
  boardTop,
  visibleWidth,
  visibleHeight,
  boardWidth,
  boardHeight,
}: CameraCenterLimitsOptions): CameraCenterLimits {
  const horizontal = calculateAxisCenterLimits(
    requestedCenterX,
    boardLeft,
    boardWidth,
    visibleWidth,
  );
  const vertical = calculateAxisCenterLimits(
    requestedCenterY,
    boardTop,
    boardHeight,
    visibleHeight,
  );

  return {
    centerX: horizontal.center,
    centerY: vertical.center,
    canPanHorizontally: horizontal.canPan,
    canPanVertically: vertical.canPan,
  };
}

function calculateAxisCenterLimits(
  requestedCenter: number,
  boardStart: number,
  boardSize: number,
  visibleSize: number,
): { center: number; canPan: boolean } {
  const boardCenter = boardStart + boardSize / 2;
  if (boardSize <= visibleSize) return { center: boardCenter, canPan: false };

  const halfVisibleSize = visibleSize / 2;
  return {
    center: Math.min(
      Math.max(requestedCenter, boardStart + halfVisibleSize),
      boardStart + boardSize - halfVisibleSize,
    ),
    canPan: true,
  };
}
