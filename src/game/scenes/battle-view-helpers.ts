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
import { displayToken } from "../localization/display-tokens";
import { t } from "../localization/runtime";
export function aiThinkingSuffix(human: boolean, locked: boolean, participant: string): string {
  if (human || !locked) return "";
  return participant === "lm-studio-ai" ? t("battle.lm.studio.thinking") : t("battle.ai.thinking");
}

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
      ? t("battle-view-helpers.select.a.unit", { value1: String(displayToken(activeSide)) })
      : t("battle-view-helpers.ai.is.taking.its.turn", {
          value1: String(displayToken(activeSide)),
        });
  }
  const defenceBonus = getDefenceBonus(state, unit.position);
  const defenceText =
    defenceBonus > 0
      ? t("battle-view-helpers.defence.position", {
          value1: String(unit.baseDefence),
          value2: String(defenceBonus),
        })
      : t("battle-view-helpers.defence", { value1: String(unit.baseDefence) });
  const range =
    unit.minAttackRange === unit.attackRange
      ? `${unit.attackRange}`
      : `${unit.minAttackRange}-${unit.attackRange}`;

  const artilleryMoveWarning =
    unit.type === "artillery" && unit.hasMovedThisTurn
      ? t("battle-view-helpers.fire.locked.after.move")
      : "";

  return t("battle-view-helpers.hp.mp.ammo.range.action", {
    value1: String(displayToken(unit.type)),
    value2: String(unit.health),
    value3: String(unit.maxHealth),
    value4: String(unit.movementPoints),
    value5: String(unit.maxMovementPoints),
    value6: String(unit.ammo),
    value7: String(unit.maxAmmo),
    value8: String(range),
    value9: String(displayToken(unit.hasTakenMainAction ? "used" : "ready")),
    value10: String(artilleryMoveWarning),
    value11: String(defenceText),
  });
}

export function formatEvent(event: GameEvent): string {
  switch (event.type) {
    case "unit-moved":
      return t("battle-view-helpers.moved", { value1: String(event.unitId) });
    case "unit-attacked":
      return t("battle-view-helpers.attacked.ammo", {
        value1: String(event.attackerUnitId),
        value2: String(event.targetUnitId),
        value3: String(event.remainingAmmo),
      });
    case "unit-counterattacked":
      return t("battle-view-helpers.counterattacked.ammo", {
        value1: String(event.counterattackerUnitId),
        value2: String(event.targetUnitId),
        value3: String(event.remainingAmmo),
      });
    case "unit-damaged":
      return t("battle-view-helpers.took.damage", {
        value1: String(event.unitId),
        value2: String(event.damage),
      });
    case "unit-healed":
      return t("battle-view-helpers.restored.hp", {
        value1: String(event.unitId),
        value2: String(event.healthRestored),
      });
    case "unit-reloaded":
      return t("battle-view-helpers.restored.ammo", {
        value1: String(event.unitId),
        value2: String(event.ammoRestored),
      });
    case "unit-destroyed":
      return t("battle-view-helpers.was.destroyed", { value1: String(event.unitId) });
    case "control-point-captured":
      return t("battle-view-helpers.captured", {
        value1: String(displayToken(event.owner)),
        value2: String(event.controlPointId),
      });
    case "team-scored":
      return t("battle-view-helpers.score", {
        value1: String(displayToken(event.side)),
        value2: String(event.points),
        value3: String(displayToken(event.reason)),
      });
    case "unit-waited":
      return t("battle-view-helpers.waited", { value1: String(event.unitId) });
    case "turn-ended":
      return t("battle-view-helpers.turn", {
        value1: String(event.turn),
        value2: String(event.activeSide),
      });
    case "victory-achieved":
      return t("battle-view-helpers.wins", { value1: String(displayToken(event.winner)) });
  }
}

export function formatRejectedOrder(reason: ValidationFailureReason): string {
  return t("battle-view-helpers.order.rejected", {
    value1: String(formatValidationFailure(reason)),
  });
}

export function formatActionRejection(state: GameState, action: GameAction): string {
  const validation = validateAction(state, action);

  return validation.isValid
    ? t("battle-view-helpers.order.rejected.2")
    : formatRejectedOrder(validation.reason);
}

function formatValidationFailure(reason: ValidationFailureReason): string {
  switch (reason) {
    case "match-finished":
      return t("battle-view-helpers.the.match.is.finished");
    case "unit-not-found":
      return t("battle-view-helpers.the.selected.unit.no.longer.exists");
    case "unit-not-active-side":
      return t("battle-view-helpers.it.is.not.that.unit.s.turn");
    case "unit-main-action-already-taken":
      return t("battle-view-helpers.that.unit.has.already.acted");
    case "unit-cannot-attack-after-moving":
      return t("battle-view-helpers.artillery.cannot.fire.after.moving");
    case "unit-has-no-ammunition":
      return t("battle-view-helpers.the.unit.has.no.ammunition");
    case "unit-has-no-movement-points":
      return t("battle-view-helpers.the.unit.has.no.movement.points");
    case "destination-unreachable":
      return t("battle-view-helpers.the.destination.is.unreachable");
    case "destination-out-of-range":
      return t("battle-view-helpers.the.target.is.out.of.range");
    case "target-not-found":
      return t("battle-view-helpers.the.target.no.longer.exists");
    case "target-is-friendly":
      return t("battle-view-helpers.the.target.is.friendly");
    case "control-point-not-found":
      return t("battle-view-helpers.the.control.point.no.longer.exists");
    case "control-point-not-at-unit-position":
      return t("battle-view-helpers.the.unit.is.not.on.that.control.point");
    case "control-point-already-owned":
      return t("battle-view-helpers.the.control.point.is.already.owned.by.that.side");
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
