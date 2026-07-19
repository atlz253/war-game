const BASE_REPLAY_ACTION_DELAY_MS = 800;
const FIRST_FRAME_INDEX = 0;
const FRAME_INCREMENT = 1;

export function getPreviousReplayFrameIndex(frameIndex: number): number {
  return Math.max(FIRST_FRAME_INDEX, frameIndex - FRAME_INCREMENT);
}

export function getNextReplayFrameIndex(frameIndex: number, frameCount: number): number {
  return Math.min(
    Math.max(frameCount - FRAME_INCREMENT, FIRST_FRAME_INDEX),
    frameIndex + FRAME_INCREMENT,
  );
}

export function getReplayDelay(speed: number): number {
  return BASE_REPLAY_ACTION_DELAY_MS / speed;
}
