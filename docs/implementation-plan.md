# Implementation Plan

## 1. Initialization

Create a vanilla TypeScript Vite app with npm. Add Phaser, Vitest, and Biome; configure Vitest as the unit-testing tool and establish the TDD red-green-refactor workflow. Configure the 960×540 fixed internal Canvas with `Phaser.Scale.FIT`, `CENTER_BOTH`, `pixelArt`, and `roundPixels`. Add `BootScene` and `MainMenuScene`; retain only `#game` in HTML.

## 2. Deterministic core

Implement models, scenario data, `GameAction`s, validation, immutable state transitions, movement, combat, turn changes, victory, and event production. Build each behavior through a failing focused Vitest test before implementation; complete rule tests before presentation work.

## 3. Headless AI and replay

Add `RandomAgent`, `HeuristicAgent`, seeded simulations, replay recording/playback, and `npm run simulate`. Verify agents only return legal actions and equal seeds/actions reproduce equal results.

## 4. Board presentation

Implement `BattleScene`, map and unit renderers, selection and legal-action indicators, input controller, bounded camera pan/drag/zoom, and incremental state rendering. Diagnostic placeholders are permitted only in a separately marked debug configuration while assets are absent.

## 5. Canvas UI

Implement reusable `Button`, `Panel`, `ProgressBar`, and bounded event log components, followed by the main menu, battle HUD, selected-unit panel, control-point panel, and result scene. Keep HUD fixed and consume its pointer interactions.

## 6. Effects

Add action-driven movement, attack, flash, damage-number, destruction, and visible AI-action sequencing. Request effect assets only at this stage if no suitable approved files exist.

## 7. Validation and handoff

Complete core/AI/replay tests, asset validation commands, README, and architecture documentation. Confirm a full Canvas match can be played and the same scenario can run through the CLI without Phaser.

## Release acceptance

- No UI framework or DOM UI exists; all visible game UI is Phaser Canvas.
- The map camera neither moves nor scales the HUD, and HUD pointer input does not reach the map.
- A complete human-versus-AI match plays with visible AI actions.
- The core has no Phaser import and headless simulations/replays are deterministic.
- Runtime assets can replace approved diagnostic placeholders without changing game rules.
