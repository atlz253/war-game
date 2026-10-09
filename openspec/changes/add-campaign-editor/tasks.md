# Tasks

Use TDD for every behavior task: first a focused failing Vitest test, then the smallest implementation, followed by refactoring with tests green. UI checks supplement unit tests. Split files/functions by responsibility before reaching contributor-guide limits.

## 1. Campaign definitions and validation

- [x] 1.1 Add versioned campaign/mission/dialogue definitions and six discriminated triggers under `src/core/campaigns`; verify Vitest serialization round-trip, unknown version/type rejection, stable IDs, drafts with empty missions/lines, and no game/Phaser dependencies.
- [x] 1.2 Implement readiness validation with injected built-in maps: standard-match and standard-match-or-reach-cell, reach-cell mission readiness without Red, unique IDs, nonempty names/lines, turn number, unit bindings, and cell bounds. Verify Vitest coverage of invalid references, missing maps, duplicate IDs, Blue eligibility, objective terrain passability/reachability, rebinding, and errors with mission/event paths; standard standalone readiness remains unchanged.
- [x] 1.3 Add pure draft operations to create/delete/reorder missions, events, and lines and explicitly rebind after map changes; verify Vitest preservation of identity/content during reordering and no silent reassignment of coincidentally matching unit IDs.
- [x] 1.4 Document schema v1, draft/readiness, objective policy, and map binding in `docs/campaigns.md`, and dependency boundaries in `docs/architecture.md`; check examples against passing round-trip tests.
- [x] 1.5 Add a serializable core victory policy and mission initial-state factory with default standard-match; verify Vitest initialized policy, no initial victory for an empty Red side or initial target occupancy, and unchanged existing standalone factories.
- [x] 1.6 Implement reach-cell victory inside `applyAction` after accepted movement: any/specific Blue, exact destination, winner, and ordered victory event. Verify Vitest rejected moves, crossing, wrong/Red units, unchanged score, standard combat victory/defeat, and rejection of every order after victory; UI must not mutate the winner.

## 2. Deterministic mission events

- [x] 2.1 Implement a pure matcher for lifecycle/turn triggers and a once-per-attempt occurrence journal with sequence, action boundary, and source signal; verify Vitest start-before-turn-one, each side change, victory/defeat, authored order, no duplicates, and retry reset.
- [x] 2.2 Add movement/arrival matching on one accepted `unit-moved` signal for any/specific units; verify Vitest human/AI equivalence, exact destination, crossing without arrival, rejected actions, and shared authored ordering across both event types.
- [x] 2.3 Implement the selection-change adapter without `GameAction`/`GameState` mutation; verify Vitest initial valid selection, reclick, deselection, enemy/missing units, blocked input, and no AI selection signal.
- [x] 2.4 Verify matcher determinism and equal combat outcomes for identical map/policy/accepted actions with and without narrative; passing Vitest tests compare final state/scores/winner and occurrence sequence, including winning move → arrival dialogue → mission-end. Document trigger semantics and the half-turn counter in `docs/campaigns.md`.

## 3. Local library and Canvas authoring

- [x] 3.1 Implement an isolated browser campaign library with injected StorageLike, a versioned envelope, and visible errors; verify Vitest CRUD/reload, corrupt JSON, storage exceptions, and preservation of existing data on write failure.
- [x] 3.2 Add a Canvas text-edit model/control for names and multiline dialogue, with cursor/focus/scroll and named limits; verify Vitest Unicode, edit/delete, line breaks, limits without silent text loss, and preservation of existing map rename tests.
- [x] 3.3 Add `CampaignLibraryScene`, scene registration, and a menu entry, merging the built-in catalog with the local library and supporting Save As local copy for built-ins; verify Vitest navigation/Create/Open/Delete/disabled Play, preservation of original definitions, and built-in visibility on storage errors; browser smoke-test reopening after reload.
- [x] 3.4 Add Canvas mission list/settings: name, add/remove/reorder, built-in-only map picker, standard/reach-cell choice, Blue unit selector, target cell, objective rebinding, and read-only preview. Verify Vitest callbacks/draft round-trip/invalid objectives and browser smoke-test goal selection/identification without battle orders.
- [x] 3.5 Add an event/line editor with all six trigger forms, any/specific selectors, turn/cell fields, reordering, scrolling, and readiness messages; verify Vitest form behavior and browser smoke-test saving/reopening multiple events with long Russian dialogue lines.
- [x] 3.6 Add Canvas Save/Discard/Cancel for dirty drafts, fixed-scroll-factor controls that consume input, and centralized theme/layout values; verify Vitest navigation outcomes and browser smoke-test no board click-through during resize/scroll. Extend `docs/campaigns.md` with instructions for creating a playable campaign.

## 4. Session progression

- [x] 4.1 Add a playthrough snapshot of campaign/maps/Blue-human Red-Heuristic participants and a pure progression helper; verify Vitest start, fresh retry, next mission, final completion, no state/score carryover, and isolation from later library edits.
- [x] 4.2 Connect campaign data to `BattleScene` launch and campaign-only `ResultScene` controls; verify Vitest victory/defeat/last mission, unchanged standalone PLAY AGAIN, and no progression in replay/multiplayer.
- [x] 4.3 Document the session scope of progression, Blue/Red roles, and fresh mission initialization in `docs/campaigns.md` and `docs/game-rules.md`; browser smoke-test the documented two-mission flow with victory, defeat, and retry.
- [x] 4.4 Connect mission policy to the initial-state factory and automatic accepted Red end-turn on maps without Red units after all dialogue/movement barriers; verify Vitest Blue → Red → Blue counter/movement refresh, recording of both actions, no early victory, and no actions after winner/exit. Document reach-cell and opponent-free turn behavior in `docs/game-rules.md`.

## 5. Dialogue presentation and battle lifecycle

- [x] 5.1 Add a narrative queue/controller and Canvas dialogue modal with speaker/text, wrapping/scrolling, and Next/Close; verify Vitest line/event order, a continuation that runs once, input consumption, line preservation during pause, and disposal invalidation.
- [x] 5.2 Connect start/initial-turn, selection, and the shared human/AI post-accept adapter to `BattleScene`; verify Vitest all triggers in battle wiring, no dialogue for rejected actions, and start dialogue before the first orders/AI.
- [x] 5.3 Show action-derived dialogue after `MovementPresenter` completion and before the next AI action; combine pause/dialogue blockers without premature resumption. Verify Vitest animated/instant moves, deferred decisions, pause over dialogue, and the existing movement presentation suite.
- [x] 5.4 Defer replay saving/result navigation until the mission-end queue completes, protect completion with once/generation guards, and clean up lifecycle on exit/shutdown; verify Vitest victory and defeat, exactly one record/result transition, and no late callbacks after exit.
- [x] 5.5 Update `docs/architecture.md` and `docs/campaigns.md` with a diagram/description of action → movement completion → dialogue → AI/result; browser smoke-tests must verify long dialogue controls, pause/resume, retry, and both speed endpoints.

## 6. Replay narrative history

- [x] 6.1 Add a dual-version `RecordedMatch` reader and v2 writer with optional campaign narrative snapshot/journal and mission victory policy; verify Vitest v1 default standard-match, campaign round-trip, invalid/mismatched policy, standalone v2 without narrative, and independence from edited campaigns.
- [x] 6.2 Validate the narrative journal against core replay frames and source signals: IDs, sequence, boundaries, one-shot uniqueness, action-derived events, and selectable units for selection; verify Vitest invalid/duplicate occurrences, incorrect mission-end, and selection boundaries between actions.
- [x] 6.3 Connect recorded occurrences to forward single-step/autoplay in `ReplayScene` after movement, waiting for dialogues; verify Vitest boundary zero/start, multiple selection/action occurrences at a shared boundary, speed scaling, and no AI/network/progression calls.
- [x] 6.4 Connect cancellation/cursor reset to seeking, backward steps, and shutdown; verify Vitest cancellation of open dialogue/movement, immediate frame rendering, and repeated forward traversal. Document replay schema/compatibility and seeking semantics in `docs/campaigns.md`.
- [x] 6.5 Connect snapshot policy to the core replay initial-state factory and `createRecordedMatch`/reader outcome checks; verify Vitest equal live/headless/replay state/scores/winner for reach-cell victory, Red auto end-turn, no Red units, terminal action rejection, and default standard-match for legacy records.

## 7. First tutorial campaign mission

- [x] 7.1 Add built-in `tutorial-movement-12x5` map data with two Blue infantry near the left edge, no Red/terrain obstacles/control points, and goal `(11,2)`; verify Vitest map validation, routes for both units, inability to reach the goal within one initial movement allowance, required refresh, and disabled standalone Start despite playable campaign readiness.
- [x] 7.2 Add the built-in tutorial campaign catalog and first mission `selection-and-movement` with an any-Blue reach-cell objective and ordinary start/selection/move/end dialogue events from the Instructor; verify Vitest catalog/readiness, one-shot ordering, default availability without local storage, and saving editable copies without changing the original.
- [x] 7.3 Connect the HUD/existing goal UI highlight and the full lesson: select either unit, first move, explanation of points/end-turn/goal, further moves, winning arrival, and congratulations. Verify Vitest no early victory/duplicate lessons, barriers/terminal outcome, fresh retry, and lesson replay with changed library definitions; browser smoke-test both movement speed endpoints.
- [x] 7.4 Document the first mission and actual controls/goal in `docs/campaigns.md`; verify walkthroughs using both starting units and record acceptance steps in `docs/campaign-verification.md` without requiring new artwork or empty future missions.

## 8. Integration verification

- [x] 8.1 Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`; fix identified regressions and check size/complexity limits for new and modified files. If simulation behavior changes, also run `npm run simulate`; record command results.
- [x] 8.2 Run browser acceptance on a campaign with two built-in maps, all six triggers, and both victory policies: save/reload, reorder, invalid goals/references, human/AI moves, crossing versus arrival, selection/reclick, turn one/two, ending dialogue, defeat/retry, next/final, replay seeking, and standalone/multiplayer smoke-tests. Also complete the shipped tutorial with an empty Red side, automatic end-turn, and victory replay; save reproducible steps and results in `docs/campaign-verification.md`.
- [x] 8.3 Verify implementation against the three delta specs and preservation of `unit-movement-presentation`; run `openspec validate add-campaign-editor --strict` and confirm that changes contain no DOM UI, unplanned assets/dependencies, or unrelated user edits.
