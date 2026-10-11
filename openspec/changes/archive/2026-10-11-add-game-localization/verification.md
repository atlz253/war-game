# Verification

Verified on Windows on 2026-10-10.

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint`: passed, with 35 non-null assertion warnings and no errors.
- `npm test -- --reporter=dot --maxWorkers=2`: 100 suites and 389 tests passed. The existing seeded batch-simulation test exceeded its timeout once during a default-concurrency run; it passed independently and in the complete run with two workers.
- `npm run build`: passed, including locale validation and the English-key audit. Vite reports the existing large Phaser bundle warning.
- `openspec validate add-game-localization --strict`: passed.
- `git diff --check`: passed.
- Production JavaScript contains no `/__dev-localizations` write route. Simulation implementation was unchanged; deterministic language regression and the batch-simulation suite passed.

## Browser acceptance

Used isolated browser contexts against Vite DEV and the production preview. All controls were Phaser Canvas controls; the pages contained zero input, textarea, select or button DOM elements.

- Created a language through the Canvas dialog, edited its Unicode name and translation, paged to dictionary keys, saved JSON, and restarted the dev server. The file, display name, translation and selected preference survived restart.
- Added an English key through the Canvas editor and edited its translation in the new pack. Missing values used English. Source dictionaries were inspected after saving.
- Creating and saving a locale preserved `performance.timeOrigin`. An external file update refreshed the catalog while retaining a dirty name edit and showing the external-change notice. A regression test covers Vite create/update/delete events on Windows paths.
- Checked long Unicode names and a long translated START MATCH label. The latter wrapped inside its button; dictionary previews remained bounded, with the full source available in a scrolling dialog. The selector was also inspected at desktop and narrow viewport sizes.
- Added a translation to a local copy of the tutorial, saved it, played its first mission through accepted core actions, and recorded a completed replay. After changing the campaign source, playback still displayed the original recorded translation. Viewer controls remained in the viewer's language.
- Production exposed language selection and local campaign translation editing, retained an unknown language dictionary with an unavailable-pack warning, rejected direct locale-authoring entry, and returned HTTP 404 for a locale-write POST.
- A legacy v2 replay displayed its English narrative. Canvas dialogue overlays consumed pointer events. Reopening a replay after leaving it succeeded after the destroyed-pause-control regression was fixed.

Temporary acceptance dictionaries, the temporary English key and migration scripts were removed. The final shipped catalog contains the English baseline; additional languages can be supplied as documented JSON dictionaries.
