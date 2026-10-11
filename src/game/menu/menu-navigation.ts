import type { MatchConfiguration } from "../match/match-configuration";

export type MenuView = "main" | "quick-match" | "multiplayer" | "settings";

export interface MainMenuSceneData {
  readonly matchConfiguration?: MatchConfiguration;
  readonly selectedMapKey?: string | null;
  readonly view?: MenuView;
}

export interface MultiplayerMenuData {
  readonly returnMenu?: MainMenuSceneData;
}

export const MAIN_MENU_ENTRIES = [
  { id: "campaigns", label: "campaign-library.campaigns", view: null },
  { id: "quick-match", label: "main-menu.quick.match", view: "quick-match" },
  { id: "multiplayer", label: "main-menu.multiplayer", view: "multiplayer" },
  { id: "replays", label: "main-menu.replays", view: null },
  { id: "map-editor", label: "main-menu.map.editor", view: null },
  { id: "settings", label: "main-menu.settings", view: "settings" },
] as const;

export function menuView(data: MainMenuSceneData): MenuView {
  return data.view ?? "main";
}

export function menuReturnData(data: MainMenuSceneData, view: MenuView): MainMenuSceneData {
  return { ...data, view };
}
