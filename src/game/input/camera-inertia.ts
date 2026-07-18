const MILLISECONDS_PER_SECOND = 1000;
const STOP_VELOCITY = 1;

export interface InertialCameraVelocityInput {
  readonly velocityX: number;
  readonly velocityY: number;
  readonly horizontal: number;
  readonly vertical: number;
  readonly speed: number;
  readonly deltaMs: number;
  readonly deceleration: number;
}

export function calculateInertialCameraVelocity(input: InertialCameraVelocityInput): {
  x: number;
  y: number;
} {
  const directionLength = Math.hypot(input.horizontal, input.vertical);

  if (directionLength > 0) {
    return {
      x: (input.horizontal / directionLength) * input.speed,
      y: (input.vertical / directionLength) * input.speed,
    };
  }

  const retention = Math.exp((-input.deceleration * input.deltaMs) / MILLISECONDS_PER_SECOND);

  return {
    x: stopIfSlow(input.velocityX * retention),
    y: stopIfSlow(input.velocityY * retention),
  };
}

function stopIfSlow(velocity: number): number {
  return Math.abs(velocity) < STOP_VELOCITY ? 0 : velocity;
}
