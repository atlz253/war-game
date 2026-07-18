import { describe, expect, it } from "vitest";

import { calculateInertialCameraVelocity } from "./camera-inertia";

const ONE_SECOND = 1000;
const FLOAT_PRECISION = 10;
const CAMERA_SPEED = 600;
const EXPECTED_DIAGONAL_VELOCITY = 424.2640687119285;

describe("calculateInertialCameraVelocity", () => {
  it("applies keyboard movement immediately without making diagonals faster", () => {
    const velocity = calculateInertialCameraVelocity({
      velocityX: 0,
      velocityY: 0,
      horizontal: 1,
      vertical: -1,
      speed: CAMERA_SPEED,
      deltaMs: ONE_SECOND,
      deceleration: 8,
    });

    expect(velocity.x).toBeCloseTo(EXPECTED_DIAGONAL_VELOCITY, FLOAT_PRECISION);
    expect(velocity.y).toBeCloseTo(-EXPECTED_DIAGONAL_VELOCITY, FLOAT_PRECISION);
  });

  it("smoothly slows the camera after keyboard input ends", () => {
    const velocity = calculateInertialCameraVelocity({
      velocityX: CAMERA_SPEED,
      velocityY: 0,
      horizontal: 0,
      vertical: 0,
      deltaMs: ONE_SECOND,
      speed: CAMERA_SPEED,
      deceleration: 4,
    });

    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.x).toBeLessThan(CAMERA_SPEED);
    expect(velocity.y).toBe(0);
  });
});
