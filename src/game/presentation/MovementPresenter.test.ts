import { describe, expect, it, vi } from "vitest";
import { createSkirmishGameState } from "../../core/scenarios/skirmish-12x8";
import { MovementPresenter } from "./MovementPresenter";

const state = createSkirmishGameState();
const route = {
  unitId: "unit",
  from: { x: 0, y: 0 },
  cells: [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
};
function fixture() {
  const driver = { render: vi.fn(), position: vi.fn(), clear: vi.fn(), settled: vi.fn() };
  let duration = CELL_DURATION_MS;
  const presenter = new MovementPresenter(driver, () => duration);
  return {
    presenter,
    driver,
    setDuration: (value: number) => {
      duration = value;
    },
  };
}
const CELL_DURATION_MS = 200;
const HALF_CELL_MS = 100;
const LONG_DELTA_MS = 1000;
const HALF_PROGRESS = 0.5;
const BEFORE_COMPLETION_MS = 399;

describe("movement presenter", () => {
  it("does not schedule work when resuming an idle presenter", () => {
    const { presenter, driver } = fixture();
    presenter.pause();
    presenter.resume();
    expect(driver.settled).not.toHaveBeenCalled();
  });
  it("interpolates each step and completes exactly once", () => {
    const { presenter, driver } = fixture();
    const done = vi.fn();
    presenter.enqueue({ before: state, after: state, route, complete: done });
    expect(presenter.busy).toBe(true);
    presenter.update(HALF_CELL_MS);
    expect(driver.position).toHaveBeenLastCalledWith("unit", { x: HALF_PROGRESS, y: 0 });
    presenter.update(CELL_DURATION_MS);
    expect(driver.position).toHaveBeenLastCalledWith("unit", { x: 1, y: HALF_PROGRESS });
    presenter.update(HALF_CELL_MS);
    presenter.update(LONG_DELTA_MS);
    expect(done).toHaveBeenCalledTimes(1);
    expect(driver.settled).toHaveBeenCalledTimes(1);
    expect(presenter.busy).toBe(false);
  });
  it("queues non-moves behind moves and snapshots speed on start", () => {
    const { presenter, driver, setDuration } = fixture();
    const order: string[] = [];
    presenter.enqueue({ before: state, after: state, route, complete: () => order.push("move") });
    presenter.enqueue({
      before: state,
      after: state,
      route: null,
      complete: () => order.push("attack"),
    });
    setDuration(0);
    presenter.enqueue({
      before: state,
      after: state,
      route,
      complete: () => order.push("instant"),
    });
    presenter.update(BEFORE_COMPLETION_MS);
    expect(order).toEqual([]);
    presenter.update(1);
    expect(order).toEqual(["move", "attack", "instant"]);
    expect(driver.settled).toHaveBeenCalledTimes(1);
  });
  it("freezes, resumes, and cancels without stale completion", () => {
    const { presenter, driver } = fixture();
    const done = vi.fn();
    presenter.enqueue({ before: state, after: state, route, complete: done });
    presenter.update(HALF_CELL_MS);
    presenter.pause();
    presenter.update(LONG_DELTA_MS);
    expect(driver.position).toHaveBeenLastCalledWith("unit", { x: HALF_PROGRESS, y: 0 });
    presenter.resume();
    presenter.update(HALF_CELL_MS);
    expect(driver.position).toHaveBeenLastCalledWith("unit", { x: 1, y: 0 });
    presenter.reset(state);
    presenter.update(LONG_DELTA_MS);
    expect(done).not.toHaveBeenCalled();
    expect(presenter.busy).toBe(false);
    expect(driver.render).toHaveBeenLastCalledWith(state);
  });
  it("finishes zero duration synchronously without a position override", () => {
    const { presenter, driver, setDuration } = fixture();
    setDuration(0);
    const done = vi.fn();
    presenter.enqueue({ before: state, after: state, route, complete: done });
    expect(done).toHaveBeenCalledTimes(1);
    expect(driver.position).not.toHaveBeenCalled();
    expect(presenter.busy).toBe(false);
  });
  it("does not drain actions received during pause", () => {
    const { presenter } = fixture();
    const done = vi.fn();
    presenter.pause();
    presenter.enqueue({ before: state, after: state, route: null, complete: done });
    expect(done).not.toHaveBeenCalled();
    presenter.resume();
    expect(done).toHaveBeenCalledTimes(1);
  });
});
