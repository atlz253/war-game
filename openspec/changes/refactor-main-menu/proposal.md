# Proposal

## Why

The main menu currently mixes match setup, multiplayer entry points, settings, and library/editor navigation on one screen. Grouping these controls by purpose will make the initial screen easier to scan while retaining existing game flows.

## What Changes

- Show only six navigation buttons beneath AI WAR GAME, in this order: CAMPAIGNS, QUICK MATCH, MULTIPLAYER, REPLAYS, MAP EDITOR, SETTINGS.
- Move Blue/Red commander selection, model indicators, map selection, START MATCH, and match setup instructions into QUICK MATCH, with a return button to the main menu.
- Move HOST P2P and JOIN P2P into MULTIPLAYER, with a return button to the main menu; preserve the existing host/join workflows.
- Move settings into SETTINGS: present movement speed directly as the existing Canvas slider, alongside LM STUDIO SETTINGS and LANGUAGE entry buttons and a return button to the main menu.
- Return from LM Studio and language screens to SETTINGS, retaining pending commander/map selections and refreshing settings and localized labels.
- Preserve CAMPAIGNS, REPLAYS, and MAP EDITOR behavior, including opening the editor for the pending selected map.
- Keep new labels localized with English fallback and reuse existing Canvas controls and viewport scaling.

## Capabilities

### New Capabilities

- `main-menu-navigation`: Ordered main menu entry points, purpose-specific submenus, return navigation, and pending match setup preservation.

### Modified Capabilities

None. The existing `unit-movement-presentation` requirement already specifies a slider in main menu settings; this change embeds the existing control directly in SETTINGS without changing its semantics. The completed but unarchived `add-game-localization` change remains the source of the localization behavior to preserve.

## Impact

- Affects `MainMenuScene`, a proposed menu navigation model and layout theme, and the settings/submenu presentation under `src/game`.
- Updates return data/navigation in `LmStudioSettingsScene`, `LanguageScene`, `MultiplayerHostScene`, and `MultiplayerJoinScene`; removes the obsolete standalone `MovementSettingsScene` registration and key if no callers remain.
- Updates scene registration in `src/main.ts`, locale dictionaries, and focused Canvas/navigation tests, including existing localization menu/selector/surface tests.
- No new dependencies, artwork, persistence schema, network protocol, core rules, AI behavior, or replay format changes are needed.
