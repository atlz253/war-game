# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior. `MainMenuScene` rebuilds root/submenu controls in one presentation container, but starts separate scenes for language, LM Studio, P2P setup, and libraries. Its full-canvas safe-area rectangle and large opaque panel currently conceal anything beneath it. Child screens also own their backgrounds.

`HeuristicAgent` already selects legal actions without browser or Phaser dependencies. `applyAction` validates every order, consumes attack/counterattack ammunition, removes destroyed units, and sets a winner after elimination; `validateAction` then rejects further orders. `GameAction` has no reinforcement command. Maps and unit statistics are created centrally in `src/core/maps/map-definition.ts`. `BattleMapRenderer` and `MovementPresenter` already render existing manifest-backed assets and animate accepted routes. The movement specification also requires speed changes to affect subsequent movement without changing state outcomes.

## Goals / Non-Goals

**Goals:** Keep deterministic rule state in core, autonomous scheduling headless-capable, and camera/animation/input state in Phaser. Own one demonstration independently of foreground scene restarts. Bound work and resources over arbitrarily many waves.

**Non-Goals:** New player game modes, changes to ordinary Heuristic strategy or match balance, saved demonstration replays, new artwork or effects, network participants, and persistent background state across page reloads.

## Decisions

### 1. Dedicated background scene with explicit menu-family ownership

Register a `MenuBackgroundBattleScene` behind foreground menu scenes. A small lifecycle coordinator ensures the scene/session exists once and controls visibility and suspension. Root/submenu view replacement affects only foreground controls. Use explicit foreground membership: MainMenu, Language (including development authoring), LM Studio settings, Host/Join, CampaignLibrary, and ReplayLibrary. Other scenes suspend and hide the background without destroying its retained session; returning resumes it. Application shutdown disposes it.

Make transitions idempotent and evaluate the target foreground rather than reacting to the departing scene's shutdown alone, so a child-scene handoff cannot suspend/recreate the battle accidentally. Do not put demonstration state into quick-match return data. An active scene owns the session rather than a global UI-state store.

Alternative: embedding the controller in MainMenuScene would lose activity on `scene.start` unless all child screens were rewritten. Running BattleScene behind menus would also instantiate its input, HUD, match recording, pause, and result workflows.

### 2. Seeded generated map with reserved horizontal deployment strips

Add a pure generator under `src/core` accepting a seed and named board/wave configuration. Use the current map schema, validated sparse forest/mountain placements, centralized unit statistics, and an unobstructed central approach corridor. Each random force includes mobile frontline units; do not generate artillery-only forces. Bound wave size by strip capacity. Unit counts, type weights, terrain density, board dimensions, action interval, and presentation opacity belong to named configuration/theme values.

The map contains a fixed central visible rectangle plus left Blue and right Red deployment strips. The camera crops the central rectangle using a cover scale on resize; never fit the entire wider board. The widest visible world interval remains inside that rectangle, so enlargement does not expose deployment cells or require regeneration. Initial units and every replacement wave are inside the board but outside that interval.

Keep deployment strips passable and prohibit opposing units from entering them through demonstration-only movement legality. An eliminated side consequently has free deployment capacity without moving surviving opponents or making units appear in view. Keep generation bounded with a deterministic fallback layout rather than unbounded rejection sampling.

Alternative: using the pending selected map couples decoration to player setup and usually has no hidden spawn capacity. Recomputing map dimensions from every resize resets state or reveals spawn locations.

### 3. Explicit deterministic demonstration rules in GameState

Introduce optional menu-demonstration rule data in `GameState`, containing the seed/random state, spawn configuration, and per-side wave counters. Ordinary map creation leaves it absent. Only the dedicated factory enables it; player map imports and match setup do not activate it.

For demonstration states, accepted attack and counterattack leave ammunition unchanged. Normal ammunition validation still succeeds because generated units start fully armed; normal matches retain their existing decrement and resupply behavior. This implements the user's infinite-ammunition requirement without periodic reloading, control-point healing, or browser-side mutations.

After attack/counterattack elimination, branch inside the deterministic core action reducer: generate and insert the defeated side's next wave instead of setting a terminal winner. Preserve the map, survivors, scores, active side, and turn; new units get normal initial statistics and unique side/wave/local IDs. Reinforcements are a system consequence of the accepted attack, not a separate AI order. All decisions still go through `GameAction`, `validateAction`, and `applyAction`; no scene or agent edits state fields. Emit a scoped reinforcement event for presentation/testing and keep ordinary victory events unchanged.

Existing public action variants can remain unchanged. Headless replay of the same initial demonstration state and accepted actions reproduces random draws and waves. Do not serialize or accumulate the demonstration's entire history at runtime; tests can capture finite sequences. Review exhaustive event consumers when adding the event.

Alternative: clearing `winner` and inserting units from Phaser bypasses deterministic rules. Adding a universal spawn order exposes a system-only operation to normal players, AI legal-action lists, replay schemas, and multiplayer validation unnecessarily.

### 4. Bounded local controller and existing movement presentation

Add a headless-capable controller under `src/ai` with two HeuristicAgent instances, current GameState, and only current-turn action context. Return accepted transitions/events to Phaser. Permit one decision in flight and at most one scheduled action per configured step; do not accumulate elapsed-time catch-up actions. Use a generation/disposal token to discard late asynchronous completions after disposal. Suspend scheduling while hidden or outside the menu family, retaining state and remaining presentation progress.

The background scene reuses the board renderer with optional presentation settings that suppress selection/HUD and unnecessary health/action overlays, and uses MovementPresenter with the existing saved duration provider. Wait for each route to settle before choosing the next action; No animation remains paced by the action interval. Navigation between menu screens does not pause the presenter. Activity suspension freezes it; resume continues it. Browser visibility loss suspends work without regeneration or catch-up bursts. Renderer entries for destroyed units and finished transitions are removed promptly.

Alternative: an unrestricted asynchronous simulation loop can monopolize the thread, retain growing action logs, and race scene changes. Coupling scheduling to foreground scene updates duplicates runners or stalls child menus.

### 5. Transparent foreground canvas and strict input isolation

Reuse the current assets already present under `public/assets/terrain` and `public/assets/units`, loaded by BootScene from the asset manifest. Remove or hide full-screen opaque foreground backgrounds only for supported menu-family screens, and use centrally themed translucent panels/dimming to keep text readable while combat remains visible. Keep library content and existing controls intact. Editors and actual matches retain their current backgrounds.

Disable the background scene's input and omit board/camera handlers; foreground controls keep existing pointer consumption and slider focus cleanup. Layer the background consistently below the active menu scene, including self-restarting LanguageScene. No DOM UI or new production placeholder art is introduced.

## Risks / Trade-offs

- [Large boards make heuristic legal-action searches expensive] -> Keep board/wave sizes modest and bounded; measure actual menu frame responsiveness and tune named configuration before handoff.
- [Infinite ammo does not fix disconnected paths or artillery standoffs] -> Guarantee connected approaches and a frontline component in every wave; run a representative seeded multi-wave soak test proving recurrent damage/elimination. Do not change the ordinary Heuristic strategy to compensate for a bad generator.
- [Background becomes invisible beneath old scene rectangles] -> Verify every foreground family member visually, including long labels, libraries, and both aspect-ratio extremes.
- [Demo policy leaks into saved matches or results] -> Dedicated factory only, no player configuration toggle, regression tests for ordinary victory/ammo/replay, and explicit exclusion from replay storage.
- [Transition races duplicate decisions/listeners] -> One scene owner, idempotent lifecycle handoffs, one pending decision, disposal tokens, and repeated-navigation listener/timer checks.
- [Adding optional state/event data affects exhaustive consumers] -> Keep policy absent by default, retain public action shapes and ordinary map/replay formats, and run full typecheck, tests, and simulation smoke checks.

## Migration Plan

No stored-data migration or new asset download is required. Add the pure demo behavior and tests first, then controller/presentation integration, then foreground transparency and lifecycle wiring. Validate normal matches before enabling menu startup. Rollback removes the background scene registration and menu-family integration, then the optional demonstration rules, without touching saved player maps or replay records.
