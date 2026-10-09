# Proposal

## Why

The game currently supports individual matches and a map editor but does not connect battles into a continuous story. A campaign editor will let authors assemble missions from built-in maps and accompany them with dialogues while preserving established combat rules.

## What Changes

- Add a local library and Phaser Canvas campaign editor: campaign name, ordered missions, built-in map selection, standard victory or additional victory by reaching a specified cell, standard defeat, and event editing.
- Include a ready-to-play tutorial campaign whose first mission uses a dedicated built-in map without opponents: dialogues teach unit selection, movement, and ending a turn; victory follows a friendly unit's arrival at the target cell on the opposite edge.
- Store built-in campaigns as individual versioned JSON files under `src/core/campaigns/definitions`, discovered automatically like built-in maps. Move the tutorial definition to `tutorial.json` while preserving its identifiers and content.
- Allow built-in campaign editing only in DEV: SAVE writes the source JSON through a development-server API, while SAVE AS COPY creates a local campaign. Production retains built-in play/export and local campaign editing.
- Add Canvas campaign import/export in DEV and production using single-campaign `.ai-war-campaign.json` files. Validate imports, preserve incomplete drafts, resolve identity collisions without overwriting existing campaigns, and report file/storage failures.
- Add campaign launch, progression after victory, retry after defeat, and completion of the final mission. Each attempt starts a fresh match without carrying units or resources forward.
- Add dialogue events containing an ordered sequence of speaker names and text, without branching. Each event fires once per mission attempt.
- Support six triggers: mission start, turn number, unit movement, unit selection, unit arrival at a specified cell, and mission end.
- Sequence dialogues, block battle orders and AI while they are open, coordinate with movement animation, and preserve dialogue context in replays.

## Capabilities

### New Capabilities

- `campaign-authoring`: campaign model, reference validation, local Canvas editing, a JSON built-in catalog with DEV-only source editing, and campaign import/export.
- `campaign-playthrough`: sequential progression, standard outcomes and reach-cell victory, retry, campaign completion, and a ready-to-play first tutorial mission.
- `mission-dialogue-events`: dialogue editing, six triggers, deterministic processing, Canvas presentation, and playback of recorded occurrences.

### Modified Capabilities

None. The requirements of `unit-movement-presentation` remain unchanged; dialogues follow completion of the corresponding transition.

## Impact

- New pure models and processors under `src/core/campaigns`; browser library and orchestration under `src/game/campaigns`.
- New Canvas library/editor scenes, a dialogue component, registration in `scene-keys.ts` and `game-config.ts`, and an entry from `MainMenuScene`.
- Integration with human/AI accepted-action paths, unit selection and lifecycle in `BattleScene`, results in `ResultScene`, versioned `RecordedMatch`, and `ReplayScene`.
- Reuse of the built-in map catalog, `createGameStateFromMap`, `GameAction`, core events, movement presenter, AI pause controller, and theme.
- Extension of the core match-completion policy for missions and a snapshot of that policy in replays; built-in tutorial campaign and map definitions. Standalone matches retain their default rules and requirement for units on both sides.
- Development-server middleware for built-in campaign source writes, following the existing built-in map workflow; filesystem access remains outside runtime core. Native file pickers/downloads are temporary and initiated only by Canvas buttons.
- No new dependencies, DOM interface, or changes to standalone match rules. Portraits, other event types, user-library maps, campaign branching, multiplayer campaigns, and resuming unfinished runs after reload are outside version one.
