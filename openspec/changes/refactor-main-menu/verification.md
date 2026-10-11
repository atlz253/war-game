# Verification

Verified on 2026-10-11.

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint -- --max-diagnostics=0`: passed, with 35 existing non-null assertion warnings and no errors. New menu code passes Biome formatting, function length, file length, cognitive complexity, and magic-number checks.
- `npm test`: 105 files and 410 tests passed. A run concurrent with the production build timed out in the existing seeded batch simulation test; rerunning the suite without the concurrent build passed with the unchanged timeout and unchanged simulation code.
- `npm run build`: passed. Vite reports its existing large-bundle advisory.
- `git diff --check`: passed.
- `openspec validate refactor-main-menu --strict`: passed.
- No references to the obsolete MovementSettingsScene, scene key, or standalone movement layout remain in `src`.

Focused coverage includes ordered root controls, existing library/editor routes, commander/map continuity, map readiness refresh, LM Studio launch validation and snapshots, settings returns, production language-authoring guards, multiplayer cleanup/return payloads, slider lifecycle/listener counts, localization, and bounded commander/model text.

## Browser routes

Checked the Vite development application and built production preview in Chrome. Development route checks activate rendered Canvas button handlers and inspect active scenes; production checks dispatch mouse events to the Canvas at the visible button coordinates. No production debug API was present.

- Root displays AI WAR GAME and exactly the six requested buttons in order.
- QUICK MATCH contains Blue/Red selection, model indicators, map selection, START MATCH, instructions, and BACK. Changed Blue to Heuristic AI and selected Skirmish; settings/language round trip retained the pending setup and valid START MATCH opened battle.
- Missing LM Studio model disables launch and keeps the player in QUICK MATCH with the expected explanation. An empty catalog supplied only to the browser QA instance also disables launch with the no-map explanation. Campaign-only map blocking and readiness refresh on cycling are covered by the focused scene test.
- CAMPAIGNS and REPLAYS open their existing libraries. MAP EDITOR received the selected Skirmish map ID/source.
- MULTIPLAYER opens HOST/JOIN and both existing MENU actions return to MULTIPLAYER; BACK returns to root. Connection cleanup occurs before returning in the focused tests. The local signaling service was not running, so the host displayed its existing connection-failure status; successful peer-to-peer connection was outside this menu verification.
- SETTINGS embeds the movement slider. LM Studio SAVE & BACK returns to SETTINGS. LANGUAGE returns to SETTINGS after selecting a locale; DEV EDIT LANGUAGE returns through the selector without dropping SETTINGS context.
- Built production LANGUAGE exposes selection without CREATE/EDIT authoring. Selecting Russian returned to the translated SETTINGS title and persisted across reload.

## Layout and input

- Inspected screenshots of root, QUICK MATCH, SETTINGS, MULTIPLAYER, and their child entry screens at 1280 × 720 and 800 × 600; root also checked at 500 × 844 using the existing presentation scaling.
- English, the existing partial Russian dictionary, and a temporary in-memory locale with long Cyrillic navigation/commander labels remained inside Canvas. Missing translations retained English fallback. The temporary locale did not modify source dictionaries.
- Long commander labels wrap within their column; long buttons use existing label fitting. Submenu controls remain separated and reachable.
- In development, pointer and keyboard slider listener counts were 1 while SETTINGS was active, 0 after leaving, and 1 again after repeated visits. Resize listener counts stayed unchanged across view switches. Focus/drag input after departure did not change the saved speed.
- In production, a real Canvas track click saved speed 72; leaving SETTINGS and dispatching Home did not change it. Reload restored speed 72 and displayed 112 ms per cell.
- DOM inspection found no input, button, select, or textarea elements; game UI remains Canvas-only.

Core rules, AI/simulation code, replay formats, and storage schemas were not changed. Existing partial Russian translations intentionally continue to fall back to English for untranslated labels.
