const SOAK_SEED = 42;
const SOAK_ACTIONS = 600;
const MINIMUM_DAMAGE_EVENTS = 100;
const SOAK_TIMEOUT_MS = 120000;

import { describe, expect, it } from "vitest";
import type { GameAction } from "../core/actions/game-actions";
import { createMenuBattle } from "../core/menu-battle/menu-battle";
import { applyAction } from "../core/rules/apply-action";
import type { Agent } from "./agents/Agent";
import { MenuBattleController } from "./menu-battle-controller";

describe("menu battle controller", () => {
  it("retains state on pause, permits one pending decision and ignores disposed completion", async () => {
    let resolve!: (action: GameAction) => void;
    const agent: Agent = {
      id: "delayed",
      chooseAction: () =>
        new Promise((r) => {
          resolve = r;
        }),
    };
    const controller = new MenuBattleController(createMenuBattle(1), { blue: agent, red: agent });
    controller.pause();
    expect(await controller.step()).toBeNull();
    controller.resume();
    const pending = controller.step();
    expect(await controller.step()).toBeNull();
    controller.pause();
    const before = controller.state;
    resolve({ type: "end-turn" });
    expect(await pending).toBeNull();
    expect(controller.state).toBe(before);
    controller.resume();
    const disposed = controller.step();
    controller.dispose();
    resolve({ type: "end-turn" });
    expect(await disposed).toBeNull();
    expect(controller.state).toBe(before);
  });
  it("falls back legally on rejection and failure without accumulating history", async () => {
    const agent: Agent = {
      id: "bad",
      chooseAction: async () => ({ type: "wait", unitId: "missing" }),
    };
    const controller = new MenuBattleController(createMenuBattle(1), { blue: agent, red: agent });
    expect(required(await controller.step()).accepted).toBe(true);
    expect(controller.actionsThisTurn).toHaveLength(0);
    const broken: Agent = {
      id: "broken",
      chooseAction: async () => {
        throw new Error("failed");
      },
    };
    expect(
      required(
        await new MenuBattleController(createMenuBattle(1), { blue: broken, red: broken }).step(),
      ).accepted,
    ).toBe(true);
  });
  it(
    "runs repeated deterministic waves with recurrent damage and replayable accepted actions",
    async () => {
      const initial = createMenuBattle(SOAK_SEED);
      const controller = new MenuBattleController(initial);
      let replay = initial;
      let damage = 0;
      const sides = new Set<string>();
      for (let i = 0; i < SOAK_ACTIONS; i++) {
        sides.add(controller.state.activeSide);
        const transition = required(await controller.step());
        expect(transition.accepted).toBe(true);
        replay = applyAction(replay, transition.action).state;
        damage += transition.events.filter((e) => e.type === "unit-damaged").length;
        expect(controller.state.winner).toBeNull();
        expect(Object.values(controller.state.units).every((u) => u.ammo === u.maxAmmo)).toBe(true);
        expect(controller.actionsThisTurn.length).toBeLessThanOrEqual(controller.contextLimit);
      }
      expect(controller.state).toEqual(replay);
      expect(sides.size).toBe(2);
      expect(damage).toBeGreaterThan(MINIMUM_DAMAGE_EVENTS);
      expect(
        required(controller.state.menuBattle).waves.blue +
          required(controller.state.menuBattle).waves.red,
      ).toBeGreaterThan(10);
    },
    SOAK_TIMEOUT_MS,
  );
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing test fixture value");
  return value;
}
