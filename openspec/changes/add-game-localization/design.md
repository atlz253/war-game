# Design

## Context

See `proposal.md` for motivation and scope. `MainMenuScene` and other scenes currently embed English strings; no locale catalog exists. `CanvasTextDialog` already supports Unicode, multiline entry, clipboard paste, and scrolling without DOM controls. Browser-backed settings and Canvas settings scenes provide an established preference pattern.

Campaign schema v1 stores English `{ speaker, text }` lines without line IDs. Missions and events have stable IDs; line translations cannot safely use array indices because the editor reorders and deletes lines. Campaigns have separate browser SAVE and DEV BUILT IN SAVE paths. `scripts/dev-campaign-writer.ts` provides validated atomic source writes and currently refreshes via full reload. RecordedMatch v2 snapshots mission definitions and occurrences; older v1 action-only records remain supported. Existing specs explicitly require campaign v1 catalog/export and must be updated together with the format migration.

## Goals / Non-Goals

**Goals:** Keep resolution pure and testable; keep preference and UI state outside `GameState`; support partial translations and portable campaign data; retain source files and unsaved drafts on errors; keep replay narrative independent of current catalogs.

**Non-Goals:** No locale-aware AI input, translated action identifiers, plural-rule engine, rich-text syntax, RTL layout engine, or automatic language detection. This iteration uses named interpolation and existing Unicode Canvas text rendering. Locale management adds create/rename/edit, without deletion or key renaming.

## Decisions

### 1. Versioned dictionaries and stable language IDs

Add `src/game/localization` with pure validation/resolution utilities, a discovered catalog, browser preference storage, and DEV transport. Files under `locales/<id>.json` have `{ schemaVersion: 1, id, name, strings: { "menu.startMatch": "START MATCH" } }`. `en.json` is mandatory. IDs use lowercase alphanumeric segments separated by hyphens; locale display names remain independent Unicode text. Renaming changes only `name`, preserving references, filename, and saved preference. Create uses a new unique ID and an initially empty translation dictionary. No additional non-English pack is required to deliver this feature.

Use Vite JSON glob discovery, following the built-in campaign catalog pattern. Adding a file requires no TypeScript registration; builds validate filenames/IDs, duplicate IDs, schema, string types, key membership, and placeholder compatibility. English defines the authoritative flat key set. Partial translations are valid; whitespace-only values mean untranslated. Invalid non-English files are reported with filename and excluded without disabling English. Missing/invalid English or a production reference to a nonexistent English key fails validation/build.

Alternative: positional arrays or dictionaries embedded in scenes. Both couple translation changes to code order or registration and prevent standalone authoring.

### 2. English fallback and presentation-only preferences

Resolve each key from the chosen locale, then English; interpolate named `{parameter}` placeholders after selection. Placeholder sets must match English for nonempty translations. Missing keys in English return the key plus a DEV diagnostic as a defensive runtime guard; checks prevent this in shipped content. Parameters such as model IDs, player names, coordinates, and scores remain data. Core/AI error codes or existing validation reasons are mapped by presentation adapters; do not translate protocol payloads, accepted actions, replay state, or raw external error details.

Store a versioned preferred locale ID through the existing browser settings pattern. English is used for absent/corrupt preferences or unavailable IDs; storage failures are visible and preserve an in-session selection. Apply selection immediately in the selector and when returning to the menu, carrying match configuration through scene navigation. Other scenes read the current preference at creation. Each multiplayer peer uses its own preference. There is no language control during an active match; campaign narrative language is fixed at run start.

Migrate all application-owned visible interface text across menus, battle HUD/pause/results, settings, multiplayer, map/campaign editors, dialogue controls, and replay scenes into English keys. Authored campaign/mission/map names, arbitrary imported content, and external diagnostic details remain verbatim. Explicitly test label wrapping, scrollability, and pointer consumption with longer translations. Do not change the HTML shell or add a UI framework.

Alternative: translate core strings in place or localize only the new menu. The former contaminates headless behavior; the latter leaves the existing game untranslated.

### 3. DEV authoring through bounded atomic source writes

Add a Canvas language scene with selection in all modes and CREATE/EDIT in DEV only. The editor shows English keys, English source values, translated values, and fallback status; supports name edits and a scrolling dictionary list; and reuses Canvas text entry. Only English exposes ADD STRING, requiring a unique key and nonempty source value. Other locales can only edit canonical keys. Save/discard/cancel protects dirty drafts.

Add a serve-only Vite plugin with a dedicated `/__dev-localizations` endpoint. Validate both client-side and server-side, bound request size, derive the path from the validated ID inside the fixed locale directory, reject duplicate create operations, and replace existing files atomically using temporary siblings. Keep English protected against removal or ID changes. Report failures without clearing drafts. Snapshot each save; disable overlapping writes, retain newer edits as dirty, and ignore stale scene callbacks. Invalidate the locale module/catalog and refresh successful data without automatically reloading away unsaved editor changes; external file edits refresh clean views and leave dirty drafts intact with a reload notice. Do not copy the campaign writer's unconditional full-reload behavior for locale saves.

Alternative: downloads or localStorage-only locale editing. Neither satisfies project filesystem persistence. A browser cannot write repository files directly, so use the existing development-server architecture.

### 4. Campaign v2 with English source and event-owned translation dictionaries

Write campaign schema v2. Retain line `speaker` and `text` as canonical English; add a stable `id` to each line. Each event optionally contains `localizations: { "ru": { "line-id": { "speaker": "...", "text": "..." } } }`. Locale IDs link to game catalog IDs, and line IDs are unique within the event. Pure schema validation stays in `src/core/campaigns`; catalog membership checks and presentation lookup stay in `src/game`. Store translation data in the campaign itself so existing local SAVE, BUILT IN SAVE, copy, and import/export remain self-contained.

The campaign dialogue editor selects English initially, offers ADD LOCALIZATION from available game locales, and edits existing translations. In non-English mode, authors edit speaker/text for existing lines; line/event structural editing remains in English. Empty or absent translated fields fall back individually to English and are visibly identified. Adding/reordering English lines retains existing identities and translations; new lines are untranslated. Deleting a line removes its translation entries. Editing English preserves translations; automatic stale-translation tracking is not required. Preserve unknown locale dictionaries from imported campaigns and warn that the game pack is unavailable; never synthesize a game locale from campaign data. Existing translations remain editable by ID, but creating new links requires an installed game locale.

Read v1 and v2 campaigns. Pure v1 normalization assigns deterministic line IDs from original event-local positions, preserving them on subsequent edits; v1 lines are English with no translations. Keep the browser library envelope version independent from the campaign payload version; normalize old entries without destructive eager writes. Built-in JSON files and catalog documentation move to v2. Unsupported versions remain rejected. Existing English text is treated as English without machine translation or rewriting.

Alternative: translation arrays indexed by line position or campaign sidecar files. Position indices misassociate translations after reorder; sidecars complicate local campaign copies, collision resolution, portable exports, and replay snapshots.

### 5. Snapshot narrative text and preserve replay compatibility

At campaign launch, snapshot the full v2 campaign and chosen locale ID along with the existing maps/participants/policies. Resolve speaker/text from that snapshot outside combat state. Retry and next mission retain the chosen language and content even if catalogs/preferences change.

Write RecordedMatch v3 with a narrative locale ID and a self-contained mission snapshot including translations. Validate translation shape/references and language metadata; resolve narrative solely from the record with English fallback. Replay control labels use the viewer's current UI language, while recorded dialogue uses the recorded language. Extend readers for v1/v2 records: legacy missions normalize as English, and their action/occurrence boundary validation remains unchanged. Preserve seek cancellation, pause position, one-shot order, and action-based reconstruction without AI/network calls.

Alternative: resolve replay dialogue from the current campaign/catalog. This changes history when translations are edited and breaks self-contained playback.

## Risks / Trade-offs

- Large migration of hardcoded text → Inventory scenes and presentation helpers first; use semantic keys, parameter tests, and a non-English test catalog to expose omissions.
- Long Unicode translations can overflow fixed panels → Wrap/scroll or adjust centralized theme layouts, verify representative long strings at supported viewport sizes.
- Campaign/replay version changes can lose old data → Test v1 campaign and v1/v2 replay fixtures, import/copy/export, invalid payload rejection, and absence of eager storage rewrites.
- File refresh or asynchronous save can discard newer edits → Use explicit save snapshots, scene generation guards, and refresh without forced reload of dirty scenes.
- English edits can make translations outdated → Preserve translations and show English alongside them; automatic review status is deferred.
- No RTL layout or plural rules → Document supported formatting boundaries and do not claim those features.

## Migration Plan

Implement pure catalog and campaign compatibility readers with failing Vitest tests before UI integration. Ship the complete English catalog and migrate built-in tutorial data to campaign v2. Update writers/export to v2 and replay recording to v3 only once legacy readers pass. Validate production without dev endpoints, then document file schema and authoring. Rollback of application code after new formats are saved requires retaining compatible readers or exporting backups first; do not downgrade new records by silently dropping translations.
