import { localeKey, t } from "./runtime";

const keys: Readonly<Record<string, string>> = {
  local: localeKey("token.local"),
  "built-in": localeKey("token.builtIn"),
  blue: localeKey("token.blue"),
  red: localeKey("token.red"),
  neutral: localeKey("token.neutral"),
  infantry: localeKey("token.infantry"),
  tank: localeKey("token.tank"),
  artillery: localeKey("token.artillery"),
  forest: localeKey("token.forest"),
  mountain: localeKey("token.mountain"),
  used: localeKey("token.used"),
  ready: localeKey("token.ready"),
  attack: localeKey("token.attack"),
  capture: localeKey("token.capture"),
  "mission-start": localeKey("token.missionStart"),
  "mission-end": localeKey("token.missionEnd"),
  turn: localeKey("token.turn"),
  "unit-moved": localeKey("token.unitMoved"),
  "unit-selected": localeKey("token.unitSelected"),
  "unit-arrived": localeKey("token.unitArrived"),
};
export function displayToken(value: string): string {
  return keys[value] ? t(keys[value]) : value;
}
