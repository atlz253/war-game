# Verification

Verified on 2026-10-11 in the local Windows workspace.

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint`: passed, no errors; 35 existing warnings in other project files. Changed/new implementation files introduce no lint warnings. Biome enforces the repository's file/function size, complexity and named-number limits.
- `npm test`: 433 tests passed in 114 files (12.03 seconds on the final default-worker run). `npm test -- --maxWorkers=2` also passed. Earlier parallel runs exceeded the existing batch simulation test's 10-second timeout while browser/soak work competed for CPU; the final normal command passed without changing that test or its timeout.
- `npm run build`: passed. Vite retains the existing large-bundle warning (Phaser application bundle).
- `npm run simulate`: passed; seed 2026, one completed ordinary Heuristic/Heuristic match, Red victory, 20 turns / 139 actions, scores Blue 49 / Red 62, zero fallbacks.
- `git diff --check`: passed.
- `openspec validate add-menu-background-battle --strict`: passed.

Focused tests were run failing before the respective implementations: seeded factory, infinite ammo/reinforcement/strip protection, controller, camera crop, runner, foreground backdrop, ambient renderer overlays, and immediate scene-creation handoff. Additional scene lifecycle coverage verifies visibility suspension and shutdown cleanup.

## Task evidence

| Tasks | Evidence |
| --- | --- |
| 1.1–1.3 | `src/core/menu-battle/menu-battle.test.ts`: identical seeds, valid sparse map, opposing hidden deployment, connected approaches, 20 generation seeds, frontline waves, survivor identity, full-capacity terminating placement and invalid-capacity rejection. `docs/menu-background-battle.md` documents the policy and bounded cell enumeration. |
| 2.1–2.4 | `menu-combat.test.ts`: 12 accepted attacks/counterattacks without ammo consumption, both elimination sides, counterattack elimination, scores/survivors/turn continuity, deterministic replacement, ordinary victory/ammo, opposing-strip validation/path/legal action protection. Controller soak reapplies accepted actions to an independent state across waves. Existing core/replay tests remain green. |
| 3.1–3.3 | `src/ai/menu-battle-controller.test.ts`: one pending decision, pause/late/disposed responses, legal rejection/error fallback, bounded current-turn context. Seed 42 / 600 actions produced turn 124, Blue wave 10 and Red wave 10, scores 298/303; repeated action replay is identical, damage recurs, ammo remains full and winner stays null. No Phaser, storage or network imports in controller/core. |
| 4.1–4.4 | Camera layout tests cover desktop, tall, wide, small and edge-combat crops. Runner tests cover pacing, capped delta, mid-move retention, subsequent speed changes and disposal. Renderer tests cover absent ambient overlays and destroyed-view removal. Scene test checks input disabled, visibility suspension and released resize/document listeners. Shared MovementPresenter/route tests remain green. |
| 5.1–5.4 | Lifecycle tests cover every menu member and every suspended activity, repeat/self restart/reload, immediate destination-based handoff and coordinator disposal. Backdrop tests preserve interactive fields and release resize hooks. Existing menu, slider, configuration and child-return tests pass. Both navigation and background documentation updated. |
| 6.1–6.4 | Commands above, browser evidence below, final diff review and strict OpenSpec validation. |

## Browser evidence

Development checks at `http://localhost:5173/` covered all seven foreground scenes (MainMenu, Language, LM Studio, Host, Join, CampaignLibrary, ReplayLibrary) at 1440×900, 600×1000 and 2400×600. All retained the identical controller object, transparent foreground camera and visible progressing background. Each camera world interval stayed inside the central region; both deployment strips stayed hidden. Wide crops contained 4–5 combat units in sampled frames. Representative desktop/tall/wide screenshots were visually inspected. English and the existing partial Russian locale render readable labels; missing Russian translations retain existing English fallback behavior.

Canvas mouse events exercised root/submenu controls, language selection, LM Studio return, Host/Join returns, campaign/replay libraries, and the movement slider. Speed 100 preserved the active move's 200 ms duration, subsequent moves used instant presentation, and restoring the slider returned speed 50. Background input remained disabled. Language authoring and self restart retained the same controller without saving locale edits.

Starting a real quick match hid/suspended the demonstration. Its state remained identical while gameplay was open; the real GameState contained neither demo policy nor reserved-strip metadata. Escape/main-menu returned to the retained session. MapEditor, CampaignEditor, Result and a valid ordinary replay playback likewise froze/hid it and resumed on return. The temporary replay fixture was removed; no ambient replay records were created.

Ten repeated settings/language round trips kept scale resize listener count at 19 (before, maximum and after). At turn 487, Blue wave 38 and Red wave 32 (70 total waves), the background retained four unit views for four living units, no health-label views, no queued transitions and zero timer events. Other sampled frames had 3–5 views matching live units. The coordinator contributes one prestep subscription; the game's total remained three. No lifetime action history is stored.

A 31.2-second instant-speed sample measured 288 local decisions: mean 4.48 ms, maximum 48.5 ms on this machine. These are local observations, not a cross-device frame-time guarantee. The runner yields between actions, caps delta at 50 ms and retains only one transition/decision.

Visibility recovery was checked through the actual `visibilitychange` listener with a temporary hidden-document fixture: authoritative state and active movement elapsed time stayed frozen, recovery resumed the same controller, and no catch-up queue appeared. The automated browser did not expose natural tab switching as `document.hidden`; this fixture limitation is covered additionally by the scene and runner unit tests.

Production preview at `http://localhost:4173/` rendered ongoing combat behind SETTINGS with readable controls. It exposed no development game global and contained zero DOM buttons/inputs/selects/textareas. The background and units use only existing manifest assets. Host setup reported the expected refused localhost:8080 signalling connection in this environment; it did not originate from the background. Production preview also reported a favicon 404; no application errors were observed.
