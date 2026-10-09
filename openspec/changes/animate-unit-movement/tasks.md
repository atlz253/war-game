# Tasks

## 1. Presentation preferences and route planning

- [ ] 1.1 Write failing Vitest tests, then implement named slider bounds/step/default, the linear value-to-duration mapping, and a validated versioned local settings store with session fallback. Verify both endpoints, intermediate values, monotonic durations, default 50 (200 ms), round-trip persistence, invalid types/non-finite/fractional/out-of-range values, and storage read/write failures in focused tests.
- [ ] 1.2 Write failing Vitest tests, then implement a pure movement-transition helper using accepted actions and pre-action snapshots with existing core pathfinding. Verify intermediate/diagonal cells, obstacles, occupied cells, terrain-dependent routes, rejected/non-move actions, unavailable-route fallback, and unchanged input snapshots.
- [ ] 1.3 Document the slider range, 4 ms duration increments, per-cell timing, 200 ms default, No animation endpoint, and local-only persistence in project documentation; verify the documented values agree with configuration and tests.

## 2. Shared movement renderer and controller

- [ ] 2.1 Write failing controller tests with a fake animation driver, then implement sequential transitions, synchronous zero-duration movement, pause/resume, and generation-based cancellation. Verify exact-once completion, ordered mixed move/non-move snapshots, canceled callbacks, intermediate durations, and speed captured at each movement start.
- [ ] 2.2 Write failing BattleMapRenderer tests, then add a narrow Phaser movement adapter for unit images and health labels with rounded coordinates. Verify both objects follow every cell center, state refreshes cannot snap an active view, zoom keeps labels aligned, and reset removes overrides/tweens.
- [ ] 2.3 Document controller lifecycle and renderer override ownership near their public APIs; verify tests cover completion, cancellation, pause, and reset contracts without real-time sleeps.

## 3. Canvas settings controls

- [ ] 3.1 Write failing Vitest tests for slider coordinate/value mapping and interaction, then add a reusable Canvas slider and presentation settings scene, register it, and expose it from MainMenuScene. Verify thumb dragging, track clicks, clamping/quantization, transformed UI coordinates, focused arrows and Home/End, live duration/endpoint labels, save/back behavior, reload persistence, HUD pointer consumption during dragging, and no DOM controls in a browser smoke check.
- [ ] 3.2 Write failing pause-menu tests, then add the slider to battle and replay pause menus while retaining existing controls. Verify speed changes save locally, active moves retain their original speed, subsequent moves use the new value, and slider labels/track/thumb fit the existing logical viewport.
- [ ] 3.3 Update player documentation with settings entry points, slider pointer/keyboard operation, endpoint meanings, and when changes take effect; verify instructions by setting intermediate values and both endpoints from menu and pause controls.

## 4. Battle action and multiplayer integration

- [ ] 4.1 Add failing BattleScene/controller integration tests, then extract action/presentation orchestration and feed accepted human and AI actions to the shared presenter. Verify actions commit and record once, rejected actions do not animate, repeated rendering preserves movement, and every touched production file is within 1000 lines.
- [ ] 4.2 Add failing lock/scheduler tests, then coordinate animation, AI, ownership, disconnect, and pause lock reasons. Verify board/HUD submission guards, camera availability, delayed AI scheduling after completion, exact-once scheduling, and preservation of existing LM Studio fallback messages.
- [ ] 4.3 Add failing multiplayer presentation tests, then queue accepted snapshots in network sequence while processing authoritative actions immediately. Verify peers with different slider values converge, later attacks/removals do not render early, local orders wait for presentation catch-up, and resynchronization clears the queue and snaps immediately.
- [ ] 4.4 Add failing lifecycle tests, then integrate pause/resume, exit, scene restart, and shutdown cancellation. Verify paused movement resumes from its current position and stale callbacks cannot unlock another turn, resume an exited scene, or schedule AI.
- [ ] 4.5 Document authoritative versus presented state and network queue ownership near the integration APIs; verify the documented ownership matches the lock and sequencing tests.

## 5. Replay integration

- [ ] 5.1 Write failing replay presentation tests, then animate adjacent forward steps and autoplay from stored actions/snapshots. Verify 1×/2× scaling for intermediate slider values, no frame advancement during movement, inter-action delay after completion, final-move completion, and synchronous No animation.
- [ ] 5.2 Write failing replay lifecycle tests, then implement animation-aware playback pause/resume, backward steps, seek/reset, and shutdown. Verify seeking snaps immediately, canceled callbacks never advance frames, and replay invokes neither AI nor network inference.
- [ ] 5.3 Document replay animation and its relationship to playback speed; verify an existing saved replay supports both slider endpoints and intermediate values without record migration.

## 6. End-to-end verification

- [ ] 6.1 Run identical accepted-action fixtures through battle presentation at both slider endpoints and representative intermediate values, and through direct headless core replay; verify final states, movement cost, action records, scores, and results match exactly in Vitest integration tests.
- [ ] 6.2 Smoke-test current assets in browser: multi-cell routes, diagonals, slider dragging/clicking/keyboard adjustment at endpoints and intermediate values, resized settings/pause layouts, HUD locks, camera zoom/pan, mid-move pause/settings change, AI versus AI, multiplayer with differing speeds, replay stepping/playback/seeking, and exit/restart. Record observable results and confirm no asset requests or visible DOM UI were added.
- [ ] 6.3 Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; verify function/file limits and formatting for touched files, and record outcomes. Run `npm run simulate` only if implementation changes simulation behavior or its dependencies.
