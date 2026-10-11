# game-localization Specification

## Purpose

Allow players to choose a game language with English fallback and allow developers to maintain file-backed translation dictionaries through Canvas controls.

## Requirements

### Requirement: Discovered language dictionaries
The system SHALL discover languages from versioned JSON files under `src/game/localization/locales/<id>.json` without manual registry edits. Each file SHALL contain a unique filename-safe ID, display name, and string dictionary. English (`en`) SHALL supply the canonical key set. Partial non-English dictionaries SHALL be valid.

#### Scenario: Add a dictionary file
- **WHEN** a valid language file is added and the catalog is refreshed or rebuilt
- **THEN** the language appears in the selector without editing source registration

#### Scenario: Invalid language data
- **WHEN** a non-English file has invalid JSON/schema, a mismatched filename/ID, duplicate ID, unknown keys, or incompatible placeholders
- **THEN** the file is rejected with a filename-specific diagnostic and English remains usable
- **AND** invalid or missing English fails catalog validation and production build

### Requirement: Preferred language selection
The main menu SHALL expose a Canvas language selector showing language display names. Selection SHALL apply immediately to the selector and returning menu and persist across reloads. English SHALL be the default for missing, corrupt, or unavailable preferences. Language selection SHALL preserve pending match configuration.

#### Scenario: Select and reload
- **WHEN** the player selects an available language, returns to the menu, and reloads
- **THEN** the selector and menu use that language and previously configured commanders/maps are preserved during navigation

#### Scenario: Unavailable preference storage
- **WHEN** saving the preferred language fails
- **THEN** the interface reports failure and the chosen language remains active for the current session

#### Scenario: Removed language pack
- **WHEN** the stored language ID is no longer in the catalog
- **THEN** the interface uses English without blocking play

### Requirement: Per-string English fallback
Application-owned visible interface text SHALL resolve by canonical key from the preferred language and then English. Missing or whitespace-only translations SHALL fall back individually. Named parameters SHALL be preserved and interpolated in the resolved template. Production text references SHALL have an English entry.

#### Scenario: Partial translation
- **WHEN** the selected language translates the start button but omits instructions
- **THEN** the button uses the translation and instructions use English without changing the language preference

#### Scenario: Parameterized text
- **WHEN** a translated status string is displayed with a turn number and player name
- **THEN** its translated template displays the supplied values without changing the underlying data

### Requirement: Complete interface coverage and Canvas presentation
Menus, settings, battle HUD/pause/results, multiplayer, map/campaign editors, and replay controls SHALL use translation keys for application-owned labels, instructions, and errors. Authored names and external diagnostics SHALL remain verbatim. Controls SHALL stay inside Canvas with readable wrapping/scrolling and consumed pointer input. Local language choices SHALL NOT alter core state, actions, scores, AI, or network protocol.

#### Scenario: Long translations
- **WHEN** long Unicode translations are shown in settings, an editor, or a battle modal
- **THEN** text and controls remain accessible at supported viewport sizes and clicks do not reach the board

#### Scenario: Independent multiplayer preferences
- **WHEN** two peers choose different interface languages
- **THEN** each sees its own language while equal accepted action sequences produce equal match state

### Requirement: DEV language authoring
In DEV, the language menu SHALL allow creating a language, editing its display name, and editing values for English keys through Canvas text controls. Renaming SHALL preserve ID, filename, preferences, and campaign links. Only the English editor SHALL add a new unique key with nonempty English text. Unsaved changes SHALL offer save/discard/cancel before leaving.

#### Scenario: Create and rename
- **WHEN** a developer creates a unique language and later changes its display name
- **THEN** it retains its ID and existing links and its updated name appears after saving

#### Scenario: Add a canonical string
- **WHEN** a developer adds a unique key and English text while editing English
- **THEN** every other language can edit that key and falls back until translated
- **AND** duplicate or empty keys are rejected without losing the draft

#### Scenario: Non-English key creation
- **WHEN** a developer edits a non-English language or submits a save containing noncanonical keys
- **THEN** key creation is unavailable and the invalid save is rejected

### Requirement: Filesystem persistence and production isolation
DEV language saves SHALL create or atomically update canonical JSON in the fixed locale directory through a validated, bounded source-write API. Failed saves SHALL preserve source and draft. Successful saves SHALL refresh the catalog without discarding newer unsaved edits. Production SHALL offer selection only, reject authoring entry, and expose no locale source-write API.

#### Scenario: Save and restart
- **WHEN** a developer saves a locale and restarts the development server
- **THEN** its name and dictionary are loaded from the saved project file

#### Scenario: Unsafe or failed write
- **WHEN** a request uses an unsafe ID, duplicates an existing create ID, exceeds the request limit, or filesystem replacement fails
- **THEN** no existing dictionary is overwritten and the editor reports failure with its draft intact

#### Scenario: Edit during save
- **WHEN** a draft changes after its save snapshot was submitted
- **THEN** only that snapshot is marked saved and newer edits remain dirty after catalog refresh

#### Scenario: Production authoring guard
- **WHEN** a production user navigates directly to language authoring or sends a source-write request
- **THEN** authoring is rejected and no project file is written
