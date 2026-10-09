# Proposal

## Why

Units currently jump directly to their destinations, making routes and successive AI orders difficult to follow. Cell-by-cell movement with a configurable speed will make play readable while allowing players to retain instantaneous movement.

## What Changes

- Animate existing unit images and their health labels along the deterministic legal route, including intermediate and diagonal cells.
- Provide a persisted Canvas speed slider with fine adjustment from Slow to No animation; use a default duration of 200 ms per cell. Expose the setting from the main menu and battle/replay pause menus.
- Use the same movement presentation for human, AI, multiplayer, and forward replay actions; keep replay seeking instantaneous.
- Coordinate animation, order locks, AI scheduling, pause/resume, scene shutdown, and multiplayer presentation queues without changing authoritative action processing.
- Reuse the current unit assets; this change translates images and does not introduce walking sprite sheets or new artwork.

## Capabilities

### New Capabilities

- `unit-movement-presentation`: Route-based unit animation, presentation sequencing and lifecycle, and persisted movement speed controls.

### Modified Capabilities

None. The project currently has no main OpenSpec capability specifications.

## Impact

Affected areas include `BattleMapRenderer`, `BattleScene`, `ReplayScene`, pause/menu controls, scene registration, and a new local presentation settings store and animation controller under `src/game`. Route calculation reuses `src/core/pathfinding/find-path.ts` with pre-action snapshots. Core rules, action payloads, replay records, network protocol, scoring, and headless simulations retain their existing behavior. No new runtime dependencies or assets are required. `BattleScene.ts` already exceeds the production file limit and must be split by responsibility as part of integration.
