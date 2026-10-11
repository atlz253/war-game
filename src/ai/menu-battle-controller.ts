import type { GameAction } from "../core/actions/game-actions";
import type { GameState, SideId } from "../core/model/game-state";
import { type ApplyActionResult, applyAction } from "../core/rules/apply-action";
import type { Agent } from "./agents/Agent";
import { HeuristicAgent } from "./agents/HeuristicAgent";

export interface MenuBattleTransition extends ApplyActionResult {
  readonly action: GameAction;
  readonly before: GameState;
}

/** One caller-paced decision; no clocks, network, storage or lifetime action log. */
export class MenuBattleController {
  private current: GameState;
  private context: GameAction[] = [];
  private paused = false;
  private disposed = false;
  private pending = false;
  private generation = 0;
  public readonly contextLimit: number;

  public constructor(
    state: GameState,
    private readonly agents: Readonly<Record<SideId, Agent>> = {
      blue: new HeuristicAgent(),
      red: new HeuristicAgent(),
    },
  ) {
    this.current = state;
    // Each unit has a bounded movement budget plus one main action per turn.
    const maximumMoves = Math.max(...Object.values(state.units).map((u) => u.maxMovementPoints));
    this.contextLimit =
      (state.menuBattle?.config.maxWaveSize ?? Object.keys(state.units).length) *
      (maximumMoves + 1);
  }
  public get state(): GameState {
    return this.current;
  }
  public get actionsThisTurn(): readonly GameAction[] {
    return this.context;
  }
  public pause(): void {
    this.paused = true;
    this.generation++;
  }
  public resume(): void {
    if (!this.disposed) this.paused = false;
  }
  public dispose(): void {
    this.disposed = true;
    this.pause();
    this.context = [];
  }

  public async step(): Promise<MenuBattleTransition | null> {
    if (this.paused || this.disposed || this.pending) return null;
    this.pending = true;
    const generation = this.generation;
    const before = this.current;
    try {
      let action: GameAction;
      try {
        action = await this.agents[before.activeSide].chooseAction(before, {
          actionsThisTurn: [...this.context],
        });
      } catch {
        action = { type: "end-turn" };
      }
      if (this.disposed || this.paused || generation !== this.generation) return null;
      let result = applyAction(before, action);
      if (!result.accepted) {
        action = { type: "end-turn" };
        result = applyAction(before, action);
      }
      this.current = result.state;
      this.context =
        action.type === "end-turn" ? [] : [...this.context, action].slice(-this.contextLimit);
      return { ...result, action, before };
    } finally {
      this.pending = false;
    }
  }
}
