import { describe, expect, it } from "vitest";

import type { GameAction } from "../actions/game-actions";
import { createSkirmishGameState } from "../scenarios/skirmish-12x8";
import { applyAction } from "./apply-action";
import { validateAction } from "./validate-action";

const BLUE_INFANTRY_ID = "blue-infantry-1";
const BLUE_INFANTRY_TWO_ID = "blue-infantry-2";
const RED_INFANTRY_ID = "red-infantry-1";
const RED_INFANTRY_TWO_ID = "red-infantry-2";
const RED_TANK_ID = "red-tank-1";
const BLUE_TANK_ID = "blue-tank-1";
const CONTROL_POINT_ID = "control-point-1";
const BLUE_INFANTRY_MAX_MOVEMENT = 4;
const TANK_MAX_MOVEMENT = 5;
const MOVEMENT_COST = 3;
const ATTACK_DAMAGE = 3;
const UNIT_DESTRUCTION_DAMAGE = 10;
const NEXT_TURN = 2;
const OUT_OF_BOUNDS_DESTINATION = { x: 12, y: 1 };
const OCCUPIED_DESTINATION = { x: 1, y: 3 };
const INSUFFICIENT_MOVEMENT_DESTINATION = { x: 6, y: 1 };
const DISTANT_TARGET_POSITION = { x: 4, y: 1 };

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
  it("accepts an adjacent diagonal attack and destroys the final enemy", () => {
    const state = createSkirmishGameState();
    const duelState = {
      ...state,
      units: {
        [BLUE_INFANTRY_ID]: state.units[BLUE_INFANTRY_ID],
        [RED_INFANTRY_ID]: {
          ...state.units[RED_INFANTRY_ID],
          position: { x: 2, y: 2 },
          health: ATTACK_DAMAGE,
        },
      },
    };
    const action: GameAction = {
      type: "attack",
      unitId: BLUE_INFANTRY_ID,
      targetUnitId: RED_INFANTRY_ID,
    };

    const result = applyAction(duelState, action);

    expect(result.accepted).toBe(true);
    expect(result.state.units[RED_INFANTRY_ID]).toBeUndefined();
    expect(result.state.winner).toBe("blue");
    expect(result.events.map((event) => event.type)).toEqual([
      "unit-attacked",
      "unit-damaged",
      "unit-destroyed",
      "victory-achieved",
    ]);
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
  });
});

describe("turn and immutability rules", () => {
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

  it("rejects movement after a main action", () => {
    const state = createSkirmishGameState();
    const waitingResult = applyAction(state, { type: "wait", unitId: BLUE_INFANTRY_ID });

    expect(validateAction(waitingResult.state, moveAction)).toEqual({
      isValid: false,
      reason: "unit-main-action-already-taken",
    });
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
