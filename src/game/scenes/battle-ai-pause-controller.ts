export type BattleAiResume<T> =
  | { readonly kind: "apply"; readonly decision: T }
  | { readonly kind: "start-delay" }
  | { readonly kind: "none" };

export class BattleAiPauseController<T> {
  private isPaused = false;
  private hasExited = false;
  private hasPendingDelay = false;
  private deferredDecision: T | null = null;

  public beginDelay(): void {
    if (!this.hasExited) this.hasPendingDelay = true;
  }

  public delayStarted(): void {
    this.hasPendingDelay = false;
  }

  public pause(): { readonly cancelDelay: boolean } {
    this.isPaused = true;
    return { cancelDelay: this.hasPendingDelay };
  }

  public resume(): BattleAiResume<T> {
    if (this.hasExited) return { kind: "none" };
    this.isPaused = false;

    if (this.deferredDecision) {
      const decision = this.deferredDecision;
      this.deferredDecision = null;
      return { kind: "apply", decision };
    }

    if (this.hasPendingDelay) {
      this.hasPendingDelay = false;
      return { kind: "start-delay" };
    }

    return { kind: "none" };
  }

  public receiveDecision(decision: T): { readonly kind: "apply" | "defer" | "discard" } {
    if (this.hasExited) return { kind: "discard" };
    if (!this.isPaused) return { kind: "apply" };
    this.deferredDecision = decision;
    return { kind: "defer" };
  }

  public exit(): void {
    this.hasExited = true;
    this.hasPendingDelay = false;
    this.deferredDecision = null;
  }
}
