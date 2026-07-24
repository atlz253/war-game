import { describe, expect, it } from "vitest";

import type { GameAction } from "../actions/game-actions";
import { getLegalActions } from "../actions/get-legal-actions";
import type { GameState } from "../model/game-state";
import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { applyAction } from "./apply-action";
import { canUnitAttackTarget } from "./attack-range";
import { validateAction } from "./validate-action";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const BLUE_INFANTRY_TWO_ID = "blue-infantry-2";
const RED_INFANTRY_ID = "red-infantry-1";
const RED_INFANTRY_TWO_ID = "red-infantry-2";
const RED_TANK_ID = "red-tank-1";
const BLUE_TANK_ID = "blue-tank-1";
const BLUE_ARTILLERY_ID = "blue-artillery-1";
const CONTROL_POINT_ID = "control-point-1";
const CONTROL_POINT_POSITION = { x: 5, y: 3 };
const ADJACENT_CONTROL_POINT_ATTACKER_POSITION = { x: 4, y: 3 };
const BLUE_INFANTRY_MAX_MOVEMENT = 4;
const TANK_MAX_MOVEMENT = 5;
const MOVEMENT_COST = 3;
const ATTACK_DAMAGE = 3;
const UNIT_DESTRUCTION_DAMAGE = 10;
const TANK_HEALTH = 16;
const ARTILLERY_DAMAGE_TO_TANK = 4;
const ARTILLERY_DAMAGE_TO_TANK_WITH_ONE_POSITIONAL_DEFENCE = 3;
const ARTILLERY_DAMAGE_TO_TANK_WITH_TWO_POSITIONAL_DEFENCES = 2;
const NEXT_TURN = 2;
const OUT_OF_BOUNDS_DESTINATION = { x: 12, y: 1 };
const OCCUPIED_DESTINATION = { x: 1, y: 3 };
const INSUFFICIENT_MOVEMENT_DESTINATION = { x: 6, y: 1 };
const DISTANT_TARGET_POSITION = { x: 4, y: 1 };
const MOUNTAIN_POSITION = { x: 2, y: 1 };
const ARTILLERY_MINIMUM_RANGE = 2;
const ARTILLERY_MAXIMUM_RANGE = 4;
const ARTILLERY_MOVE_DESTINATION = { x: 3, y: 0 };
const ARTILLERY_TARGET_POSITION = { x: 5, y: 0 };
const DAMAGE_WITH_ONE_DEFENCE_BONUS = 2;
const MINIMUM_DAMAGE = 1;
const CAPTURE_SCORE = 5;
const OVERKILL_TARGET_HEALTH = 2;
const CONTROL_POINT_HEAL_AMOUNT = 2;
const DAMAGED_INFANTRY_HEALTH = 5;
const NEAR_MAXIMUM_INFANTRY_HEALTH = 9;
const INITIAL_SCORES = { blue: 0, red: 0 };
const INFANTRY_MAX_AMMO = 6;
const INFANTRY_AMMO_AFTER_SHOT = INFANTRY_MAX_AMMO - 1;

function withArtillery(state: GameState, position: { x: number; y: number }): GameState {
  const infantry = state.units[BLUE_INFANTRY_ID];

  return {
    ...state,
    units: {
      ...state.units,
      [BLUE_ARTILLERY_ID]: {
        ...infantry,
        id: BLUE_ARTILLERY_ID,
        type: "artillery" as const,
        position,
        attackRange: ARTILLERY_MAXIMUM_RANGE,
        minAttackRange: ARTILLERY_MINIMUM_RANGE,
      },
    },
  };
}

function withTargetPosition(state: GameState, position: { x: number; y: number }): GameState {
  return {
    ...state,
    units: {
      ...state.units,
      [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position },
    },
  };
}

function withMountainBetween(state: GameState, position: { x: number; y: number }): GameState {
  return {
    ...state,
    board: { ...state.board, terrain: [{ type: "mountain" as const, position }] },
  };
}

function validateArtilleryAttack(state: GameState, targetPosition: { x: number; y: number }) {
  return validateAction(withTargetPosition(state, targetPosition), {
    type: "attack",
    unitId: BLUE_ARTILLERY_ID,
    targetUnitId: RED_INFANTRY_ID,
  });
}

const moveAction: GameAction = {
  type: "move",
  unitId: BLUE_INFANTRY_ID,
  destination: { x: 4, y: 1 },
};

describe("movement rules", () => {
  it("moves through a deterministic eight-direction path and spends its cost", () => {
    const result = applyAction(createSkirmishGameState(), moveAction);

    expect(result.accepted).toBe(true);
    expect(result.state.units[BLUE_INFANTRY_ID]?.position).toEqual(moveAction.destination);
    expect(result.state.units[BLUE_INFANTRY_ID]?.movementPoints).toBe(
      BLUE_INFANTRY_MAX_MOVEMENT - MOVEMENT_COST,
    );
    expect(result.events).toEqual([
      expect.objectContaining({ type: "unit-moved", unitId: BLUE_INFANTRY_ID }),
    ]);
    expect(result.state.scores).toEqual(INITIAL_SCORES);
  });

  it("rejects a diagonal route that cuts between two occupied orthogonal cells", () => {
    const state = createSkirmishGameState();
    const blockedState = {
      ...state,
      board: { ...state.board, width: 3, height: 3 },
      units: {
        ...state.units,
        [BLUE_INFANTRY_TWO_ID]: {
          ...state.units[BLUE_INFANTRY_TWO_ID],
          position: { x: 2, y: 1 },
        },
        [RED_INFANTRY_TWO_ID]: {
          ...state.units[RED_INFANTRY_TWO_ID],
          position: { x: 1, y: 2 },
        },
      },
    };
    const action: GameAction = {
      type: "move",
      unitId: BLUE_INFANTRY_ID,
      destination: { x: 2, y: 2 },
    };

    expect(validateAction(blockedState, action)).toEqual({
      isValid: false,
      reason: "destination-unreachable",
    });
  });
});

describe("movement validation", () => {
  it("rejects occupied, out-of-bounds, and over-budget destinations", () => {
    const state = createSkirmishGameState();
    const occupiedAction: GameAction = {
      type: "move",
      unitId: BLUE_INFANTRY_ID,
      destination: OCCUPIED_DESTINATION,
    };
    const outOfBoundsAction: GameAction = {
      type: "move",
      unitId: BLUE_INFANTRY_ID,
      destination: OUT_OF_BOUNDS_DESTINATION,
    };
    const insufficientMovementAction: GameAction = {
      type: "move",
      unitId: BLUE_INFANTRY_ID,
      destination: INSUFFICIENT_MOVEMENT_DESTINATION,
    };

    expect(validateAction(state, occupiedAction)).toEqual({
      isValid: false,
      reason: "destination-unreachable",
    });
    expect(validateAction(state, outOfBoundsAction)).toEqual({
      isValid: false,
      reason: "destination-unreachable",
    });
    expect(validateAction(state, insufficientMovementAction)).toEqual({
      isValid: false,
      reason: "destination-unreachable",
    });
  });

  it("rejects orders for a unit owned by the inactive side", () => {
    const action: GameAction = {
      type: "move",
      unitId: RED_INFANTRY_ID,
      destination: { x: 9, y: 1 },
    };

    expect(validateAction(createSkirmishGameState(), action)).toEqual({
      isValid: false,
      reason: "unit-not-active-side",
    });
  });
});

describe("terrain movement", () => {
  it("allows infantry but not tanks to enter mountains", () => {
    const state = createSkirmishGameState();
    const mountainState = {
      ...state,
      board: {
        ...state.board,
        terrain: [{ type: "mountain" as const, position: MOUNTAIN_POSITION }],
      },
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [BLUE_TANK_ID]: { ...state.units[BLUE_TANK_ID], position: { x: 1, y: 2 } },
      },
    };

    expect(
      validateAction(mountainState, {
        type: "move",
        unitId: BLUE_INFANTRY_ID,
        destination: MOUNTAIN_POSITION,
      }),
    ).toEqual({ isValid: true });
    expect(
      validateAction(mountainState, {
        type: "move",
        unitId: BLUE_TANK_ID,
        destination: MOUNTAIN_POSITION,
      }),
    ).toEqual({ isValid: false, reason: "destination-unreachable" });
  });

  it("treats mountains as impassable diagonal corners for tanks", () => {
    const state = createSkirmishGameState();
    const mountainState = {
      ...state,
      board: {
        ...state.board,
        width: 3,
        height: 3,
        blockedCells: [{ x: 1, y: 2 }],
        terrain: [{ type: "mountain" as const, position: MOUNTAIN_POSITION }],
      },
      units: {
        [BLUE_TANK_ID]: { ...state.units[BLUE_TANK_ID], position: { x: 1, y: 1 } },
      },
    };

    expect(
      validateAction(mountainState, {
        type: "move",
        unitId: BLUE_TANK_ID,
        destination: { x: 2, y: 2 },
      }),
    ).toEqual({ isValid: false, reason: "destination-unreachable" });
  });
});

describe("control point movement", () => {
  it("allows a unit to move onto a control point before capturing it", () => {
    const state = createSkirmishGameState();
    const controlPoint = state.controlPoints[CONTROL_POINT_ID];
    const moveResult = applyAction(state, {
      type: "move",
      unitId: BLUE_INFANTRY_TWO_ID,
      destination: controlPoint?.position,
    });

    const captureResult = applyAction(moveResult.state, {
      type: "capture",
      unitId: BLUE_INFANTRY_TWO_ID,
      controlPointId: CONTROL_POINT_ID,
    });

    expect(moveResult.accepted).toBe(true);
    expect(moveResult.state.units[BLUE_INFANTRY_TWO_ID]?.position).toEqual(controlPoint?.position);
    expect(captureResult.accepted).toBe(true);
    expect(captureResult.state.controlPoints[CONTROL_POINT_ID]?.owner).toBe("blue");
  });
});

describe("main action rules", () => {
  it("allows infantry and tanks to attack enemies on an already captured control point", () => {
    const state = createSkirmishGameState();

    for (const attackerId of [BLUE_INFANTRY_ID, BLUE_TANK_ID]) {
      const controlPointState = {
        ...state,
        controlPoints: {
          ...state.controlPoints,
          [CONTROL_POINT_ID]: { ...state.controlPoints[CONTROL_POINT_ID], owner: "blue" as const },
        },
        units: {
          ...state.units,
          [attackerId]: {
            ...state.units[attackerId],
            position: ADJACENT_CONTROL_POINT_ATTACKER_POSITION,
          },
          [RED_INFANTRY_ID]: {
            ...state.units[RED_INFANTRY_ID],
            position: CONTROL_POINT_POSITION,
          },
        },
      };
      const action: GameAction = {
        type: "attack",
        unitId: attackerId,
        targetUnitId: RED_INFANTRY_ID,
      };
      const result = applyAction(controlPointState, action);

      expect(validateAction(controlPointState, action)).toEqual({ isValid: true });
      expect(getLegalActions(controlPointState)).toContainEqual(action);
      expect(result.accepted).toBe(true);
      expect(result.state.units[RED_INFANTRY_ID]?.health).toBeLessThan(
        controlPointState.units[RED_INFANTRY_ID].health,
      );
    }
  });

  it("rejects an adjacent diagonal attack", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 2 },
        },
      },
    };
    const action: GameAction = {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    };

    expect(validateAction(duelState, action)).toEqual({
      isValid: false,
      reason: "destination-out-of-range",
    });
  });

  it("rejects friendly and out-of-range attacks", () => {
    const state = createSkirmishGameState();
    const friendlyAction: GameAction = {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: BLUE_INFANTRY_TWO_ID,
    };
    const distantState = {
      ...state,
      units: {
        ...state.units,
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: DISTANT_TARGET_POSITION,
        },
      },
    };
    const distantAction: GameAction = {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    };

    expect(validateAction(state, friendlyAction)).toEqual({
      isValid: false,
      reason: "target-is-friendly",
    });
    expect(validateAction(distantState, distantAction)).toEqual({
      isValid: false,
      reason: "destination-out-of-range",
    });
  });
});

describe("artillery attack rules", () => {
  it("cannot attack after moving during the same turn", () => {
    const state = withTargetPosition(createSkirmishGameState(), ARTILLERY_TARGET_POSITION);
    const moveResult = applyAction(state, {
      type: "move",
      unitId: BLUE_ARTILLERY_ID,
      destination: ARTILLERY_MOVE_DESTINATION,
    });

    expect(moveResult.accepted).toBe(true);
    expect(
      validateAction(moveResult.state, {
        type: "attack",
        unitId: BLUE_ARTILLERY_ID,
        targetUnitId: RED_INFANTRY_ID,
      }),
    ).toEqual({ isValid: false, reason: "unit-cannot-attack-after-moving" });
  });

  it("can attack again when its side's next turn begins", () => {
    const state = withTargetPosition(createSkirmishGameState(), ARTILLERY_TARGET_POSITION);
    const movedState = applyAction(state, {
      type: "move",
      unitId: BLUE_ARTILLERY_ID,
      destination: ARTILLERY_MOVE_DESTINATION,
    }).state;
    const redTurnState = applyAction(movedState, { type: "end-turn" }).state;
    const nextBlueTurnState = applyAction(redTurnState, { type: "end-turn" }).state;

    expect(
      validateAction(nextBlueTurnState, {
        type: "attack",
        unitId: BLUE_ARTILLERY_ID,
        targetUnitId: RED_INFANTRY_ID,
      }),
    ).toEqual({ isValid: true });
  });

  it("cannot attack adjacent units but can attack targets anywhere in its range", () => {
    const state = withArtillery(createSkirmishGameState(), { x: 1, y: 1 });

    expect(validateArtilleryAttack(state, { x: 2, y: 2 })).toEqual({
      isValid: false,
      reason: "destination-out-of-range",
    });
    expect(validateArtilleryAttack(state, { x: 3, y: 3 })).toEqual({ isValid: true });
    expect(validateArtilleryAttack(state, { x: 3, y: 1 })).toEqual({ isValid: true });
    expect(validateArtilleryAttack(state, { x: 5, y: 1 })).toEqual({ isValid: true });
    expect(validateArtilleryAttack(state, { x: 1, y: 5 })).toEqual({ isValid: true });
    expect(validateArtilleryAttack(state, { x: 6, y: 1 })).toEqual({
      isValid: false,
      reason: "destination-out-of-range",
    });
  });

  it("blocks artillery fire through intermediate mountains but not into mountains", () => {
    const state = withArtillery(createSkirmishGameState(), { x: 1, y: 1 });
    const targetPosition = { x: 4, y: 1 };

    expect(
      validateArtilleryAttack(withMountainBetween(state, { x: 2, y: 1 }), targetPosition),
    ).toEqual({ isValid: false, reason: "destination-out-of-range" });
    expect(validateArtilleryAttack(withArtillery(state, { x: 2, y: 1 }), targetPosition)).toEqual({
      isValid: true,
    });
    expect(
      validateArtilleryAttack(withMountainBetween(state, targetPosition), targetPosition),
    ).toEqual({
      isValid: true,
    });
  });
});

describe("combined defensive terrain", () => {
  it("reduces damage for targets on mountains and control points", () => {
    const state = createSkirmishGameState();
    const defendedState = {
      ...state,
      board: {
        ...state.board,
        terrain: [{ type: "mountain" as const, position: MOUNTAIN_POSITION }],
      },
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position: MOUNTAIN_POSITION },
      },
      controlPoints: {
        [CONTROL_POINT_ID]: {
          ...state.controlPoints[CONTROL_POINT_ID],
          position: MOUNTAIN_POSITION,
        },
      },
    };
    const result = applyAction(defendedState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(
      UNIT_DESTRUCTION_DAMAGE - MINIMUM_DAMAGE,
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "unit-damaged", damage: MINIMUM_DAMAGE }),
    );
    expect(result.state.scores).toEqual({ blue: MINIMUM_DAMAGE, red: ATTACK_DAMAGE });
  });
});

describe("counterattacks", () => {
  it("has a surviving defender immediately return normal damage and score", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], position: { x: 1, y: 1 } },
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 1 },
          hasTakenMainAction: true,
        },
      },
    };

    const result = applyAction(duelState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[BLUE_INFANTRY_ID]?.health).toBe(
      UNIT_DESTRUCTION_DAMAGE - ATTACK_DAMAGE,
    );
    expect(result.state.units[BLUE_INFANTRY_ID]?.hasTakenMainAction).toBe(true);
    expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(
      UNIT_DESTRUCTION_DAMAGE - ATTACK_DAMAGE,
    );
    expect(result.state.units[BLUE_INFANTRY_ID]?.ammo).toBe(INFANTRY_AMMO_AFTER_SHOT);
    expect(result.state.units[RED_INFANTRY_ID]?.ammo).toBe(INFANTRY_AMMO_AFTER_SHOT);
    expect(result.state.scores).toEqual({ blue: ATTACK_DAMAGE, red: ATTACK_DAMAGE });
    expect(result.events.map((event) => event.type)).toEqual([
      "unit-attacked",
      "unit-damaged",
      "team-scored",
      "unit-counterattacked",
      "unit-damaged",
      "team-scored",
    ]);
  });

  it("does not counterattack after the defender is destroyed", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 1 },
          health: OVERKILL_TARGET_HEALTH,
        },
      },
    };

    const result = applyAction(duelState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[BLUE_INFANTRY_ID]?.health).toBe(UNIT_DESTRUCTION_DAMAGE);
    expect(result.state.scores).toEqual({ blue: OVERKILL_TARGET_HEALTH, red: 0 });
    expect(result.events.map((event) => event.type)).not.toContain("unit-counterattacked");
  });

  it("does not counterattack from artillery inside its minimum range", () => {
    const state = createSkirmishGameState();
    const redArtilleryId = "red-artillery-counter";
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], position: { x: 1, y: 1 } },
        [redArtilleryId]: {
          ...state.units[BLUE_ARTILLERY_ID],
          id: redArtilleryId,
          side: "red" as const,
          position: { x: 2, y: 1 },
        },
      },
    };

    const result = applyAction(duelState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: redArtilleryId,
    });

    expect(result.state.units[BLUE_INFANTRY_ID]?.health).toBe(UNIT_DESTRUCTION_DAMAGE);
    expect(result.events.map((event) => event.type)).not.toContain("unit-counterattacked");
  });
});

describe("counterattack ammunition", () => {
  it("does not counterattack when the defender has no ammunition", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], position: { x: 1, y: 1 } },
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 1 },
          ammo: 0,
        },
      },
    };

    const result = applyAction(duelState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[BLUE_INFANTRY_ID]?.health).toBe(UNIT_DESTRUCTION_DAMAGE);
    expect(result.state.units[BLUE_INFANTRY_ID]?.ammo).toBe(INFANTRY_AMMO_AFTER_SHOT);
    expect(result.events.map((event) => event.type)).not.toContain("unit-counterattacked");
  });
});

describe("counterattack attack eligibility", () => {
  it("uses mountain line of fire when determining whether a counterattack is possible", () => {
    const state = withMountainBetween(
      withTargetPosition(withArtillery(createSkirmishGameState(), { x: 1, y: 1 }), { x: 4, y: 1 }),
      MOUNTAIN_POSITION,
    );
    const artillery = state.units[BLUE_ARTILLERY_ID];
    const infantry = state.units[RED_INFANTRY_ID];

    if (!artillery || !infantry) {
      throw new Error("Expected test units are missing.");
    }

    expect(canUnitAttackTarget(state.board, artillery, infantry)).toBe(false);
  });
});

describe("counterattack victory", () => {
  it("lets a counterattack destroy the attacker and award victory", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: {
          ...state.units[BLUE_INFANTRY_ID],
          position: { x: 1, y: 1 },
          health: OVERKILL_TARGET_HEALTH,
        },
        [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position: { x: 2, y: 1 } },
      },
    };

    const result = applyAction(duelState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[BLUE_INFANTRY_ID]).toBeUndefined();
    expect(result.state.winner).toBe("red");
    expect(result.state.scores).toEqual({ blue: ATTACK_DAMAGE, red: OVERKILL_TARGET_HEALTH });
    expect(result.events.map((event) => event.type)).toEqual([
      "unit-attacked",
      "unit-damaged",
      "team-scored",
      "unit-counterattacked",
      "unit-damaged",
      "team-scored",
      "unit-destroyed",
      "victory-achieved",
    ]);
  });
});

describe("unit base defence", () => {
  it("reduces damage to tanks without positional defence", () => {
    const state = createSkirmishGameState();
    const tankTargetPosition = { x: 2, y: 1 };
    const tankState = {
      ...state,
      units: {
        [BLUE_TANK_ID]: { ...state.units[BLUE_TANK_ID], position: { x: 1, y: 1 } },
        [RED_TANK_ID]: { ...state.units[RED_TANK_ID], position: tankTargetPosition },
      },
    };

    const result = applyAction(tankState, {
      type: "attack",
      unitId: BLUE_TANK_ID,
      targetUnitId: RED_TANK_ID,
    });

    expect(result.state.units[RED_TANK_ID]?.health).toBe(TANK_HEALTH - ATTACK_DAMAGE);
  });

  it("stacks tank and positional defence without dropping below one", () => {
    const state = createSkirmishGameState();
    const tankTargetPosition = { x: 2, y: 1 };
    const tankDefendedByTerrain = {
      ...state,
      board: {
        ...state.board,
        terrain: [{ type: "mountain" as const, position: tankTargetPosition }],
      },
      units: {
        [BLUE_TANK_ID]: { ...state.units[BLUE_TANK_ID], position: { x: 1, y: 1 } },
        [RED_TANK_ID]: { ...state.units[RED_TANK_ID], position: tankTargetPosition },
      },
      controlPoints: {
        [CONTROL_POINT_ID]: {
          ...state.controlPoints[CONTROL_POINT_ID],
          position: tankTargetPosition,
        },
      },
    };

    const result = applyAction(tankDefendedByTerrain, {
      type: "attack",
      unitId: BLUE_TANK_ID,
      targetUnitId: RED_TANK_ID,
    });

    expect(result.state.units[RED_TANK_ID]?.health).toBe(TANK_HEALTH - MINIMUM_DAMAGE);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "unit-damaged", damage: MINIMUM_DAMAGE }),
    );
  });
});

describe("artillery armour penetration", () => {
  it.each([
    {
      name: "without positional defence",
      terrain: [],
      hasControlPoint: false,
      expectedDamage: ARTILLERY_DAMAGE_TO_TANK,
    },
    {
      name: "with mountain defence",
      terrain: [{ type: "mountain" as const, position: ARTILLERY_TARGET_POSITION }],
      hasControlPoint: false,
      expectedDamage: ARTILLERY_DAMAGE_TO_TANK_WITH_ONE_POSITIONAL_DEFENCE,
    },
    {
      name: "with mountain and control point defence",
      terrain: [{ type: "mountain" as const, position: ARTILLERY_TARGET_POSITION }],
      hasControlPoint: true,
      expectedDamage: ARTILLERY_DAMAGE_TO_TANK_WITH_TWO_POSITIONAL_DEFENCES,
    },
  ])(
    "deals $expectedDamage damage to a tank $name",
    ({ terrain, hasControlPoint, expectedDamage }) => {
      const state = createSkirmishGameState();
      const controlPoints: GameState["controlPoints"] = hasControlPoint
        ? {
            [CONTROL_POINT_ID]: {
              id: CONTROL_POINT_ID,
              position: ARTILLERY_TARGET_POSITION,
              owner: null,
            },
          }
        : {};
      const artilleryState = {
        ...state,
        board: { ...state.board, terrain },
        units: {
          [BLUE_ARTILLERY_ID]: state.units[BLUE_ARTILLERY_ID],
          [RED_TANK_ID]: { ...state.units[RED_TANK_ID], position: ARTILLERY_TARGET_POSITION },
        },
        controlPoints,
      };

      const result = applyAction(artilleryState, {
        type: "attack",
        unitId: BLUE_ARTILLERY_ID,
        targetUnitId: RED_TANK_ID,
      });

      expect(result.state.units[RED_TANK_ID]?.health).toBe(TANK_HEALTH - expectedDamage);
    },
  );

  it("continues to apply normal defence to artillery attacks against infantry", () => {
    const state = createSkirmishGameState();
    const artilleryState = {
      ...state,
      board: {
        ...state.board,
        terrain: [{ type: "mountain" as const, position: ARTILLERY_TARGET_POSITION }],
      },
      units: {
        [BLUE_ARTILLERY_ID]: state.units[BLUE_ARTILLERY_ID],
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: ARTILLERY_TARGET_POSITION,
        },
      },
    };

    const result = applyAction(artilleryState, {
      type: "attack",
      unitId: BLUE_ARTILLERY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(
      UNIT_DESTRUCTION_DAMAGE - ATTACK_DAMAGE,
    );
  });
});

describe("control point defence", () => {
  it("applies a single defence bonus without reducing damage below one", () => {
    const state = createSkirmishGameState();
    const defendedState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position: MOUNTAIN_POSITION },
      },
      controlPoints: {
        [CONTROL_POINT_ID]: {
          ...state.controlPoints[CONTROL_POINT_ID],
          position: MOUNTAIN_POSITION,
        },
      },
    };
    const result = applyAction(defendedState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(
      UNIT_DESTRUCTION_DAMAGE - DAMAGE_WITH_ONE_DEFENCE_BONUS,
    );
  });
});

describe("main action rules", () => {
  it("rejects an attack when the active unit has no ammunition", () => {
    const state = createSkirmishGameState();
    const noAmmoState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: { ...state.units[BLUE_INFANTRY_ID], ammo: 0 },
        [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position: { x: 2, y: 1 } },
      },
    };

    expect(
      validateAction(noAmmoState, {
        type: "attack",
        unitId: BLUE_INFANTRY_ID,
        targetUnitId: RED_INFANTRY_ID,
      }),
    ).toEqual({ isValid: false, reason: "unit-has-no-ammunition" });
  });

  it("captures a neutral point and consumes the unit main action", () => {
    const state = createSkirmishGameState();
    const capturingState = {
      ...state,
      units: {
        ...state.units,
        [BLUE_INFANTRY_ID]: {
          ...state.units[BLUE_INFANTRY_ID],
          position: state.controlPoints[CONTROL_POINT_ID]?.position,
        },
      },
    };
    const action: GameAction = {
      type: "capture",
      unitId: BLUE_INFANTRY_ID,
      controlPointId: CONTROL_POINT_ID,
    };

    const result = applyAction(capturingState, action);

    expect(result.accepted).toBe(true);
    expect(result.state.controlPoints[CONTROL_POINT_ID]?.owner).toBe("blue");
    expect(result.state.units[BLUE_INFANTRY_ID]?.hasTakenMainAction).toBe(true);
    expect(result.state.scores).toEqual({ blue: CAPTURE_SCORE, red: 0 });
    expect(result.events.map((event) => event.type)).toEqual([
      "control-point-captured",
      "team-scored",
    ]);
  });

  it("awards only health actually removed when an attack overkills its target", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 1 },
          health: OVERKILL_TARGET_HEALTH,
        },
      },
    };

    const result = applyAction(duelState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state.scores).toEqual({ blue: OVERKILL_TARGET_HEALTH, red: 0 });
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "team-scored", points: OVERKILL_TARGET_HEALTH }),
    );
  });

  it("rejects invalid actions without changing the input state or emitting events", () => {
    const state = createSkirmishGameState();
    const action: GameAction = {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_TANK_ID,
    };

    const result = applyAction(state, action);

    expect(result).toEqual({ accepted: false, state, events: [] });
    expect(state.units[BLUE_INFANTRY_ID]?.hasTakenMainAction).toBe(false);
    expect(state.scores).toEqual({ blue: 0, red: 0 });
  });
});

describe("turn refresh rules", () => {
  it("ends the turn and refreshes only the newly active side", () => {
    const state = createSkirmishGameState();
    const changedState = {
      ...state,
      units: {
        ...state.units,
        [RED_TANK_ID]: {
          ...state.units[RED_TANK_ID],
          movementPoints: 0,
          hasTakenMainAction: true,
        },
        [BLUE_TANK_ID]: {
          ...state.units[BLUE_TANK_ID],
          movementPoints: 0,
          hasTakenMainAction: true,
        },
      },
    };
    const result = applyAction(changedState, { type: "end-turn" });

    expect(result.accepted).toBe(true);
    expect(result.state.turn).toBe(NEXT_TURN);
    expect(result.state.activeSide).toBe("red");
    expect(result.state.units[RED_TANK_ID]?.movementPoints).toBe(TANK_MAX_MOVEMENT);
    expect(result.state.units[RED_TANK_ID]?.hasTakenMainAction).toBe(false);
    expect(result.state.units[BLUE_TANK_ID]?.movementPoints).toBe(0);
    expect(result.events).toEqual([expect.objectContaining({ type: "turn-ended" })]);
  });
});

it("heals damaged units on control points owned by the newly active side before ending its turn", () => {
  const state = createSkirmishGameState();
  const controlPoint = state.controlPoints[CONTROL_POINT_ID];
  const healingState = {
    ...state,
    units: {
      ...state.units,
      [RED_INFANTRY_ID]: {
        ...state.units[RED_INFANTRY_ID],
        position: controlPoint.position,
        health: DAMAGED_INFANTRY_HEALTH,
        movementPoints: 0,
        hasTakenMainAction: true,
      },
    },
    controlPoints: {
      ...state.controlPoints,
      [CONTROL_POINT_ID]: { ...controlPoint, owner: "red" as const },
    },
  };

  const result = applyAction(healingState, { type: "end-turn" });

  expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(
    DAMAGED_INFANTRY_HEALTH + CONTROL_POINT_HEAL_AMOUNT,
  );
  expect(result.state.units[RED_INFANTRY_ID]?.movementPoints).toBe(BLUE_INFANTRY_MAX_MOVEMENT);
  expect(result.state.units[RED_INFANTRY_ID]?.hasTakenMainAction).toBe(false);
  expect(result.events).toEqual([
    {
      type: "unit-healed",
      unitId: RED_INFANTRY_ID,
      healthRestored: CONTROL_POINT_HEAL_AMOUNT,
      remainingHealth: DAMAGED_INFANTRY_HEALTH + CONTROL_POINT_HEAL_AMOUNT,
    },
    expect.objectContaining({ type: "turn-ended", activeSide: "red" }),
  ]);
  expect(healingState.units[RED_INFANTRY_ID]?.health).toBe(DAMAGED_INFANTRY_HEALTH);
});

it("fully reloads active-side units on owned control points in ID order", () => {
  const state = createSkirmishGameState();
  const controlPoint = state.controlPoints[CONTROL_POINT_ID];
  const reloadState = {
    ...state,
    units: {
      ...state.units,
      [RED_INFANTRY_TWO_ID]: {
        ...state.units[RED_INFANTRY_TWO_ID],
        position: controlPoint.position,
        ammo: 1,
      },
      [RED_INFANTRY_ID]: {
        ...state.units[RED_INFANTRY_ID],
        position: state.controlPoints["control-point-4"].position,
        ammo: 2,
      },
    },
    controlPoints: {
      ...state.controlPoints,
      [CONTROL_POINT_ID]: { ...controlPoint, owner: "red" as const },
      "control-point-4": { ...state.controlPoints["control-point-4"], owner: "red" as const },
    },
  };

  const result = applyAction(reloadState, { type: "end-turn" });

  expect(result.state.units[RED_INFANTRY_ID]?.ammo).toBe(INFANTRY_MAX_AMMO);
  expect(result.state.units[RED_INFANTRY_TWO_ID]?.ammo).toBe(INFANTRY_MAX_AMMO);
  expect(result.events).toEqual([
    {
      type: "unit-reloaded",
      unitId: RED_INFANTRY_ID,
      ammoRestored: INFANTRY_MAX_AMMO - 2,
      remainingAmmo: INFANTRY_MAX_AMMO,
    },
    {
      type: "unit-reloaded",
      unitId: RED_INFANTRY_TWO_ID,
      ammoRestored: INFANTRY_MAX_AMMO - 1,
      remainingAmmo: INFANTRY_MAX_AMMO,
    },
    expect.objectContaining({ type: "turn-ended", activeSide: "red" }),
  ]);
});

it("limits control point healing to maximum health and excludes ineligible units", () => {
  const state = createSkirmishGameState();
  const controlPoint = state.controlPoints[CONTROL_POINT_ID];
  const healingState = {
    ...state,
    units: {
      ...state.units,
      [RED_INFANTRY_ID]: {
        ...state.units[RED_INFANTRY_ID],
        position: controlPoint.position,
        health: NEAR_MAXIMUM_INFANTRY_HEALTH,
      },
      [RED_INFANTRY_TWO_ID]: {
        ...state.units[RED_INFANTRY_TWO_ID],
        position: state.controlPoints["control-point-4"].position,
        health: DAMAGED_INFANTRY_HEALTH,
      },
      [RED_TANK_ID]: {
        ...state.units[RED_TANK_ID],
        position: { x: 8, y: 6 },
        health: TANK_HEALTH - CONTROL_POINT_HEAL_AMOUNT,
      },
    },
    controlPoints: {
      ...state.controlPoints,
      [CONTROL_POINT_ID]: { ...controlPoint, owner: "red" as const },
    },
  };

  const result = applyAction(healingState, { type: "end-turn" });

  expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(state.units[RED_INFANTRY_ID]?.maxHealth);
  expect(result.state.units[RED_INFANTRY_TWO_ID]?.health).toBe(DAMAGED_INFANTRY_HEALTH);
  expect(result.state.units[RED_TANK_ID]?.health).toBe(TANK_HEALTH - CONTROL_POINT_HEAL_AMOUNT);
  expect(result.events).toEqual([
    expect.objectContaining({ type: "unit-healed", unitId: RED_INFANTRY_ID, healthRestored: 1 }),
    expect.objectContaining({ type: "turn-ended" }),
  ]);
});

it("does not heal units on neutral, enemy-owned, or empty control points", () => {
  const state = createSkirmishGameState();
  const firstControlPoint = state.controlPoints[CONTROL_POINT_ID];
  const secondControlPoint = state.controlPoints["control-point-4"];
  const healingState = {
    ...state,
    activeSide: "red" as const,
    units: {
      ...state.units,
      [BLUE_INFANTRY_ID]: {
        ...state.units[BLUE_INFANTRY_ID],
        position: firstControlPoint.position,
        health: DAMAGED_INFANTRY_HEALTH,
      },
      [BLUE_INFANTRY_TWO_ID]: {
        ...state.units[BLUE_INFANTRY_TWO_ID],
        position: secondControlPoint.position,
        health: DAMAGED_INFANTRY_HEALTH,
      },
    },
    controlPoints: {
      ...state.controlPoints,
      [CONTROL_POINT_ID]: { ...firstControlPoint, owner: null },
      "control-point-4": { ...secondControlPoint, owner: "red" as const },
    },
  };

  const result = applyAction(healingState, { type: "end-turn" });

  expect(result.state.units[BLUE_INFANTRY_ID]?.health).toBe(DAMAGED_INFANTRY_HEALTH);
  expect(result.state.units[BLUE_INFANTRY_TWO_ID]?.health).toBe(DAMAGED_INFANTRY_HEALTH);
  expect(result.events).toEqual([
    expect.objectContaining({ type: "turn-ended", activeSide: "blue" }),
  ]);
});

it("does not emit healing for a full-health unit on an owned control point", () => {
  const state = createSkirmishGameState();
  const controlPoint = state.controlPoints[CONTROL_POINT_ID];
  const healingState = {
    ...state,
    units: {
      ...state.units,
      [RED_INFANTRY_ID]: { ...state.units[RED_INFANTRY_ID], position: controlPoint.position },
    },
    controlPoints: {
      ...state.controlPoints,
      [CONTROL_POINT_ID]: { ...controlPoint, owner: "red" as const },
    },
  };

  const result = applyAction(healingState, { type: "end-turn" });

  expect(result.events).toEqual([expect.objectContaining({ type: "turn-ended" })]);
});

describe("action availability and immutability rules", () => {
  it("rejects movement after a main action", () => {
    const state = createSkirmishGameState();
    const waitingResult = applyAction(state, { type: "wait", unitId: BLUE_INFANTRY_ID });

    expect(validateAction(waitingResult.state, moveAction)).toEqual({
      isValid: false,
      reason: "unit-main-action-already-taken",
    });
  });

  it("does not award points for waiting or ending a turn", () => {
    const state = createSkirmishGameState();
    const waitingResult = applyAction(state, { type: "wait", unitId: BLUE_INFANTRY_ID });
    const endingResult = applyAction(waitingResult.state, { type: "end-turn" });

    expect(waitingResult.state.scores).toEqual(INITIAL_SCORES);
    expect(endingResult.state.scores).toEqual(INITIAL_SCORES);
  });

  it("does not mutate the prior state when applying combat damage", () => {
    const state = createSkirmishGameState();
    const combatState = {
      ...state,
      units: {
        ...state.units,
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 1 },
          health: UNIT_DESTRUCTION_DAMAGE,
        },
      },
    };
    const result = applyAction(combatState, {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    });

    expect(result.state).not.toBe(combatState);
    expect(combatState.units[RED_INFANTRY_ID]?.health).toBe(UNIT_DESTRUCTION_DAMAGE);
    expect(result.state.units[RED_INFANTRY_ID]?.health).toBe(
      UNIT_DESTRUCTION_DAMAGE - ATTACK_DAMAGE,
    );
  });
});
