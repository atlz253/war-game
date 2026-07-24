import type { GameAction } from "../../core/actions/game-actions";
import type { MapDefinition } from "../../core/maps/map-definition";
import type { GameState } from "../../core/model/game-state";

export type MultiplayerRole = "host" | "client";

export type MultiplayerPacket =
  | {
      readonly type: "match-start";
      readonly mapDefinition: MapDefinition;
      readonly state: GameState;
    }
  | { readonly type: "action-request"; readonly action: GameAction }
  | { readonly type: "accepted-action"; readonly sequence: number; readonly action: GameAction }
  | { readonly type: "state-snapshot"; readonly sequence: number; readonly state: GameState }
  | { readonly type: "resync-request" }
  | { readonly type: "match-complete" };

export function parseMultiplayerPacket(value: unknown): MultiplayerPacket | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "resync-request" || value.type === "match-complete")
    return value as MultiplayerPacket;
  if (value.type === "action-request" && isGameAction(value.action))
    return value as MultiplayerPacket;
  if (
    value.type === "accepted-action" &&
    Number.isInteger(value.sequence) &&
    isGameAction(value.action)
  )
    return value as MultiplayerPacket;
  if (
    value.type === "state-snapshot" &&
    Number.isInteger(value.sequence) &&
    isGameState(value.state)
  )
    return value as MultiplayerPacket;
  if (
    value.type === "match-start" &&
    isMapDefinition(value.mapDefinition) &&
    isGameState(value.state)
  )
    return value as MultiplayerPacket;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isGameAction(value: unknown): value is GameAction {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  return (
    value.type === "end-turn" ||
    (value.type === "move" && typeof value.unitId === "string" && isPosition(value.destination)) ||
    (value.type === "attack" &&
      typeof value.unitId === "string" &&
      typeof value.targetUnitId === "string") ||
    (value.type === "capture" &&
      typeof value.unitId === "string" &&
      typeof value.controlPointId === "string") ||
    (value.type === "wait" && typeof value.unitId === "string")
  );
}
function isPosition(value: unknown): boolean {
  return isRecord(value) && Number.isInteger(value.x) && Number.isInteger(value.y);
}
function isMapDefinition(value: unknown): value is MapDefinition {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Number.isInteger(value.width) &&
    Number.isInteger(value.height) &&
    Array.isArray(value.units) &&
    Array.isArray(value.controlPoints) &&
    Array.isArray(value.terrain)
  );
}
function isGameState(value: unknown): value is GameState {
  return (
    isRecord(value) &&
    typeof value.scenarioId === "string" &&
    Number.isInteger(value.turn) &&
    (value.activeSide === "blue" || value.activeSide === "red") &&
    isRecord(value.units) &&
    isRecord(value.controlPoints) &&
    isRecord(value.scores) &&
    (value.winner === "blue" || value.winner === "red" || value.winner === null)
  );
}
