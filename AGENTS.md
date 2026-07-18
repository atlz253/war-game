# AI War Game Contributor Guide

## Core rules

- Keep `src/core` and `src/ai` deterministic, headless-capable, and independent of Phaser and `src/game`.
- Route every human and AI order through the same public `GameAction` API, `validateAction`, and `applyAction` path. Agents must not mutate `GameState` directly.
- Keep match state in `GameState`; keep selection, hover, animation, and input-lock state inside Phaser scenes or controllers.
- Preserve replayability: seeded simulations with the same scenario and action sequence must produce the same result.
- Keep terrain as validated, sparse scenario/map data. Terrain-dependent movement and damage must remain in `core`; Canvas scenes only render the resulting terrain and view data.
- LM Studio is an optional remote-decision adapter under `src/ai`. It may be asynchronous, but must receive only snapshots and legal actions, return an offered `GameAction`, and fall back visibly to the deterministic Heuristic agent on request, parsing, or validation failure. Replays must store accepted actions rather than call the model again.

## Canvas-only presentation

- Phaser is responsible for rendering, input, scenes, cameras, Canvas UI, effects, audio, and animation only.
- Do not add React, Vue, Svelte, DOM overlays, DOM controls, CSS layout for game UI, or a global UI-state library.
- The HTML shell contains only `<div id="game"></div>`.
- Map import and export may create a temporary native browser file picker or download link only after a Canvas-button click. These elements must be removed immediately and must never become visible game UI.
- LM Studio configuration and all settings controls are Phaser Canvas scenes. Persist one local endpoint and independent Blue/Red model IDs in browser storage; snapshot both selections into a match before play. Never add a DOM settings form or a cloud-provider credential flow.
- Keep UI theme values centralized. Use integer coordinates, `pixelArt`, `roundPixels`, and nearest-neighbour scaling.
- HUD objects use `setScrollFactor(0)` and must consume pointer input so a HUD click cannot also select a board cell.

## Assets

- Inspect existing project assets before requesting new art. `grass.png` at the repository root is not a runtime asset or approved visual reference.
- Request user-generated assets only when the current implementation stage needs them; use the request template in `docs/assets.md`.
- Register paths and frame metadata only in the central asset manifest. `BootScene` loads assets from that manifest.
- Never use unlicensed web assets, Base64-embedded images, emoji, or programmatic geometry as final artwork. Diagnostic placeholders must be explicit, debug-only, and excluded from production.

## Quality checks

- Follow test-driven development (TDD): write a focused failing Vitest unit test first, implement the smallest behavior that passes it, then refactor while the test suite stays green.
- Use Vitest for all unit tests. Add focused tests for rules and deterministic replay behavior whenever core behavior changes.
- Do not use magic numbers. Give every non-obvious numeric value a domain-specific named constant or place it in scenario, theme, or configuration data.
- Keep production files to 1000 lines or fewer and `*.test.ts` files to 1500 lines or fewer. Split by responsibility before a file reaches its limit.
- Keep functions within 75 non-blank lines and a cognitive-complexity score of 15 or less; extract intent-revealing helpers rather than adding deeply nested branching.
- Test AI action legality and deterministic simulations. Run `npm run simulate` when simulation behavior changes.
- Run applicable type, formatting, lint, and test commands before handoff.
- Do not overwrite or revert unrelated user changes.
