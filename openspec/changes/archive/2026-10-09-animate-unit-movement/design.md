# Design

## Context

See proposal.md for motivation. `BattleMapRenderer.upsertUnit` currently sets image and health-label positions directly from state. `BattleScene` applies actions through separate human/network and AI entry points, renders immediately, and schedules the next AI action; `startAiTurnIfNeeded` also renders the current state again. These refreshes would snap an unprotected animated view to its destination.

`findPath` returns deterministic intermediate cells excluding the source and including the destination. `unit-moved` events contain source, destination, and cost, but no path. The renderer is shared with `ReplayScene`, which renders timeline frames and has independent 1×/2× playback timing. Only LM Studio settings currently have a settings scene/store. The manifest supplies single-frame unit images, sufficient for translation. `BattleScene.ts` currently has 1066 lines, already beyond the contributor limit.

## Goals / Non-Goals

**Goals:** Separate committed state from visual transitions; reuse legal routes, current assets, and shared rendering; ensure lifecycle cancellation and accepted-action ordering can be tested without real time.

**Non-Goals:** Walking sprite sheets, attack effects, pathfinding changes, core event extensions, replay format changes, AI decision changes, or synchronized animation clocks between peers.

## Decisions

### 1. Derive presentation routes from pre-action snapshots

Create a pure presentation transition helper under `src/game` using accepted actions, before/after snapshots, and existing `findPath`. For accepted moves, calculate the route from the pre-action board and units. Do not calculate from post-action occupancy. No animation if action is rejected or no meaningful route exists; an unexpected unavailable route safely snaps to committed state.

Recomputing through the existing deterministic helper keeps core events and saved records compatible. Adding path to core events was considered but is unnecessary for a visual feature. A straight tween to destination was rejected because it hides the actual route.

### 2. Keep movement ownership in a presentation controller

Use a dedicated controller for transition queue, active unit, pause state, completion, and generation-based cancellation. A Phaser adapter moves the unit image and health label in lockstep between cell centers with linear interpolation and rounded display coordinates. The renderer exposes narrow movement APIs and preserves an active unit's visual position across state refreshes. On completion it renders the final committed snapshot and clears overrides.

Use named configuration constants for slider bounds 0–100, step 1, default 50, and maximum duration 400 ms per cell. Map value to duration linearly: `durationMs = maxDurationMs * (maxValue - value) / (maxValue - minValue)`. This provides 101 values in 4 ms increments: 0 means Slow at 400 ms, 50 means the default 200 ms, and 100 means No animation at exactly 0 ms. These are proposed product defaults, not existing timings. Diagonal and orthogonal steps each use one cell duration; terrain changes the route/cost but adds no visual slowdown. Zero duration takes a synchronous completion path without a tween or timer. New controllers keep scene orchestration small; extract existing battle action/presentation responsibilities to bring production files within 1000 lines.

### 3. Store speed as a local presentation preference

Introduce a validated versioned browser settings store, separate from match configuration and LM Studio connection data, with a session-memory fallback for storage errors. Save the numeric slider value; accept only finite integers within the configured bounds, and fall back to the default for invalid stored data. Use a Canvas settings scene from the main menu and a reusable Canvas slider in pause menus. Scene registration follows existing game initialization, and UI layout/color values remain centralized.

The slider supports thumb dragging, track clicks, and focused keyboard adjustment with arrow keys; Home/End select the endpoints. Convert pointer positions through the containing UI transform, clamp to the track, and quantize to the configured step. Show endpoint labels Slow and No animation plus a live duration label; zero displays No animation. Keep slider objects fixed to the HUD camera and consume pointer events, including dragging, so they cannot reach board input. Use the project's existing Canvas UI visual conventions; no unit artwork or sprite sheets are needed.

Snapshot the setting when each move starts. Pause-menu changes affect subsequent moves; current movement resumes at its original speed. No global UI state library or DOM control is needed. Fine slider adjustment replaces the four discrete presets to follow the requested flexible control; the explicit right endpoint retains a clear way to disable animation.

### 4. Commit actions once, then coordinate presentation

Retain `validateAction`/`applyAction` as the only authority. Both battle action entry paths feed the shared presenter after committing and recording an accepted action once. Use separate lock reasons for animation, AI, network ownership/disconnection, and pause so completion cannot accidentally unlock an AI turn or disconnected client. Guard all local submission paths, including HUD buttons. Schedule the next local AI delay once presentation completes; preserve existing visible LM Studio fallback behavior.

Network receipt and publishing continue immediately; animation never delays authoritative processing. Queue immutable before/after snapshots for each accepted action, including non-moves, so a later attack or removal cannot render ahead of an earlier move. Render the presented snapshot and derive visible HUD state from it while authoritative state can advance ahead. Block local orders while presentation is behind authority. Queue playback is independent on each peer. Resynchronization clears the queue and snaps to the replacement snapshot.

Simply deferring core processing was rejected because it would couple network synchronization to user speed. A single boolean lock was rejected because existing lock reasons overlap.

### 5. Make cancellation and pause explicit

Pause the active tween and transition progression with the existing pause/AI controller integration; resume the same step without restarting. Keep camera controls available during ordinary movement. Shutdown, exit, reset, snapshot replacement, and replay seek cancel active tweens, clear queued transitions, and invalidate completion callbacks. Never release another lock or schedule AI from a stale callback. Settings opened from the main menu need no live scene transition management.

### 6. Reuse the presenter for replay

Use adjacent recorded timeline snapshots and their accepted action to build forward transitions. Both forward stepping and autoplay animate moves; backward steps and jumps cancel and snap. Pause freezes animation. Apply the existing replay speed multiplier to per-cell duration at transition start; changes affect the next transition. Reset autoplay elapsed time after completion and wait the existing replay inter-action delay before advancing again, preventing overlapping moves and catch-up bursts. At the final frame, let the active movement finish before changing playback to stopped. Replay reconstruction remains through core, with no inference or network calls.

## Risks / Trade-offs

- [Repeated state refresh snaps moving views] → Explicit renderer overrides and tests that refresh tint/health/camera while a move is active.
- [Accepted network state advances ahead of displayed state] → Ordered snapshot presentation and local-order gating until the queue catches up; pause may intentionally build a queue which drains on resume.
- [Completion starts duplicate AI work or changes a restarted scene] → One completion owner, generation invalidation, and tests for exit/restart and overlapping locks.
- [Scene exceeds contributor limits] → Extract action/presentation orchestration during integration, keep functions within 75 non-blank lines and complexity 15, and verify file sizes.
- [Animation length grows with route length] → Slider allows faster movement and an explicit No animation endpoint; keep existing replay speed multiplier.
- [Mock tests miss camera/Canvas issues] → Supplement focused Vitest tests with a browser smoke check using current assets, zoom, pause, and multiplayer/replay controls.

## Migration Plan

Add the new numeric preference key without changing existing settings, saved matches, or protocol payloads. Missing preferences use slider value 50 (200 ms per cell). Presets from the earlier draft were never implemented and need no migration. Verify old replay records with the shared presenter. Rollback removes the new presentation integration and returns direct rendering; the unused preference key is harmless. No data migration is required.
