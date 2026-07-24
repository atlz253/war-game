import type { GameAction } from "../../core/actions/game-actions";
import { getDefenceBonus } from "../../core/combat/calculate-damage";
import type { GameEvent } from "../../core/model/game-events";
import type {
  GameState,
  Position,
  SideId,
  TerrainType,
  UnitState,
} from "../../core/model/game-state";
import { type ValidationFailureReason, validateAction } from "../../core/rules/validate-action";
import { assetManifest } from "../assets/asset-manifest";

export function findUnitAt(state: GameState, position: Position): UnitState | undefined {
  return Object.values(state.units).find((unit) => positionsEqual(unit.position, position));
}

export function positionsEqual(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}

export function formatSelectedUnit(
  state: GameState,
  unit: UnitState | undefined,
  activeSide: SideId,
  activeSideIsHuman: boolean,
): string {
  if (!unit) {
    return activeSideIsHuman
      ? `Select a ${activeSide.toUpperCase()} unit.`
      : `${activeSide.toUpperCase()} AI is taking its turn.`;
  }
  const defenceBonus = getDefenceBonus(state, unit.position);
  const defenceText =
    defenceBonus > 0
      ? `  Defence ${unit.baseDefence} (+${defenceBonus} position)`
      : `  Defence ${unit.baseDefence}`;
  const range =
    unit.minAttackRange === unit.attackRange
      ? `${unit.attackRange}`
      : `${unit.minAttackRange}-${unit.attackRange}`;

  const artilleryMoveWarning =
    unit.type === "artillery" && unit.hasMovedThisTurn ? "  Fire locked after move" : "";

  return `${unit.type.toUpperCase()}\nHP ${unit.health}/${unit.maxHealth}  MP ${unit.movementPoints}/${unit.maxMovementPoints}\nAmmo ${unit.ammo}/${unit.maxAmmo}  Range ${range}\nAction ${unit.hasTakenMainAction ? "used" : "ready"}${artilleryMoveWarning}${defenceText}`;
}

export function formatEvent(event: GameEvent): string {
  switch (event.type) {
    case "unit-moved":
      return `${event.unitId} moved.`;
    case "unit-attacked":
      return `${event.attackerUnitId} attacked ${event.targetUnitId} (${event.remainingAmmo} ammo).`;
    case "unit-counterattacked":
      return `${event.counterattackerUnitId} counterattacked ${event.targetUnitId} (${event.remainingAmmo} ammo).`;
    case "unit-damaged":
      return `${event.unitId} took ${event.damage} damage.`;
    case "unit-healed":
      return `${event.unitId} restored ${event.healthRestored} HP.`;
    case "unit-reloaded":
      return `${event.unitId} restored ${event.ammoRestored} ammo.`;
    case "unit-destroyed":
      return `${event.unitId} was destroyed.`;
    case "control-point-captured":
      return `${event.owner} captured ${event.controlPointId}.`;
    case "team-scored":
      return `${event.side.toUpperCase()} +${event.points} score (${event.reason}).`;
    case "unit-waited":
      return `${event.unitId} waited.`;
    case "turn-ended":
      return `Turn ${event.turn}: ${event.activeSide}.`;
    case "victory-achieved":
      return `${event.winner.toUpperCase()} wins.`;
  }
}

export function formatRejectedOrder(reason: ValidationFailureReason): string {
  return `Order rejected: ${formatValidationFailure(reason)}`;
}

export function formatActionRejection(state: GameState, action: GameAction): string {
  const validation = validateAction(state, action);

  return validation.isValid ? "Order rejected." : formatRejectedOrder(validation.reason);
}

function formatValidationFailure(reason: ValidationFailureReason): string {
  switch (reason) {
    case "match-finished":
      return "the match is finished.";
    case "unit-not-found":
      return "the selected unit no longer exists.";
    case "unit-not-active-side":
      return "it is not that unit's turn.";
    case "unit-main-action-already-taken":
      return "that unit has already acted.";
    case "unit-cannot-attack-after-moving":
      return "artillery cannot fire after moving.";
    case "unit-has-no-ammunition":
      return "the unit has no ammunition.";
    case "unit-has-no-movement-points":
      return "the unit has no movement points.";
    case "destination-unreachable":
      return "the destination is unreachable.";
    case "destination-out-of-range":
      return "the target is out of range.";
    case "target-not-found":
      return "the target no longer exists.";
    case "target-is-friendly":
      return "the target is friendly.";
    case "control-point-not-found":
      return "the control point no longer exists.";
    case "control-point-not-at-unit-position":
      return "the unit is not on that control point.";
    case "control-point-already-owned":
      return "the control point is already owned by that side.";
  }
}

export function isInsideRectangle(
  pointer: Position,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): boolean {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return (
    pointer.x >= centerX - halfWidth &&
    pointer.x <= centerX + halfWidth &&
    pointer.y >= centerY - halfHeight &&
    pointer.y <= centerY + halfHeight
  );
}

export function toContainerPosition(
  pointer: Position,
  containerPosition: Position,
  containerScale: number,
): Position {
  return {
    x: (pointer.x - containerPosition.x) / containerScale,
    y: (pointer.y - containerPosition.y) / containerScale,
  };
}

export function getUnitTextureKey(unit: UnitState): string {
  return assetManifest.units[`${unit.side}-${unit.type}`]?.textureKey ?? "";
}

export function getControlPointTextureKey(owner: "blue" | "red" | null): string {
  const controlPointKey = `control-point-${owner ?? "neutral"}`;
  return assetManifest.terrain[controlPointKey]?.textureKey ?? "";
}

export function getTerrainTextureKey(terrainType: TerrainType): string {
  return assetManifest.terrain[terrainType]?.textureKey ?? "";
}
