# Menu navigation

AI WAR GAME opens with six buttons, in order:

1. **CAMPAIGNS** opens the existing campaign library.
2. **QUICK MATCH** opens commander and map setup.
3. **MULTIPLAYER** opens the HOST P2P and JOIN P2P entry points.
4. **REPLAYS** opens the existing replay library.
5. **MAP EDITOR** opens the existing editor for the pending selected map.
6. **SETTINGS** opens local presentation and connection settings.

All controls are drawn inside the game Canvas. Labels use the selected interface language, with English fallback for missing translations.

## Quick match

Choose BLUE COMMANDER and RED COMMANDER by cycling between Human, Heuristic AI, and LM Studio AI. LM Studio commanders show the configured model ID. Cycle the available maps and select START MATCH. Missing maps, maps without both sides, or incomplete LM Studio configuration disable launch and show the corresponding explanation.

BACK returns to the main menu. Commander and map selections remain available while visiting other menu submenus and their settings or multiplayer setup screens. Launch snapshots the current saved LM Studio settings. Pending quick match selections do not configure a multiplayer lobby.

## Multiplayer

HOST P2P and JOIN P2P open the existing host and join workflows. Their MENU buttons close abandoned connections and return to MULTIPLAYER. BACK in MULTIPLAYER returns to the main menu. Successful multiplayer match launch retains its existing behavior.

## Settings

Movement speed appears directly in SETTINGS as a slider; there is no separate movement settings screen. Click or drag the track, or focus it and use arrow keys, Home, or End. The slider runs from Slow to No animation, displays duration per cell, and defaults to 200 ms per cell. Changes apply to future movement and persist across reloads; unavailable storage preserves the choice for the current session. Existing battle and replay pause sliders use the same setting.

LM STUDIO SETTINGS and LANGUAGE open their existing screens and return to SETTINGS. Saved model connections and translated labels refresh on return while commander/map selections remain intact. Language authoring remains available only in development and preserves save/discard/cancel safeguards. BACK in SETTINGS returns to the main menu and releases slider pointer/keyboard focus.

Menu navigation does not change core rules, accepted actions, replay formats, or match outcomes.
