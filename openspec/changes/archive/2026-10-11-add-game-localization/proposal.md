# Proposal

## Why

The game currently presents hardcoded English interface text and English campaign dialogues. Players need a preferred language with reliable English fallback, and authors need to create and maintain translations through the existing Canvas workflows without manually registering each language in code.

## What Changes

- Add a main-menu language entry, a Canvas language selector, and a persisted preferred language. English is the default and the fallback for untranslated strings.
- Discover versioned JSON dictionaries from `src/game/localization/locales/<id>.json`; give each language a stable ID, editable display name, and string dictionary with English as the canonical key set.
- Route game interface labels, instructions, notifications, and application-owned error messages through keyed translation and named interpolation.
- In DEV, allow creating languages, renaming their display names, editing translations, and adding canonical keys only while editing English. Save explicitly to project files through a validated development-server API.
- Add campaign dialogue translations linked to game language IDs, with English source lines, stable line identities, and per-field English fallback. Preserve existing local/source save destinations and production campaign editing rules.
- Introduce backward-compatible readers for existing campaigns and narrative replays, version new campaign writes, and snapshot translated narrative content for independent replay playback.

## Capabilities

### New Capabilities

- `game-localization`: JSON language discovery, language preference, interface translation, fallback, and DEV Canvas authoring with filesystem persistence.

### Modified Capabilities

- `campaign-authoring`: Versioned campaign dialogue translation data, compatible file exchange, and translation editing through existing campaign save workflows.
- `mission-dialogue-events`: English source lines, stable line identities, localized speaker/text presentation, and self-contained replay narrative translations.
- `campaign-playthrough`: Snapshot selected dialogue language and campaign translations at playthrough start.

## Impact

Affected areas include `src/game/scenes`, `src/game/ui`, settings storage, scene registration, presentation formatters, `src/core/campaigns`, campaign storage/import/export, narrative recording/playback, and Vite DEV plugins under `scripts`. Pure campaign schema and migration remain headless; locale selection, filesystem transport, and presentation remain outside combat core and AI. No translation service, extra UI framework, or new artwork is required. English ships as the complete baseline; additional translated language packs, campaign/mission/map title translation, automatic translation, locale deletion, and in-match language switching are outside this change.
