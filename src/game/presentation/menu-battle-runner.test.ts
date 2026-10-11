const MOVEMENT_SEED = 42;
const HIDDEN_FRAME_MS = 10000;
const FRAME_MS = 50;
const MOVEMENT_FRAMES = 30;

import { expect, it } from "vitest";
import type { Agent } from "../../ai/agents/Agent";
import { MenuBattleController } from "../../ai/menu-battle-controller";
import { createMenuBattle } from "../../core/menu-battle/menu-battle";
import { MenuBattleRunner } from "./menu-battle-runner";

it("paces instant decisions, bounds delta and freezes and resumes the same presentation", async () => {
  const controller = new MenuBattleController(createMenuBattle(MOVEMENT_SEED));
  const positions: number[] = [];
  let duration = 200;
  const runner = new MenuBattleRunner(
    controller,
    {
      render: () => {},
      clear: () => {},
      position: (_id, p) => positions.push(p.x),
      settled: () => {},
    },
    () => duration,
  );
  runner.setActive(true);
  runner.update(HIDDEN_FRAME_MS);
  await runner.idle();
  expect(runner.busy).toBe(true);
  const state = controller.state;
  runner.update(FRAME_MS);
  const position = positions.at(-1);
  runner.setActive(false);
  runner.update(HIDDEN_FRAME_MS);
  expect(positions.at(-1)).toBe(position);
  expect(controller.state).toBe(state);
  runner.setActive(true);
  duration = 0;
  for (let i = 0; i < MOVEMENT_FRAMES; i++) {
    runner.update(FRAME_MS);
    await runner.idle();
  }
  expect(controller.state).not.toBe(state);
  runner.dispose();
  const final = controller.state;
  runner.update(HIDDEN_FRAME_MS);
  await runner.idle();
  expect(controller.state).toBe(final);
});
it("keeps instant nonmovement decisions separated and has no catch-up burst", async () => {
  let decisions = 0;
  const agent: Agent = {
    id: "end",
    chooseAction: async () => {
      decisions++;
      return { type: "end-turn" };
    },
  };
  const runner = new MenuBattleRunner(
    new MenuBattleController(createMenuBattle(1), { blue: agent, red: agent }),
    { render: () => {}, position: () => {}, clear: () => {}, settled: () => {} },
    () => 0,
  );
  runner.setActive(true);
  runner.update(HIDDEN_FRAME_MS);
  runner.update(HIDDEN_FRAME_MS);
  await runner.idle();
  expect(decisions).toBe(1);
  runner.update(FRAME_MS);
  await runner.idle();
  expect(decisions).toBe(1);
  runner.update(FRAME_MS);
  await runner.idle();
  expect(decisions).toBe(2);
});
