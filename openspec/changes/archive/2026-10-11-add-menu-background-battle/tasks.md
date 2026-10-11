# Tasks

## 1. Deterministic map and deployment generation

- [x] 1.1 Write failing Vitest cases and implement a pure seeded demonstration map/state factory with named generation configuration; verify identical seeds produce identical valid maps and both teams deploy in distinct offscreen cells on opposite sides with paths into the visible area.
- [x] 1.2 Add bounded wave generation using centralized unit statistics and unique side/wave IDs; verify multiple seeds, wave capacity, deterministic fallback layout, frontline composition, and no invalid terrain/placement conflicts in focused Vitest cases.
- [x] 1.3 Document generation inputs, deployment-strip invariants, and demonstration-only state in a new `docs/menu-background-battle.md`; verify the documented invariants match factory tests and no Phaser/browser dependencies enter core.

## 2. Infinite combat through core actions

- [x] 2.1 Write failing Vitest cases and implement optional demonstration-only infinite ammunition for attacks and counterattacks; verify repeated accepted attacks exceed ordinary capacity without decrement, while ordinary empty-ammunition rejection and consumption tests stay green.
- [x] 2.2 Write failing Vitest cases and implement immediate deterministic reinforcement as a consequence of elimination inside the shared action reducer, with a scoped event and no terminal winner; verify both sides, attack/counterattack elimination, surviving-unit preservation, score deltas, unique identities, and repeated waves.
- [x] 2.3 Apply demonstration-only opposing-strip movement restrictions consistently to validation, path reachability, and legal action generation; verify enemy occupancy cannot exhaust replacement capacity and ordinary movement remains unchanged.
- [x] 2.4 Verify finite accepted action sequences replay headlessly to identical demonstration states across waves, and ordinary terminal victory/replay tests pass; document the optional rule policy, reinforcement event, and isolation from player map/replay formats in `docs/menu-background-battle.md`.

## 3. Autonomous controller and progress

- [x] 3.1 Write failing Vitest cases and implement a headless-capable controller with two local HeuristicAgent instances, shared action application, bounded current-turn context, and one pending decision; verify legal decisions, pause/resume, disposal, rejected/late decision handling, and no network/storage/Phaser dependencies.
- [x] 3.2 Add a representative seeded multi-wave soak test that proves both sides act, damage recurs, reinforcement occurs repeatedly, and no winner/ammunition stall stops processing; tune bounded generation configuration if needed and verify deterministic reruns without changing ordinary Heuristic strategy.
- [x] 3.3 Document controller stepping, suspension, resource bounds, and the reproducible soak-test command in `docs/menu-background-battle.md`; verify the command runs and the controller retains no complete lifetime action log.

## 4. Canvas background presentation

- [x] 4.1 Write failing Vitest layout cases and implement the central camera crop/cover layout with named theme settings; verify wide, tall, and resized viewports keep deployment strips outside the visible world interval without changing map/state.
- [x] 4.2 Register a dedicated background scene and reuse the manifest-backed board renderer and MovementPresenter with presentation-only options; verify accepted routes, combat/destruction updates, speed changes on subsequent moves, instant-move pacing, and destroyed-view cleanup with focused tests.
- [x] 4.3 Implement bounded scene scheduling, presentation-aware sequencing, visibility suspension, and disposal; verify one decision/transition at a time, no catch-up bursts, retained mid-move suspension/resume, and released listeners/timers in Vitest lifecycle cases.
- [x] 4.4 Document rendering options, camera policy, speed-setting behavior, and asset reuse in `docs/menu-background-battle.md`; verify no new DOM controls, artwork paths outside the manifest, or production diagnostic placeholders are introduced.

## 5. Menu continuity and foreground behavior

- [x] 5.1 Write failing Vitest navigation cases and add idempotent lifecycle coordination for MainMenu, Language, LM Studio settings, Host/Join, CampaignLibrary, and ReplayLibrary; verify root/submenu changes, child returns, self-restarting language authoring, and repeated navigation retain one progressing session.
- [x] 5.2 Integrate suspension/hiding for Battle/Result, map/campaign editing, and Replay playback, plus retained-session resume on return; verify these activities receive no demonstration state, record no ambient replays, and do not reset the background session.
- [x] 5.3 Adjust supported foreground Canvas backgrounds/panels using centralized transparency settings and disable background input; verify existing button/slider input tests, pending quick-match continuity, and ordinary scene backgrounds remain correct.
- [x] 5.4 Update `docs/menu-navigation.md` and `docs/menu-background-battle.md` with the supported menu family and activity lifecycle; verify documentation agrees with lifecycle tests and explicit reload behavior.

## 6. Integrated verification

- [x] 6.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run simulate`; verify normal legality, scores, seeded simulations, and replay behavior remain intact, and record results in the change's `verification.md`.
- [x] 6.2 Perform browser checks across every supported foreground screen at desktop, narrow/tall, and wide aspect ratios; verify visible ongoing combat, readable localized controls, hidden initial/replacement deployment, settings-speed behavior, input isolation, and no restart on navigation, recording evidence in `verification.md`.
- [x] 6.3 Verify long-session wave processing and repeated navigation keep unit views, queues, timers, listeners, and menu response times bounded; check hidden-tab recovery and real-match/editor/replay round trips and record measurements/limitations in `verification.md`.
- [x] 6.4 Run `git diff --check` and `openspec validate add-menu-background-battle --strict`; verify all tasks have corresponding evidence and production/test file, function, complexity, and named-constant limits are respected before handoff.
