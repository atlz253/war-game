import { afterEach, expect, it } from "vitest";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import {
  formatEvent,
  formatRejectedOrder,
  formatSelectedUnit,
} from "../scenes/battle-view-helpers";
import { getLocaleCatalog, replaceLocaleCatalog, selectLocale } from "./runtime";

const original = getLocaleCatalog();
afterEach(() => {
  replaceLocaleCatalog(original);
  selectLocale("en");
});
it("localizes battle reasons, unit descriptions and status parameters without changing event/state data", () => {
  replaceLocaleCatalog({
    ...original,
    locales: [
      ...original.locales,
      {
        schemaVersion: 1,
        id: "qa",
        name: "Test",
        strings: {
          "battle-view-helpers.select.a.unit": "Выберите юнит: {value1}",
          "token.blue": "СИНИЕ",
          "battle-view-helpers.moved": "{value1} перемещён.",
          "battle-view-helpers.the.target.is.out.of.range": "Цель вне досягаемости.",
          "battle-view-helpers.order.rejected": "Отказ: {value1}",
        },
      },
    ],
  });
  selectLocale("qa");
  const state = createSkirmishGameState();
  const before = structuredClone(state);
  expect(formatSelectedUnit(state, undefined, "blue", true)).toBe("Выберите юнит: СИНИЕ");
  const event = {
    type: "unit-moved" as const,
    unitId: "blue-infantry-1",
    from: { x: 0, y: 0 },
    to: { x: 1, y: 0 },
    cost: 1,
  };
  expect(formatEvent(event)).toBe("blue-infantry-1 перемещён.");
  expect(formatRejectedOrder("destination-out-of-range")).toBe("Отказ: Цель вне досягаемости.");
  expect(state).toEqual(before);
  selectLocale("en");
  expect(formatEvent(event)).toBe("blue-infantry-1 moved.");
});
