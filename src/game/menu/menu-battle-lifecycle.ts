export const MENU_BATTLE_SCENE_KEY = "menu-background-battle";
export const MENU_BATTLE_FOREGROUNDS: readonly string[] = [
  "main-menu",
  "language",
  "lm-studio-settings",
  "multiplayer-host",
  "multiplayer-join",
  "campaign-library",
  "replay-library",
];
export class MenuBattleLifecycle {
  private started = false;
  public reconcile(foregrounds: readonly string[]): { start: boolean; active: boolean } {
    const active = foregrounds.some((key) => MENU_BATTLE_FOREGROUNDS.includes(key));
    const start = active && !this.started;
    if (start) this.started = true;
    return { start, active };
  }
}
