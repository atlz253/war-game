import type { GameState, Position } from "../../core/model/game-state";
import type { MovementRoute } from "./movement-transition";

export interface PresentationTransition {
  readonly before: GameState;
  readonly after: GameState;
  readonly route: MovementRoute | null;
  readonly complete?: () => void;
}
export interface MovementDriver {
  render(state: GameState): void;
  position(unitId: string, position: Position): void;
  clear(): void;
  settled(): void;
}
interface ActiveMovement {
  readonly transition: PresentationTransition;
  readonly duration: number;
  elapsed: number;
}

/** Owns display snapshots, never authoritative state. update uses scene delta, not wall time.
 * reset invalidates queued completion callbacks; pause preserves the active step and duration.
 * The driver owns visual overrides until clear. settled fires only after the entire queue drains.
 */
export class MovementPresenter {
  private queue: PresentationTransition[] = [];
  private active?: ActiveMovement;
  private paused = false;
  private generation = 0;
  private draining = false;
  public constructor(
    private readonly driver: MovementDriver,
    private readonly duration: () => number,
  ) {}

  public get busy(): boolean {
    return Boolean(this.active || this.queue.length);
  }

  public enqueue(transition: PresentationTransition): void {
    this.queue.push(transition);
    this.drain();
  }

  public pause(): void {
    this.paused = true;
  }
  public resume(): void {
    this.paused = false;
    this.drain();
  }

  public reset(state?: GameState): void {
    this.generation++;
    this.queue = [];
    this.active = undefined;
    this.paused = false;
    this.driver.clear();
    if (state) this.driver.render(state);
  }

  public update(delta: number): void {
    const active = this.active;
    const route = active?.transition.route;
    if (this.paused || !active || !route) return;
    active.elapsed = Math.min(
      active.elapsed + Math.max(0, delta),
      active.duration * route.cells.length,
    );
    const progress = active.elapsed / active.duration;
    const step = Math.min(Math.floor(progress), route.cells.length - 1);
    const from = step === 0 ? route.from : route.cells[step - 1];
    const to = route.cells[step];
    const fraction = Math.min(1, progress - step);
    if (from && to) this.driver.position(route.unitId, interpolate(from, to, fraction));
    if (active.elapsed < active.duration * route.cells.length) return;
    this.active = undefined;
    const generation = this.generation;
    this.finish(active.transition);
    if (generation === this.generation && !this.paused) {
      if (this.queue.length) this.drain();
      else this.driver.settled();
    }
  }

  private drain(): void {
    if (this.draining || this.paused || this.active || !this.queue.length) return;
    this.draining = true;
    const generation = this.generation;
    try {
      while (this.queue.length && !this.paused && generation === this.generation) {
        const transition = this.queue.shift();
        if (!transition) break;
        const duration = this.duration();
        if (transition.route && duration > 0) {
          this.active = { transition, duration, elapsed: 0 };
          this.driver.position(transition.route.unitId, transition.route.from);
          this.driver.render(transition.before);
          return;
        }
        this.finish(transition);
      }
      if (!this.busy && generation === this.generation) this.driver.settled();
    } finally {
      this.draining = false;
    }
    if (this.queue.length && !this.active && !this.paused && generation === this.generation)
      this.drain();
  }

  private finish(transition: PresentationTransition): void {
    this.driver.clear();
    this.driver.render(transition.after);
    transition.complete?.();
  }
}

function interpolate(from: Position, to: Position, fraction: number): Position {
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
}
