import { getDefenceBonus } from "../../core/combat/calculate-damage";
import type { GameEvent } from "../../core/model/game-events";
import type { GameState, Position, SideId, UnitState } from "../../core/model/game-state";
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
  const defenceText = defenceBonus > 0 ? `  Defence -${defenceBonus}` : "";
  const range =
    unit.minAttackRange === unit.attackRange
      ? `${unit.attackRange}`
      : `${unit.minAttackRange}-${unit.attackRange}`;

  const artilleryMoveWarning =
    unit.type === "artillery" && unit.hasMovedThisTurn ? "  Fire locked after move" : "";

  return `${unit.type.toUpperCase()}\nHP ${unit.health}/${unit.maxHealth}  MP ${unit.movementPoints}/${unit.maxMovementPoints}\nRange ${range}  Action ${unit.hasTakenMainAction ? "used" : "ready"}${artilleryMoveWarning}${defenceText}`;
}

export function formatEvent(event: GameEvent): string {
  switch (event.type) {
    case "unit-moved":
      return `${event.unitId} moved.`;
    case "unit-attacked":
      return `${event.attackerUnitId} attacked ${event.targetUnitId}.`;
    case "unit-damaged":
      return `${event.unitId} took ${event.damage} damage.`;
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

export function getUnitTextureKey(unit: UnitState): string {
  return assetManifest.units[`${unit.side}-${unit.type}`]?.textureKey ?? "";
}

export function getControlPointTextureKey(owner: "blue" | "red" | null): string {
  const controlPointKey = `control-point-${owner ?? "neutral"}`;
  return assetManifest.terrain[controlPointKey]?.textureKey ?? "";
}

export function getTerrainTextureKey(terrainType: "mountain"): string {
  return assetManifest.terrain[terrainType]?.textureKey ?? "";
}
