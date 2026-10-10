# Campaign acceptance verification

Verified on 2026-10-10 against `add-campaign-editor`, using the local Vite development build in Chromium and an isolated browser context. The development server used `http://127.0.0.1:5174` because port 5173 was already occupied. Existing user-profile storage was not modified.

## Automated checks

| Command | Result |
| --- | --- |
| `npm run test` | 77 files, 292 tests passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; includes file size, function length, cognitive complexity and magic-number rules |
| `npm run build` | Passed; Vite reports the existing large Phaser bundle warning |
| `npm run simulate` | One deterministic skirmish completed, seed 2026, Red victory, 20 turns, 139 actions, scores Blue 49 / Red 62, no fallback |
| `openspec validate add-campaign-editor --strict` | Passed |
| `git diff --check` | Passed; Git prints local LF/CRLF conversion notices |

Tests cover campaign draft serialization and readiness, explicit map bindings, terrain routes, reach-cell action rules, deterministic signals and ordering, Unicode text entry, storage failures, Canvas callbacks, session snapshots, fresh progression/retry, movement/dialogue/pause barriers, result disposal, legacy replay reading, v2 snapshot validation and replay traversal. Buttons consume pointer events before their callbacks, preventing the final dialogue close from unlocking a board click in the same input dispatch. Existing movement, standalone, AI, multiplayer protocol and replay suites remain green.

Production files remain within 1,000 lines, tests within 1,500 lines, functions within 75 nonblank lines and cognitive complexity within 15. `BattleScene.ts` is 998 lines; presentation helpers were extracted rather than exceeding the limit. No dependencies, runtime artwork, DOM controls or map schema version were added. The new map is ordinary scenario JSON; previews use registered terrain/unit textures.

## Browser method

The checks combined screenshot inspection with a Canvas callback harness through the development-only `window.__AI_WAR_GAME__` hook. Buttons were exercised through their Phaser pointer handlers; selection used `BattleScene.handleBoardClick` with camera-transformed coordinates. Actions used the scene's normal submission path and deterministic core validation. This was not an end-to-end physical mouse/keyboard automation run. Screenshots were inspected at 1920×1080 and 1280×720; the editor also used the existing responsive presentation transform in a portrait viewport.

A synthetic mouse-down/up dispatched to the Canvas at the final dialogue-close button also exercised Phaser's actual input dispatch: the dialogue closed, with zero board callbacks, zero actions and no selected unit. This supplements the explicit pointer-consumption unit test.

For automated defeat verification only, the scene timer scale was accelerated and movement set to No animation. Red still chose its natural Heuristic actions; no winner, health, position or score was assigned directly. Use ordinary speed for manual repetition. The P2P check was limited to screen navigation and error handling because signaling was unavailable in this environment.

## Authoring and persistence

1. Open CAMPAIGNS in a fresh browser context. The built-in Tutorial Campaign is immediately playable; DELETE is disabled for it.
2. Open the tutorial, edit a dialogue through EDIT TEXT, and enter 25 Russian lines (1,700 characters). Exercise cursor editing, line breaks and SCROLL UP/DOWN. SAVE TEXT and SAVE AS COPY.
3. Return to the library and reload the page. Reopen the local copy: all text and mission/event identities survive, and the original tutorial remains unchanged.
4. Add a mission, move it up/down and inspect its retained map/events. Change the map and verify unit/objective bindings require CONFIRM MAP BINDINGS. Select a goal and a Blue unit on the read-only preview; the editor submits no battle actions.
5. Try an out-of-bounds goal or a missing unit reference. Readiness shows the affected mission/event path and disables Play. Correct/rebind the reference and verify readiness returns.
6. Open EDIT DIALOGUE EVENTS. Cycle TRIGGER through mission-start, turn, unit-moved, unit-selected, unit-arrived and mission-end. Configure any/specific units, positive turns and exact cells; add/reorder/remove lines and events. Save and reopen.
7. Leave a dirty draft: CANCEL returns to editing, DISCARD AND LEAVE navigates without saving, and SAVE AND LEAVE persists before navigation. Storage failure paths are covered with injected corrupt JSON and throwing storage implementations in Vitest.

Observed: all six forms were exercised through Canvas buttons. A two-mission campaign reopened with nine events covering all six trigger types and an additional 1,700-character Russian start dialogue. Long runtime dialogue wrapped and scrolled while NEXT / CLOSE remained usable. Inspection found zero `input`, `textarea`, `select` or HTML `button` elements. Preview picking, scrolling and modal input did not create battle orders.

## Two-map trigger and progression checks

Use two missions: `skirmish-12x8` with standard conditions, and `tutorial-movement-12x5` with its reach-cell policy. On the skirmish mission author the following single-line Commander events in order:

| ID | Trigger |
| --- | --- |
| `start` | mission-start |
| `turn1` | turn 1 |
| `turn2` | turn 2 |
| `selected` | unit-selected, any |
| `arrive` | unit-arrived, any, `(3,1)` |
| `move` | unit-moved, any |
| `ai-move` | unit-moved, specific `red-infantry-1` |
| `end` | mission-end |

Confirm map bindings and save before Play.

1. Observe start before turn-one dialogue. Close both; select Blue infantry at `(1,1)`. The selection dialogue appears, and clicking the same unit again after closing adds no occurrence or combat action.
2. Move to `(3,1)`. Arrival and movement dialogues appear in authored order after movement completes. Pause mid-movement, resume, then pause over dialogue; neither loses progress or resumes AI early.
3. In a fresh attempt, try an invalid destination `(999,1)`: no action or dialogue is recorded. Move from `(1,1)` to `(4,1)`, crossing `(3,1)`: movement fires, arrival does not. Then move back to `(3,1)`: arrival fires once.
4. End Blue's turn: turn two appears before Red acts. Close it and observe Heuristic movements. The specific Red infantry movement dialogue blocks subsequent AI actions until closed.
5. For a defeat, repeatedly end Blue turns without attacking. Close pending dialogue. The observed run ended in Red victory on turn 18 after 99 accepted actions. Mission-end remained open before the result; closing it showed RETRY, WATCH REPLAY and MENU.
6. RETRY launched the same mission at turn one, with initial units, zero scores, fresh actions and renewed start/turn-one dialogues.
7. For a short, reproducible Next check, put the tutorial first and temporarily set its goal to `(2,1)`, followed by the standard skirmish. Move the second Blue infantry to that goal. Close congratulations and choose NEXT MISSION. The skirmish opened at index one with standard policy, turn one, no winner, zero scores and its start dialogue.

Observed: both maps and policies were exercised, human/AI movement used the common accepted-action adapter, all eight skirmish events fired once in the defeat run, and crossing/rejected-action checks produced the expected journals. Snapshot/progression tests additionally verify edits cannot affect an active run and defeat never advances its index.

## Shipped tutorial at both movement endpoints

Use the unchanged built-in Tutorial Campaign, goal `(11,2)`.

1. Set movement speed to Slow. Play, close the introduction, select infantry at `(0,1)` and close its selection instruction.
2. Move to `(4,2)` and close the movement-points/end-turn instruction. END TURN accepts Blue's end-turn and automatically records Red's empty turn. Reselect, move to `(8,2)`, END TURN, reselect and move to `(11,2)`.
3. The winning move finishes before congratulations; no early victory occurs. Close congratulations: CAMPAIGN COMPLETE appears with no nonexistent next mission.
4. Repeat at No animation with infantry at `(0,3)` and the same destinations. Both units can finish; the final state is identical apart from which unit moved.

Observed: each attempt recorded seven actions (three moves and four end-turns), ended in Blue victory at turn five with unchanged zero scores, and journaled introduction, selection, movement and completion once each. The HUD displayed the exact goal and the board highlighted it. Pause/resume preserved the current line. The tutorial map was disabled for standalone START MATCH while remaining playable as a campaign.

## Replay and compatibility

1. Choose WATCH REPLAY from the tutorial result. Initial introduction and recorded selection occur at boundary zero, before the first move.
2. Close both, step forward: the first movement lesson follows the recorded move's presentation. Autoplay and additional steps wait for dialogue; existing replay speed scales movement duration.
3. While dialogue is open, use REPLAY START or PREVIOUS FRAME. The modal and animation cancel, the requested frame appears immediately, and subsequent forward traversal shows the recorded movement dialogue again.
4. Load the replay after editing local campaign dialogue: snapshots retain the old text, policy and final Blue victory. Replay reads recorded actions without AI, network inference or campaign progression. Vitest rejects tampered policy, sources, missing/duplicate occurrences, invalid selection, sequence and boundaries; v1 action-only records remain readable.
5. Start a standalone skirmish: standard policy, ordinary controls, no campaign run or dialogue controller. Existing PLAY AGAIN remains available after standalone results.
6. Open HOST P2P and JOIN P2P and return to MENU. Canvas controls and navigation work. Host displayed `SIGNALING CONNECTION FAILED`; a live peer match could not be exercised without the existing signaling service. Multiplayer sequence/snapshot behavior and absence of campaign progression are covered by the passing protocol/presentation suites.

Browser replay verification observed boundary-zero ordering, post-animation dialogue, cancellation during seeking and repeat forward traversal. Pure replay integration tests cover autoplay blocking and 2× movement timing. The actual two-peer connection remains an environmental verification limitation.

## JSON storage and file exchange revision (2026-10-10)

This revision replaces the initial built-in Save As Copy behavior described above: DEV now also offers source SAVE; production built-ins are play/export only. No campaign combat, movement, simulation, or replay schema rules changed.

### Method

Used isolated Chromium contexts on `http://127.0.0.1:5174` (DEV) and a served production build on `http://127.0.0.1:5175` (`npm run preview -- --host 127.0.0.1 --port 5175 --strictPort`). Inspected screenshots at 1920×1080 and exercised Canvas button pointer handlers. DEV used the existing game hook. Production had no `window.__AI_WAR_GAME__`; the QA harness captured the existing game from a single SceneManager update and restored the prototype immediately. No production hook was added.

Import checks fed synthetic native `File`/`DataTransfer` objects into the actual temporary input's change handler; the operating-system chooser was not automated. Exports invoked the real adapter while capturing its Blob for JSON comparison. Cancellation, read/permission failures, object-URL cleanup, storage failures and shutdown races are additionally verified with focused Vitest tests. One synthetic mouse-down/up on the Canvas exercised actual Phaser dispatch at the dialogue-close button.

### DEV source and local round-trip

1. Make a temporary copy of `tutorial.json` with ID `qa-json-acceptance` and name `QA source JSON` (or POST that definition to `/__dev-campaigns`). The eager catalog discovers it without a registry edit.
2. Open the new built-in in CAMPAIGNS, rename it `QA source saved`, and change the first dialogue to 35 Russian/Japanese lines (2,370 characters). Click SAVE. Inspect `qa-json-acceptance.json`, then reopen after catalog reload.
3. Observe the saved name and full multiline text. Open EDIT TEXT, exercise SCROLL UP/DOWN and SAVE TEXT; screenshot inspection confirms text and controls are readable.
4. Click SAVE AS COPY, make an unsaved name change, then EXPORT. Confirm the Blob contains that change, the editor stays dirty, and local persistence is unchanged by export. BACK/CANCEL returns to the draft; BACK/DISCARD AND LEAVE exits without saving the name change.
5. IMPORT that exported definition through the library. The original local ID `qa-json-acceptance-2` collides, so the new entry is `qa-json-acceptance-2-2`. It is selected; nested mission/event IDs, order, bindings and all 35 text lines match exactly.
6. Remove only the temporary QA source file. The catalog returns to the unchanged shipped tutorial. POST malformed JSON, schemaVersion 9 and ID `../escape`: each returns 400; GET returns 405. Atomic replacement and source retention on write failure are covered by an injected filesystem failure test.

Observed: source SAVE wrote disk JSON and caused catalog reload, with no local campaign entry. SAVE AS COPY created independent local content. Source discovery, local collision handling, draft export, dirty navigation, long text and cleanup passed. Inspection found zero surviving `input`, `textarea`, `select`, HTML `button` or download `a` elements. The temporary QA source was removed after verification.

### Served production build

1. Open CAMPAIGNS with empty local storage. Tutorial Campaign has enabled PLAY/EXPORT and disabled OPEN / RENAME/DELETE. Attempt direct editor initialization with the tutorial and `builtIn: false`: it returns to the library. `/__dev-campaigns` POST returns 404.
2. EXPORT the tutorial, then IMPORT it. The export has exactly `schemaVersion`, `id`, `name`, `missions`; import creates local `tutorial-2`, selects it, and leaves the built-in unchanged.
3. IMPORT malformed JSON and an unsupported version. Both display errors and leave the library byte-for-byte unchanged.
4. Open the local copy, change its name and SAVE. It persists locally and becomes clean. Make another unsaved name change and EXPORT: the file contains the new name, storage stays unchanged, and dirty state remains. BACK/SAVE AND LEAVE saves before navigating. Local editing/import/export remain available in production.
5. Play the original tutorial at No animation. Close introduction, select `(0,1)`, close selection, move to `(4,2)`, close movement, END TURN, wait for Blue turn three, reselect/move to `(8,2)`, END TURN, wait for Blue turn five, reselect/move to `(11,2)`.
6. Closing the introduction with actual Canvas mouse dispatch produces zero board callbacks and zero actions. The final accepted move wins for Blue; congratulations precede CAMPAIGN COMPLETE. The replay records seven actions, turn five, goal `(11,2)` and the four original event IDs/texts.
7. WATCH REPLAY: close boundary-zero dialogues, step with `>`, inspect movement dialogue at frame one, use REPLAY START, then step forward again. Frames are `1 → 0 → 1`; original tutorial snapshots survive local edits and file exchange.
8. Return to the menu and START MATCH on the default Snake map. It opens a standalone battle with standard conditions, no campaign run and no narrative controller.

Observed: all steps passed. Production screenshots show the source-edit controls disabled while local entries and file controls remain available. Existing full-suite tests cover Slow/No animation presentation, snapshot isolation, standalone rules and deterministic replay validation. This revision did not rerun a live two-peer match; the earlier signaling-service limitation still applies.

### Automated checks

`npm run test`: 82 files / 317 tests passed. The focused campaign/core/scene subset passed 19 files / 59 tests. Typecheck, Biome lint and production build passed; Vite reports the existing large Phaser bundle warning. The migrated tutorial JSON was compared deeply with the previous committed TypeScript payload and is identical. `git diff --check` and `openspec validate add-campaign-editor --strict` passed. File, function and complexity limits passed through Biome. Simulation code and action rules are unchanged, so no new simulation run was required; the initial implementation's deterministic simulation result remains above.

## Explicit save destinations revision (2026-10-10)

This revision supersedes the SAVE / SAVE AS COPY labels in the earlier historical acceptance records. SAVE now writes local storage; BUILT IN SAVE writes source JSON only in DEV; SAVE AND LEAVE uses local SAVE.

### Reproducible browser acceptance

Use isolated browser storage with `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`, and serve `npm run build` using `npm run preview -- --host 127.0.0.1 --port 5175 --strictPort`. The check invoked actual Phaser Canvas button handlers through browser evaluation. Temporary scene hooks inspected drafts and storage; production game access was captured through one SceneManager update and the hook was restored. No runtime hooks were added to production code. Inspect the DEV editor at 1920x1080 to verify both save labels are readable and do not overlap.

1. DEV: open the built-in tutorial, change its name and choose SAVE. Verify one local `tutorial-2` is created with unchanged nested mission/dialogue data. Change the name and SAVE again: the same local entry is updated, without another copy or a source write. Observed names were `QA local lesson` then `QA local latest`; the editor became clean.
2. DEV: use the disposable draft ID `qa-save-buttons` and choose BUILT IN SAVE. Verify `src/core/campaigns/definitions/qa-save-buttons.json` is created and the catalog refreshes. Reopen that built-in, edit its name and save to source again. Observed disk content changed from `QA source` to `QA updated source`; local storage remained byte-for-byte unchanged. The original tutorial source was not edited. Remove only this disposable source file after checking its resolved path remains within the definitions directory.
3. DEV: attempt BUILT IN SAVE with an invalid `../invalid` ID. The API rejects it visibly, the draft remains dirty and local storage stays unchanged. Focused Vitest tests additionally verify new/local source saves, existing source preservation on filesystem failure, quota errors, nested identity preservation and collision allocation across both catalogs.
4. Production: built-in OPEN / RENAME remains disabled; CREATE opens a local editor with SAVE and no BUILT IN SAVE. SAVE persists the new local draft; change its name and use BACK / SAVE AND LEAVE. The same local ID is updated before returning to the library. POST `/__dev-campaigns` returns 404 and the DEV game hook is absent.
5. Production: place a separate local entry with the built-in `tutorial` ID in the browser library, select its local row and open it. SAVE updates that local entry. This verifies origin is independent of ID membership and does not relax direct built-in editing restrictions.
6. Production: edit that local entry without saving, EXPORT the draft and verify the exported name differs from stored data while the draft stays dirty. Discard and IMPORT the exported file: the actual temporary picker adapter (supplied with a synthetic File for automation) creates collision-safe `tutorial-2`. No temporary input/download elements remain. The operating-system chooser itself was not automated.

Observed: all listed browser checks passed. Focused scene tests also cover SAVE AND LEAVE quota failure, newer edits before save completion, scene shutdown, and pending source-save snapshot isolation. Earlier tutorial/replay walkthroughs remain above; this revision changes authoring persistence only. Core action rules, movement, tutorial source, simulation and replay processing are unchanged.

### Automated checks

`npm run test`: 82 files / 324 tests passed. The focused persistence/scenes/writer/API run passed 5 files / 27 tests before the additional save-and-leave cases; the final scene subset passed 2 files / 16 tests. `npm run build` (including typecheck) and `npm run lint` passed. Vite retains its existing large Phaser bundle warning. The final diff and OpenSpec validation were checked before handoff. Biome checked file/function/complexity limits. No simulation run was needed because simulation and combat rules did not change.
