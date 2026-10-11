import type { MenuBattleController } from "../../ai/menu-battle-controller";
import { menuBattleUi } from "../ui/theme/menu-battle-ui";
import { type MovementDriver, MovementPresenter } from "./MovementPresenter";
import { movementRoute } from "./movement-transition";

/** Frame-paced adapter. One transition, no timers, and no elapsed-time catch-up queue. */
export class MenuBattleRunner {
  private readonly presenter: MovementPresenter;
  private active = false;
  private disposed = false;
  private remaining = 0;
  private pending?: Promise<void>;
  public constructor(
    public readonly controller: MenuBattleController,
    driver: MovementDriver,
    duration: () => number,
  ) {
    this.presenter = new MovementPresenter(driver, duration);
    controller.pause();
  }
  public get busy(): boolean {
    return Boolean(this.pending || this.presenter.busy);
  }
  public setActive(active: boolean): void {
    if (this.disposed || active === this.active) return;
    this.active = active;
    if (active) {
      this.controller.resume();
      this.presenter.resume();
    } else {
      this.controller.pause();
      this.presenter.pause();
    }
  }
  public update(delta: number): void {
    if (!this.active || this.disposed) return;
    const elapsed = Math.min(Math.max(0, delta), menuBattleUi.maximumFrameDeltaMs);
    if (this.presenter.busy) {
      this.presenter.update(elapsed);
      return;
    }
    if (this.pending) return;
    this.remaining = Math.max(0, this.remaining - elapsed);
    if (this.remaining > 0) return;
    this.pending = this.advance();
  }
  public async idle(): Promise<void> {
    await this.pending;
  }
  public dispose(): void {
    this.disposed = true;
    this.active = false;
    this.controller.dispose();
    this.presenter.reset();
  }
  private async advance(): Promise<void> {
    try {
      const transition = await this.controller.step();
      if (!transition || this.disposed) return;
      this.presenter.enqueue({
        before: transition.before,
        after: transition.state,
        route: movementRoute(transition.before, transition.action, transition.accepted),
      });
      this.remaining = menuBattleUi.actionIntervalMs;
    } finally {
      this.pending = undefined;
    }
  }
}
