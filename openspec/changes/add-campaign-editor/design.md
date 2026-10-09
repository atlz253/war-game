# Design

## Context

See `proposal.md` for motivation. The project currently has no campaigns. `MapDefinition` v2 and `getBuiltInMaps` already provide serializable maps; `createGameStateFromMap` generates unit identifiers from side, type, and placement order. Unit references therefore cannot be resolved by display name or by position after movement.

`applyAction` emits `unit-moved`, `turn-ended`, and `victory-achieved`; `turn` starts at 1 and increments on each side change. Human and AI actions currently have separate acceptance sections in `BattleScene`, but both use the core API. Unit selection happens only inside `handleBoardClick`. `MovementPresenter` provides completion/settled callbacks, and `BattleAiPauseController` defers asynchronous decisions while paused. `checkForResult` currently saves the replay and opens the result immediately; it must wait for dialogues.

`RecordedMatch` uses schemaVersion 1 and stores accepted actions, the map, and participants. The replay timeline is built in core without AI. Existing assets cover units and terrain but not portraits. Use text dialogues with the existing Canvas panels and font, without requesting new assets.

## Goals / Non-Goals

**Goals:** pure validation and deterministic signal matching; separation of combat state from narrative presentation; a shared lifecycle for dialogues, animation, pause, and AI; a local authoring library; a JSON built-in catalog with DEV-only source editing; campaign file import/export; compatible versioned replay records.

**Non-Goals:** a general scripting engine, changes to `GameAction` for UI selection, an arbitrary victory-rule builder beyond reach-cell, map modification within the campaign editor, a headless campaign batch CLI, and a network narrative protocol. Existing multiplayer actions and synchronization remain unchanged.

## Decisions

### 1. Versioned definitions separate from combat GameState

Add `src/core/campaigns` with small modules for the model, serialization, validation, signals, matching, and progression. `CampaignDefinition` v1 contains `id`, `name`, and `missions`; `MissionDefinition` contains a stable `id`, `name`, `builtInMapId`, `conditions`, and `events`. The conditions union is `{ type: "standard-match" }` or `{ type: "standard-match-or-reach-cell", unit, cell, mapBinding }`; the second variant preserves standard combat outcomes and adds Blue victory by reaching a cell. `unit` targets any Blue unit or a specific initial Blue unit ID. `DialogueEvent` contains `id`, `type: "dialogue"`, one discriminated trigger, and `lines: { speaker, text }[]`.

The trigger union is `mission-start`, `turn { number }`, `unit-moved { unit }`, `unit-selected { unit }`, `unit-arrived { unit, cell }`, and `mission-end`. A unit selector is `any` or a specific runtime unit ID from the selected map's initial state. The editor shows side, type, and initial cell alongside the ID. The map remains a read-only preview. Changing maps clears map-binding confirmation; authors explicitly confirm transfer or reassign references even if the same ID happens to exist on the new map. Validation checks the binding against the map ID, unit existence, integer cells within bounds, positive integer turn numbers, unique IDs, and known discriminants.

Structural validation is separate from readiness: empty mission or dialogue-line lists can be saved as drafts; unknown formats/versions are rejected. Before Play, every mission passes readiness and built-in reference resolution. Standard-match uses the existing `isMapReadyForMatch` predicate requiring both sides. Reach-cell requires a valid map with at least one Blue unit; Red units are optional. Objective validation checks that a specific unit belongs to Blue, the map binding, bounds, terrain passability, and a route from at least one eligible initial unit. Route validation uses core terrain/path rules without temporary blocking by other units or a single-turn movement-point limit. The validator receives maps as data; browser APIs and Phaser imports are forbidden.

Embedding the entire campaign in `MapDefinition`/`GameState` was considered and rejected: one map can serve different missions, and selection and dialogue reading are not combat simulation. Only the deterministic victory policy for the particular match belongs in `GameState`; narrative definitions and UI state remain outside it.

### 2. Pure narrative signals and stable occurrences

The pure matcher receives a mission-definition snapshot, fired event IDs, and a signal; it returns updated fired IDs and a list of `DialogueOccurrence` values. It does not mutate `GameState`. Fired IDs represent narrative state for the attempt, not selected units or input locks.

An adapter converts accepted action results into signals in core event order. Startup processes `mission-start`, then `turn` with the initial number. `turn-ended` means entering the newly displayed turn. `unit-moved` checks ordinary movement and arrival at `to` in one pass through authored events, preserving event order regardless of trigger type. Crossing a cell is not arrival. `mission-end` follows processing of the final action result only when `winner !== null`; manual exit does not emit it.

The selection controller emits a signal only when `selectedUnitId` changes to a valid human-selectable ID. This is a presentation signal, not a `GameAction`; AI does not select units. The headless matcher can receive this explicit signal in tests, but core simulation does not invent it.

Each occurrence receives stable `eventId`, `sequence`, `afterActionCount` (the number of already accepted combat actions), and its source signal; selection occurrences must store the selected `unitId`. Matching events are marked fired when queued so repeated signals during presentation cannot duplicate them. Retry starts with empty fired IDs and a new occurrence journal. Identical definitions/signals produce identical occurrences without wall-clock time or random IDs.

Subscribing Phaser objects to arbitrary events was considered and rejected: ordering would depend on animation, and pure tests and selection replays would become unreliable.

### 3. Separate campaign controller and Canvas editor

`src/game/campaigns` contains the browser library, draft operations, runtime controller, and adapters. The library uses a separate storage key, dependency-injected StorageLike, and a versioned envelope. Read/write errors are returned explicitly; corrupt data is not automatically overwritten with an empty array. The session draft remains available after a save failure. The built-in catalog under `src/core/campaigns` loads individual `CampaignDefinition` v1 JSON files from `src/core/campaigns/definitions/*.json` using eager `import.meta.glob`, like the existing built-in map catalog. It validates structure and unique campaign IDs, reports source errors, sorts by ID and returns independent deserialized definitions. Campaign payloads belong in JSON rather than TypeScript constants or helper-generated content. Runtime core does not read or write the filesystem. The browser catalog combines built-ins and local copies independently of local storage availability.

Built-in editor entry is guarded by `import.meta.env.DEV` in both the library controls and the editor scene, so a direct scene launch cannot bypass the production restriction. DEV SAVE writes the existing built-in campaign JSON with its stable ID through `/__dev-campaigns`; SAVE AS COPY creates a new local identity instead. Local editing remains available in both modes. Built-in deletion through the editor is not introduced. Production permits built-in play/export, with no built-in editing or source-writing endpoint.

The development-only Vite middleware follows the existing map writer workflow. It accepts supported campaign structure, validates filename-safe IDs, confines resolved writes to the definitions directory, and uses a canonical `<id>.json` filename (`tutorial.json` for the tutorial). A successful write refreshes the catalog through Vite invalidation/reload. Invalid requests or filesystem failures return an explicit error; the UI marks the draft saved only after a successful response. Filesystem dependencies stay in development-server tooling, outside `src/core` and production runtime. Incomplete structurally valid drafts remain distinct from Play readiness. Existing runs and replay snapshots continue to use their original definitions after source edits.

`CampaignLibraryScene` provides a list and Create/Open/Delete/Play plus IMPORT and EXPORT. `CampaignEditorScene` shows missions on the left and the selected mission's settings on the right; a nested event editor manages triggers and lines, and EXPORT exports the current draft without marking it saved. Canvas up/down buttons change ordering without requiring drag-and-drop. The map preview permits unit/cell selection without the battle input handler. Conditions offer standard-match or standard-match-or-reach-cell, an any-Blue/specific-Blue selector, and cell selection. Standard defeat remains fixed; capture only grants existing score. Map changes require explicit objective rebinding as well. Coordinates in the Canvas HUD and an existing map UI highlight identify the goal without a new terrain/art asset.

File exchange uses `.ai-war-campaign.json` and `application/json`, containing exactly one `CampaignDefinition` v1 rather than the local library envelope or session/replay state. Reuse campaign serialization and structural validation; unknown formats or malformed JSON are rejected before any storage update. Import always creates a local entry, checks ID collisions against built-in and local campaigns, and chooses a distinct campaign ID without changing mission/event IDs, map bindings, content or ordering. This also allows a built-in export to become an editable local campaign in production without editing the built-in source. Valid drafts with missing maps or empty lists can be imported; existing readiness errors disable Play until corrected. Storage errors preserve existing entries and report failure.

Browser file adapters create only temporary native pickers/download links after explicit Canvas-button clicks. They clean up temporary elements, handlers and object URLs on completion, cancellation or failure; no DOM controls become game UI. Cancellation is a no-op, failures are visible, and scene shutdown invalidates pending import callbacks. Import/export are available in DEV and production. Import starts from the library, so it does not replace an unsaved editor draft; existing Save/Discard/Cancel navigation remains in effect.

Extract a reusable Canvas text-edit model/control from the `MapRenameDialog` approach while preserving existing rename behavior. Dialogue lines need line breaks, a cursor, backspace/delete, keyboard focus, and scrolling; paste uses keyboard/input capabilities without a DOM input. Length limits and layout values belong in named configuration/theme values; text must not be silently truncated. Mission, event, and line lists have their own scroll/focus. Leaving a dirty draft offers Canvas Save/Discard/Cancel.

DOM forms or extending `MapEditorScene` with every new responsibility were considered and rejected. The former violates the contributor guide; the latter mixes editing lifecycles. Register new scenes in scene keys/game config; centralize the theme and keep HUD/modal objects fixed to the camera and consuming input.

### 4. Session playthrough snapshot and progression

Version-one assumption: the player is Blue; Red uses the existing Heuristic AI where Red units exist. Use `MatchConfiguration` rather than separate AI rules. Before launch, resolve and clone all maps, victory policies, and the campaign definition, and snapshot participants; library edits then cannot affect the current run. The controller stores the current mission index and result without browser-persisted progression. Each attempt uses a core mission-state factory over `createGameStateFromMap`, accepted actions, and the existing AI API. For an empty Red side, after presentation/dialogue barriers the controller submits a normal `end-turn` through `validateAction`/`applyAction`; the action is recorded and increments the turn normally. Do not manually change activeSide or movementPoints.

After victory, `ResultScene` offers Next Mission or displays Campaign Complete; after defeat, it offers Retry for the same mission. Menu is available in both cases. Combat state does not carry between attempts. The progression helper purely transforms campaign-run metadata; the winner comes exclusively from `applyAction`. Standalone PLAY AGAIN remains unchanged. Replay has no access to progression mutation.

Persistent savegames and continuing an existing `GameState` were considered and rejected for v1: they require another save format and complex reconciliation of edited campaigns.

### 5. Barrier between action presentation and the next order

`MissionDialogueController` receives occurrences from both human and AI accepted-action paths, preferably through an extracted shared post-accept helper while preserving multiplayer publishing. Matching can run immediately after acceptance, but presentation starts only in the corresponding presentation transition's completion callback. After movement, render shows `after`, then dialogue, then further AI scheduling/result checks.

The dialogue UI contains the speaker name, text, line number, and Next/Close; long text remains readable through wrapping/scrolling. No character portraits or programmatic character artwork are added. The screen panel follows the existing UI style.

Instead of competing changes to one flag, add controller-owned blocking reasons `pause`, `dialogue`, `movement`, and `exit`; order availability derives from current blockers and existing human/multiplayer checks. While narrative is queued, `runAiAction`, `startAiTurnIfNeeded`, and `checkForResult` cannot continue. Start dialogue opens before the first AI call.

The AI pause controller resumes only after all pause/dialogue blockers are removed. This prevents AI resuming when pause closes over an open dialogue. Remote campaign participants are not added in v1, but lifecycle guarantees remain: pending asynchronous decisions are deferred, and exit/dispose invalidates callbacks. Dialogue closure and completion use generation/once guards. Exit clears the narrative queue and handlers; pause preserves the line index; scene recreation cannot receive stale callbacks. Every dialogue completion uses one continuation that chooses results or the next AI turn.

Showing dialogue immediately on acceptance or using a timer was considered and rejected: logical movement finishes before animation, and timers depend on local speed. Use existing completion/settled boundaries; `unit-movement-presentation` scenarios must remain green, including instantaneous movement.

### 6. Replay schema v2 with a narrative extension

The new writer produces `RecordedMatch` v2; the reader explicitly accepts v1 and v2, normalizing old records to empty narrative and standard-match policy. Campaign records additionally contain a mission-definition snapshot, victory policy, campaign/mission identity, and ordered occurrence journal. Map and participants are already snapshotted in the record. The dialogue-definition snapshot protects replay from later campaign edits. `ReplayTimeline` and `createRecordedMatch` build initial state from the map and policy snapshots using the same core factory, then apply accepted actions. The reader validates the policy and its agreement with mission conditions; an empty enemy roster is allowed only with a valid reach-cell policy. Legacy and standalone records remain standard-match. Accepted combat actions, including automatic Red end-turn, remain the source of replay frames and winner.

Validate IDs, `afterActionCount` within `0..actions.length`, monotonic boundaries and sequence, no repeated one-shot events, and trigger-kind compatibility with the boundary. Check action-derived occurrences with the pure matcher against core replay events; accept selection occurrences as recorded presentation facts at their boundaries, with an existing selectable Blue unit in that frame. At boundary 0, start precedes turn-one; mission-end is valid only with a final winner. Narrative errors visibly reject the record without AI/network calls.

Forward playback shows boundary-0 occurrences before the first action and boundary-N occurrences after action N's presentation; the next frame waits for all lines to close. Seeking/backward steps cancel dialogue and movement, render the frame immediately, and reset the cursor to the target boundary. A boundary reached through seeking does not open dialogue automatically; subsequent forward traversal shows its occurrences again even if already viewed. Replay UI clicks do not emit unit-selected signals.

Reconstructing all dialogues from actions was considered and rejected: selection is absent from `GameAction`. Do not add selection to the combat action log or run the live campaign runtime in the viewer.

### 7. Reach-cell victory in the shared core action path

Core battle state receives a serializable victory policy defaulting to standard-match; existing state factories and legacy records without a policy retain their previous outcomes. The core mission-state factory validates/sets policy during match creation, rather than Phaser doing so. `MapDefinition` schema stays unchanged: the goal belongs to the mission, not the shared map.

After an accepted `move` under reach-cell policy, `applyAction` checks the eligible Blue unit and `unit-moved.to` against the target. On a match, core returns a new `GameState` with `winner: "blue"` and `victory-achieved` after `unit-moved`. Neither the controller nor the dialogue matcher sets the winner. Subsequent `validateAction` calls reject every order as match-finished. Standard combat victory/defeat remains unchanged; a terminal outcome is never overridden. Movement awards no score, and victory preserves existing score.

Intermediate animated positions, initial occupancy, and selection do not participate in the check. An empty Red roster at reach-cell match creation is not victory: without combat, only eligible arrival ends the match. Standard standalone readiness is not relaxed. Matching movement/arrival dialogues are processed before the mission-end signal; presentation waits for movement completion. Headless execution derives the winner immediately from the action without UI delays.

Computing mission victory only in Phaser and storing a separate result was considered and rejected: `GameState.winner`, headless/replay completion, and rejection of further actions must follow one core rule.

### 8. Shipped first tutorial campaign mission

Add built-in map `tutorial-movement-12x5` under `src/core/scenarios/maps`: size 12×5, two Blue infantry at `(0,1)` and `(0,3)`, no Red units, terrain obstacles, or control points. `MapDefinition` remains valid; the standalone map picker disables Start because Red is absent, while campaign mission readiness permits reach-cell play. The built-in tutorial campaign definition in `src/core/campaigns/definitions/tutorial.json` contains one implemented first mission, `selection-and-movement`; future missions are not represented by empty placeholders. Migrating the existing TypeScript definition to JSON preserves campaign/mission/event IDs, conditions, bindings and dialogue text.

Objective: `standard-match-or-reach-cell`, any Blue unit, target `(11,2)` with map binding. With current infantry movement points, the goal requires multiple moves and at least one refresh through ending a turn; test shortest terrain cost against the core initial movement allowance. Players can use either unit without a required selection order or forced route. The goal is visible in the Canvas HUD and map highlight.

Content uses ordinary one-shot events without bespoke tutorial scripting: mission-start from the character "Instructor" asks the player to select a Blue unit; first unit-selected(any) explains clicking an available cell; first unit-moved(any) explains remaining movement points, the end-turn button, and the goal on the far edge; mission-end congratulates the player on learning the controls. Lines use actual control labels. Start/selection modals close before orders, and the goal distance ensures the first move completes the brief explanation before victory. No separate teaching block for attacks or capture is added.

Using an existing combat map or generating an opponent just to satisfy readiness was considered and rejected: the first mission should calmly teach only selection and movement. Tutorial data uses existing unit/terrain assets without requiring new artwork.

## Risks / Trade-offs

- [A map-generated ID may identify a different unit after a map edit] → Snapshot maps in runs/replays, require explicit rebinding on map changes, and validate readiness when opening the editor. V1 does not guarantee reference meaning after external edits to a built-in map with the same ID.
- [BattleScene already has substantial orchestration and is approaching the file limit] → Extract campaign lifecycle, dialogue queue, and the shared accepted-action adapter into separate modules; keep production files <=1000 lines, functions <=75 nonblank lines, and complexity <=15.
- [Two pause reasons may resume AI prematurely] → Use a shared blocker check and Vitest integration coverage for pause over dialogue, instant movement, retry, and shutdown.
- [A manual Canvas text editor is more complex than short rename input] → Use a pure text-edit model, focused Vitest coverage for Unicode, cursor, multiline, limits, and scroll, and browser QA with actual long Russian text.
- [No persistent progression or portraits] → The editor communicates the session scope of progression; text dialogue is sufficient for the agreed v1 and no new assets are needed now.
- [Reach-cell victory could be lost in replay without policy] → Snapshot policy, use a shared core initial-state factory, and test equality of live/headless/replay results, including action rejection after final movement.
- [A tutorial map without Red could weaken standalone readiness] → Keep mission readiness separate, preserve the standard-match predicate, and add a standalone map-picker regression test.
- [Production users could enter a built-in editor directly] → Guard both Canvas entry controls and scene initialization; register the source writer only on the development server.
- [Import could overwrite a built-in or local campaign] → Resolve campaign ID collisions across both catalogs before persisting, preserve nested identities, and test storage failure and cancellation as no-ops.

## Migration Plan

1. Add core definitions/matcher, victory policy/evaluator, and an isolated local storage key without changing map schema or combat action types; default standard-match preserves previous behavior.
2. Introduce the dual-version replay reader before connecting the v2 writer and narrative playback; existing v1 records remain readable without rewriting storage.
3. Connect the Canvas editor with objective controls and menu entry, then campaign-only battle/result orchestration and dialogue playback; enable the built-in tutorial map/campaign after readiness and content tests pass.
4. Move the tutorial payload to `definitions/tutorial.json`, add automatic JSON discovery and DEV source-save middleware, and separate built-in source saves from local-copy saves. Preserve all content identities and existing local/replay storage.
5. Add campaign file import/export and collision-safe local imports, then verify DEV and production permissions, native file cleanup and error handling.
6. Validate specs, Vitest, typecheck, Biome, and build; smoke-test existing standalone/multiplayer/replay paths and the new file workflows in DEV and a served production build. `npm run simulate` is required when simulation behavior changes.
7. Rollback hides the campaign entry and disables controller wiring. Preserve campaign source JSON, local storage data and exported files; existing v2 replays require the dual-version reader, so rollback to an older reader requires backing up records first.
