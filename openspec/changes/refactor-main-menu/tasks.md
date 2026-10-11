# Tasks

## 1. Navigation model and root menu

- [x] 1.1 Write focused failing Vitest tests for the ordered six root entries, main/quick-match/multiplayer/settings transitions, default root return, and retained setup payloads; implement the pure presentation navigation model and shared typed menu data until the tests pass.
- [x] 1.2 Add failing Canvas scene tests asserting the title and exactly six root navigation buttons with setup/settings controls absent; extract menu view builders and centralize named layout values, then implement the root view until the tests pass and verify file/function/complexity limits.
- [x] 1.3 Write failing destination tests for CAMPAIGNS, REPLAYS, and MAP EDITOR with selected map ID/source and commander configuration; retain existing scene payloads until these tests pass.

## 2. Quick match submenu

- [x] 2.1 Write failing Canvas tests for opening QUICK MATCH, commander cycling/model indicators, map cycling, ready instructions, and BACK preserving non-default selections; move existing setup controls into the quick match view until these tests pass.
- [x] 2.2 Write failing tests for valid START MATCH payloads and disabled launch/error feedback for absent maps, non-standalone maps, and incomplete LM Studio setup; reuse existing readiness and launch logic until the tests pass, including refreshed saved LM Studio snapshots.

## 3. Settings and child return routes

- [x] 3.1 Write failing Canvas tests for SETTINGS containing an inline movement slider, LM STUDIO SETTINGS, LANGUAGE, and BACK without a movement navigation button; embed the existing slider and verify saved value restoration, keyboard/pointer interaction, and storage fallback using the existing component tests plus focused integration assertions.
- [x] 3.2 Write failing tests for leaving SETTINGS during a drag or keyboard focus and repeated submenu visits; blur/destroy replaced views and clean input/resize handlers until input outside SETTINGS cannot change speed and listener counts remain stable.
- [x] 3.3 Write failing settings round-trip tests using non-default commanders and a local selected map; update LM Studio save/back and LANGUAGE production/DEV navigation to return to SETTINGS with preserved payloads, then verify refreshed model readiness, immediate translated labels, and existing dirty-draft save/discard/cancel tests pass.
- [x] 3.4 Remove the obsolete standalone MovementSettingsScene, scene key/registration, and unused standalone layout fields after migrating localization surface tests; verify repository searches find no remaining callers and shared battle/replay pause slider tests stay green.

## 4. Multiplayer submenu

- [x] 4.1 Write failing Canvas tests for MULTIPLAYER containing HOST P2P, JOIN P2P, and BACK; implement the submenu until both actions open existing workflows and BACK restores the root menu.
- [x] 4.2 Write failing host/join back/cancel tests for scoped return-menu payloads, cleanup, and a QUICK MATCH-to-multiplayer round trip; update both child scenes until they return to MULTIPLAYER with pending setup preserved, direct legacy entries return to root, and existing lobby configuration remains independent.

## 5. Localization and menu documentation

- [x] 5.1 Write failing locale/menu tests for the new English navigation labels, Russian translations, partial dictionary fallback, and retained setup after language selection; add canonical locale entries and migrate existing localization menu/selector assertions to the submenu flow until tests pass.
- [x] 5.2 Document the six entry points, submenu contents, inline speed control, and return routes in the existing relevant project documentation or a focused `docs/menu-navigation.md`; verify documented routes against the scene/navigation tests and retain existing settings semantics.

## 6. Integration verification

- [x] 6.1 Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; check formatting with the existing Biome tool for touched supported files, resolve failures, and record results without altering unrelated files.
- [x] 6.2 Manually verify the six root buttons, all submenu back paths, valid/invalid quick match launch, selected-map editor entry, multiplayer cancellation, LM Studio save/back, production language selection and DEV authoring returns; record route outcomes and pending setup continuity.
- [x] 6.3 Visually verify root and submenu layouts at desktop and narrow supported viewports in English and Russian, plus long Unicode/fallback labels; verify slider persistence after reload, no stale pointer/keyboard input after departure, and Canvas-only controls, and record any remaining limitations.
