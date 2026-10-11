# Design

## Context

See `proposal.md` for motivation and `specs/main-menu-navigation/spec.md` for the behavior contract.

`MainMenuScene` currently renders the title, commander selectors, model labels, map controls, library/editor buttons, host/join buttons, and three settings entries in one presentation container. It owns pending match configuration and map selection and already supplies map readiness and LM Studio launch checks. `LanguageScene` and `LmStudioSettingsScene` receive `MainMenuSceneData` and return to `main-menu`; host/join screens return without menu data. `create()` currently reconstructs default commander configuration when none is supplied, so relying on the scene instance alone would lose selections on some round trips.

`MovementSlider` already supports pointer and keyboard input, transformed coordinates, storage fallback, refresh, blur, and destruction cleanup. `MovementSettingsScene` only wraps that slider and a back button. The existing movement spec already covers speed semantics and pause sliders. Localization tests currently assume LANGUAGE and START MATCH are directly on the root menu; these assertions must be updated. Localization behavior is implemented by the completed, unarchived `add-game-localization` change and must remain intact.

## Goals / Non-Goals

**Goals:**
- Keep menu navigation and pending setup explicit and testable within presentation code.
- Reuse match setup, settings, and Canvas components while separating menu rendering responsibilities.
- Make return routes preserve context and avoid stale input/listeners.

**Non-Goals:**
- Change core/AI behavior, multiplayer protocol, replay records, campaign/editor workflows, or storage formats.
- Add persistent quick match preferences, new art, DOM UI, or new dependencies.
- Redesign LM Studio or language editing beyond return navigation.

## Decisions

### 1. Render four menu views inside MainMenuScene

Introduce a typed presentation-only view identifier (`main`, `quick-match`, `multiplayer`, `settings`) and extract intent-specific view builders/controllers under `src/game`. `MainMenuScene` remains the orchestrator and owner of pending configuration; switching views destroys the previous view and constructs the new one. Add a small pure navigation model for ordered entries, destinations, and default return behavior so focused Vitest tests can exercise the contract.

Keep the existing scene key and viewport transformation. This minimizes changes to existing library/editor/result returns. Separate Phaser scenes for each small submenu would duplicate viewport and setup data handling. Keeping all submenu controls alive but hidden would increase the risk of active hidden input handlers, especially for the slider.

The root view uses a vertical list in the requested order beneath the game title. Submenus show their localized heading and controls with a clearly placed BACK button. Quick match retains existing commander/model and map feedback. New layout values belong in a central menu theme rather than scattered scene constants. Reuse current control styling and assets; no new artwork is required.

### 2. Carry typed session navigation data across child scenes

Move shared menu data to a presentation navigation module to avoid child screens importing the main scene class. Extend the existing optional configuration/map payload with an optional menu view and use explicit payloads for menu-initiated child transitions. Missing view data defaults to the root menu, preserving existing callers.

Entering LM Studio or LANGUAGE from SETTINGS carries `view: settings`, pending commander choices, and selected map. Their existing save/back paths return this data; returning menu creation merges current saved LM Studio settings into pending configuration and rebuilds labels. Language DEV editor self-navigation must retain the return payload and save/discard/cancel behavior.

HOST P2P and JOIN P2P receive a separate return-menu payload with `view: multiplayer`. Existing cancellation/disconnection executes before returning that payload. Pending quick match configuration is return context only; it must not populate the multiplayer lobby or overwrite its existing configuration logic. Direct entries without this payload retain the legacy root return.

Avoid global state or browser persistence for navigation: explicit scene data is enough and keeps pending setup separate from match state. Internal BACK navigation preserves setup in the orchestrator. Keep existing direct destination payloads, particularly selected map ID/source for MAP EDITOR.

### 3. Embed MovementSlider directly in SETTINGS

Use the existing component and store in the settings view, with a localized movement settings section label. Blur and destroy the view on departure, including during a drag; its input listeners must detach before rendering the next view. Recreate/refresh on return so saved values and translated text are current.

Remove `MovementSettingsScene`, its registration/key, and obsolete layout fields once all callers and tests are migrated. Preserve shared movement theme values used by the component and battle/replay pause menus. Keeping a separate movement destination would conflict with the requested inline control; rewriting the slider would add unnecessary behavior risk.

### 4. Extend current localization and test conventions

Add canonical English keys for QUICK MATCH, MULTIPLAYER, SETTINGS, and any new explanatory labels; reuse existing title, commander, instruction, settings, and BACK keys. Add Russian translations in the existing dictionary. English defaults match the requested button text; use the existing singular MOVEMENT SETTINGS wording for the section rather than inventing another destination.

Write focused failing Vitest tests first for navigation and scene behavior, using the existing Canvas fixture and Phaser mocking approach. Update menu, selector, and surface tests to traverse SETTINGS or QUICK MATCH before asserting their controls. Cover readiness errors and configuration snapshots with existing map and match helpers. Avoid new core tests because rules and action application remain unchanged.

## Risks / Trade-offs

- [Pending choices reset during scene creation] → Pass explicit typed setup data across every scoped child return and test settings and multiplayer round trips with non-default choices and a local map.
- [Slider handlers survive departure] → Blur and destroy the previous view; test pointer/keyboard input after departure and repeated visits, and inspect listener counts.
- [Nested language navigation drops return context] → Include DEV editing and production selection routes in regression coverage.
- [Long localized strings overlap controls] → Reuse label fitting/wrapping, named layout constants, and viewport scaling; visually verify English/Russian and long-label cases at desktop and narrow sizes.
- [Refactor grows MainMenuScene] → Extract view builders and pure navigation responsibility; respect project file, function, and complexity limits.
- [Localization artifacts remain unarchived] → Preserve their implemented behavior and do not edit/archive that change as part of this work.

## Migration Plan

1. Add navigation model tests, shared payload types, and centralized menu layout.
2. Move root and submenu rendering into focused view builders while retaining existing quick match callbacks and validation.
3. Integrate inline settings and child return payloads; remove obsolete standalone movement navigation and migrate affected tests.
4. Add locale keys, run applicable checks, and manually verify every route, speed persistence, localization, and resizing.

No stored data migration is necessary. Reverting the presentation change restores the previous menu while existing movement, language, map, and LM Studio settings remain compatible.
