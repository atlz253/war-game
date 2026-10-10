# Tasks

## 1. Locale dictionaries and resolution

- [ ] 1.1 Write failing Vitest tests for locale schema, safe IDs, filename matching, duplicates, partial dictionaries, unknown keys, placeholder sets, and invalid/missing English; implement pure validation and catalog discovery under `src/game/localization` until they pass.
- [ ] 1.2 Write failing Vitest tests for per-key English fallback, whitespace-only values, named interpolation, unavailable locale IDs, and defensive missing-key diagnostics; implement the resolver and verify all cases pass without core/AI dependencies on presentation.
- [ ] 1.3 Add the English baseline and a build-time canonical-key check; verify referenced keys exist, missing English fails the check, and a test-only partial locale resolves omitted strings in English.
- [ ] 1.4 Document the locale JSON schema, directory, ID/display-name distinction, fallback, interpolation, discovery, and formatting boundaries in `docs/localization.md`; verify its example dictionary passes validation.

## 2. Preferred language and Canvas selector

- [ ] 2.1 Write failing Vitest tests for preference reload, corrupt/unavailable storage, missing language packs, and in-session fallback after write failure; implement the versioned browser settings adapter until they pass.
- [ ] 2.2 Write failing scene tests for the main-menu language entry, selection, immediate label refresh, and preservation of commander/map configuration; implement and register a Canvas language selector with centralized theme values and verify those tests pass.
- [ ] 2.3 Document player language selection and storage failure behavior; verify the documented selector flow and longer Unicode labels in the Canvas at supported viewport sizes.

## 3. DEV locale authoring and filesystem persistence

- [ ] 3.1 Write failing Vitest tests for unique locale creation, stable-ID rename, value edits, English-only key insertion, invalid values, dirty-state tracking, and save/discard/cancel; implement a locale draft model and verify all tests pass.
- [ ] 3.2 Write failing writer/API Vitest tests for validated atomic create/update, duplicate create rejection, path containment, request limits, invalid dictionaries, temporary-file cleanup, failure preserving source, and absence in production; add the serve-only locale writer plugin and client adapter until they pass.
- [ ] 3.3 Write failing scene tests for DEV-only create/edit entry, direct production entry rejection, list scrolling, Unicode text edits, fallback indicators, pending-save snapshots, newer dirty edits, and stale callbacks; implement Canvas authoring using existing text controls until they pass.
- [ ] 3.4 Write failing integration tests for file discovery after create/save, clean-view refresh, and preserving dirty drafts across save or external-file refresh; implement catalog refresh without forced page reload and verify it passes.
- [ ] 3.5 Extend `docs/localization.md` with create/rename/edit/save instructions and English-only key authoring; verify a saved test dictionary survives a dev-server restart and enters a production build without authoring controls or endpoints.

## 4. Existing interface translation

- [ ] 4.1 Write focused failing presentation tests for translated menus/settings and parameterized participant/model/map labels; migrate main menu and settings scenes plus shared Canvas text controls to English keys and verify those tests pass.
- [ ] 4.2 Write focused failing tests for translated battle HUD, pause/results, and multiplayer status/error messages; migrate presentation formatters and scenes, preserving raw data/protocol fields, and verify tests pass with different peer language preferences.
- [ ] 4.3 Write focused failing tests for translated map/campaign library/editor and replay controls, including readiness/storage/file errors; migrate these surfaces with presentation adapters for core reasons and verify tests pass without modifying core error semantics.
- [ ] 4.4 Verify the production English-key check covers all migrated text references and audit application-owned visible strings in `src/game`; document any intentionally verbatim authored/external fields in `docs/localization.md` and verify representative long translations wrap/scroll without inaccessible buttons.

## 5. Campaign format and translation editing

- [ ] 5.1 Write failing Vitest tests in campaign definition/draft suites for v1 normalization, deterministic line IDs, v2 serialization, partial translation fields, unknown locale retention, duplicate IDs, dangling line references, and invalid values; implement pure v2 schema and compatibility readers until they pass.
- [ ] 5.2 Write failing editor-model tests for adding a dialogue locale from the game catalog, duplicate-link rejection, English-only structural edits, translated speaker/text edits, stable reorder associations, deletion cleanup, and new-line fallback; implement transformations and verify tests pass.
- [ ] 5.3 Write failing scene tests for initial English authoring, locale selection, English source/fallback indicators, display-name refresh, and unknown locale warnings; add Canvas dialogue translation controls while preserving existing production local/built-in guards and verify tests pass.
- [ ] 5.4 Write failing persistence/file tests for translated local SAVE, DEV BUILT IN SAVE, local copy IDs, v1 import, v2 export/reimport, unknown locales, and legacy storage without eager writes; update all campaign entry points and verify translations survive each destination and failure retains prior data.
- [ ] 5.5 Migrate built-in tutorial JSON to v2 with stable line IDs and update `docs/campaigns.md` with schema and translation workflows; verify catalog discovery and the existing English tutorial sequence tests pass.

## 6. Localized playthrough and replay snapshots

- [ ] 6.1 Write failing Vitest tests for independent speaker/text English fallback and language/content snapshots across retry/next mission; resolve dialogue outside combat state and snapshot the run language until tests pass.
- [ ] 6.2 Write failing recorded-match/narrative tests for v3 translated snapshots, v1/v2 legacy reads, malformed language/translation rejection, file round trips, and source/catalog edits after recording; version new replay writes and extend compatibility readers until they pass.
- [ ] 6.3 Write failing replay/controller lifecycle tests for recorded-language dialogue with viewer-language controls, boundary order, seek cancellation, pause/resume, and no AI/network calls; integrate localized narrative presentation until they pass.
- [ ] 6.4 Add a focused deterministic regression comparing identical campaign maps/actions under two narrative languages and headless replay reconstruction; verify equal state, scores, accepted actions, and outcome, then document v3 replay compatibility and narrative-language behavior in `docs/campaigns.md`.

## 7. Integration acceptance

- [ ] 7.1 Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; verify all pass and production bundles expose no source-write route or authoring entry. Run `npm run simulate` if simulation behavior was affected during implementation.
- [ ] 7.2 Exercise the complete DEV flow: create/rename a language, add an English key, edit a translation, save/restart, translate tutorial dialogue, play, record, change source, and replay; verify filesystem contents, preference persistence, English fallback, immutable replay text, and failure/dirty-draft behavior.
- [ ] 7.3 Exercise production language selection, translated local campaign editing, legacy imports/replays, long Unicode text, and Canvas pointer barriers; verify no DOM UI appears, unknown packs preserve campaign data, and all controls remain reachable.
