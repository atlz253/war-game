# Campaign Authoring Spec Delta

## Purpose

Allow players to create and store campaigns as ordered sets of missions on built-in maps, editing their settings and dialogue events through the game interface.

## ADDED Requirements

### Requirement: Local campaign library
The system SHALL provide a Canvas campaign library accessible from the main menu, with create, open, rename, save and delete operations. Saved campaigns SHALL use a versioned format and survive browser reload. Invalid or unavailable storage SHALL produce a visible error without overwriting saved campaigns.

#### Scenario: Save and reopen
- **WHEN** a player creates a campaign, names it, saves it and reloads the browser
- **THEN** the campaign can be reopened with the same ordered missions and dialogue content

#### Scenario: Storage failure
- **WHEN** loading or saving encounters corrupt data or unavailable storage
- **THEN** the interface reports the failure, keeps the current draft editable and does not replace stored data with an empty library

### Requirement: Ordered mission editing
The editor SHALL allow adding, naming, removing and reordering missions with stable mission identities. Each mission SHALL reference one built-in map, contain a victory policy, standard defeat conditions and an ordered event list. User-library maps SHALL NOT be offered in this version.

#### Scenario: Reorder missions
- **WHEN** a player moves a mission before another mission and saves
- **THEN** subsequent campaign play follows the new order and each mission retains its events and map

#### Scenario: Standard conditions
- **WHEN** a player opens mission settings
- **THEN** the editor offers standard victory or standard victory plus a reach-cell objective, with standard defeat unchanged

### Requirement: Reach-cell objective editing
The editor SHALL allow configuring an exact target cell and either any Blue unit or a specific initial Blue unit for reach-cell victory. It SHALL validate map binding, bounds, passability for the selected unit and existence of a legal terrain route from at least one eligible starting unit. Map changes SHALL invalidate unconfirmed objective bindings.

#### Scenario: Configure objective
- **WHEN** an author selects a target cell and an eligible Blue unit on the map preview
- **THEN** saving and reopening retains that objective and the preview identifies the target

#### Scenario: Invalid objective
- **WHEN** the target is out of bounds, permanently impassable or has no terrain route from an eligible unit, or the specific unit is missing or Red
- **THEN** play is blocked with a mission objective error while the draft remains editable

#### Scenario: Change objective map
- **WHEN** the author changes the mission map
- **THEN** the target and unit binding require explicit confirmation or correction before play

### Requirement: Built-in tutorial campaign availability
The system SHALL include a playable tutorial campaign with its first mission and map available without authoring or importing content. The built-in campaign SHALL remain available independently of local storage contents and failures. In DEV, authors SHALL be able to open its definition in the editor and use SAVE AS COPY to save an editable local campaign without modifying the built-in original. Direct built-in source editing SHALL follow the DEV-only requirement below.

#### Scenario: Fresh installation
- **WHEN** the player opens the campaign library with no saved campaigns
- **THEN** the tutorial campaign is listed and can be started immediately

#### Scenario: Edit tutorial copy
- **WHEN** the author opens the built-in tutorial in DEV and chooses SAVE AS COPY
- **THEN** a local copy is saved and the original tutorial remains unchanged

### Requirement: Built-in campaign JSON catalog
The system SHALL store each built-in campaign as a separate `CampaignDefinition` v1 JSON file under `src/core/campaigns/definitions`, including `tutorial.json`. The catalog SHALL discover these files automatically, validate supported structure and unique campaign IDs, return independent definitions in deterministic ID order, and remain independent of browser storage. Built-in content SHALL NOT be duplicated as hardcoded TypeScript campaign payloads. Launch readiness SHALL still validate map references and mission fields separately from structural validity.

#### Scenario: Discover source definition
- **WHEN** a supported campaign JSON file is added to the definitions directory and the catalog is rebuilt or refreshed
- **THEN** the campaign appears without adding a hardcoded registry entry

#### Scenario: Invalid source data
- **WHEN** a source definition has an unsupported version, invalid structure, or a duplicate campaign ID
- **THEN** catalog validation reports the source error rather than silently accepting or overwriting the definition

#### Scenario: Independent catalog results
- **WHEN** a caller changes a returned campaign draft
- **THEN** later catalog reads retain the source JSON content

### Requirement: DEV-only built-in campaign editing
The system SHALL permit opening and editing built-in campaign definitions only when `import.meta.env.DEV` is true. In DEV, SAVE SHALL persist the definition to its source JSON through a development-server API, preserving campaign identity; SAVE AS COPY SHALL instead create a local campaign. Production SHALL retain built-in play/export and local campaign editing, but SHALL reject direct editor entry for a built-in campaign and SHALL NOT provide a source-writing endpoint. Source writes SHALL validate structure, use a filename-safe ID, stay within the definitions directory, and report failures without clearing the draft or reporting success. Successful writes SHALL be reflected by the refreshed catalog.

#### Scenario: Save built-in source in DEV
- **WHEN** an author edits a built-in campaign in DEV and chooses SAVE
- **THEN** its source JSON is updated and the refreshed catalog contains the saved content with the same campaign ID

#### Scenario: Production editing guard
- **WHEN** a production user attempts to open a built-in campaign editor, including direct scene entry
- **THEN** editing is rejected while playing and exporting that campaign remain available

#### Scenario: Source write failure
- **WHEN** a DEV save is rejected or the development server cannot write the file
- **THEN** the editor reports failure, keeps the unsaved draft editable, and does not mark it saved

### Requirement: Campaign JSON import and export
The system SHALL provide Canvas import/export controls in DEV and production. Each exported `.ai-war-campaign.json` file SHALL contain one `CampaignDefinition` v1, without a library envelope, run progress or replay data. Export SHALL preserve mission/event identities, order, policies, bindings, and complete Unicode dialogue content; the library SHALL export selected built-in or local definitions, and the editor SHALL support exporting its current draft. Import SHALL create a local campaign, including when the file originated from a built-in campaign, and resolve campaign ID collisions against both built-in and local entries without overwriting either. Mission/event IDs and references SHALL be preserved. Structurally valid incomplete drafts or missing-map references SHALL remain editable but SHALL fail Play readiness. Malformed or unsupported files SHALL be rejected with a visible error and without changing stored campaigns or the current draft.

#### Scenario: Export and reimport
- **WHEN** an author exports a campaign with ordered missions and multiline dialogue and imports the file
- **THEN** a local campaign retains its content and references, with only its campaign ID changed if needed to avoid a collision

#### Scenario: Import built-in export in production
- **WHEN** a production user imports a file exported from a built-in campaign
- **THEN** a separate editable local campaign is created and the built-in source remains unchanged

#### Scenario: Import incomplete or invalid data
- **WHEN** a structurally valid draft references a missing map or contains empty mission/dialogue lists
- **THEN** it can be imported and edited while Play is disabled with readiness errors
- **AND** malformed JSON or an unsupported schema is rejected without overwriting existing data

#### Scenario: Native file interaction lifecycle
- **WHEN** a Canvas button starts import or export
- **THEN** only a temporary native file picker or download link is created, remains outside visible game UI, and is cleaned up on completion, cancellation or failure
- **AND** canceling file selection leaves the library and current draft unchanged

### Requirement: Validated campaign drafts
The system SHALL permit saving incomplete drafts but SHALL block play unless the campaign has at least one mission and all mission maps, event fields and references are valid. Validation SHALL identify the affected mission or event. Changing a map SHALL revalidate unit and cell references without silently rebinding them.

#### Scenario: Missing built-in map
- **WHEN** a saved campaign references a built-in map that is no longer available
- **THEN** it remains editable and play is blocked with a map reference error

#### Scenario: Changed map references
- **WHEN** changing a mission map invalidates a referenced unit or target cell
- **THEN** the editor preserves the authored event, marks its reference invalid and requires correction before play

#### Scenario: Incomplete draft
- **WHEN** a campaign with no missions or an empty dialogue is saved
- **THEN** the draft can be reopened but cannot start a playthrough until corrected

### Requirement: Canvas authoring controls
All campaign, mission and dialogue editing controls SHALL be rendered inside the game Canvas, including text entry, list scrolling, unit selection and cell selection. Editor interactions SHALL NOT submit battle orders. Unsaved changes SHALL require an explicit save or discard choice before leaving the editor.

#### Scenario: Edit long dialogue
- **WHEN** a player edits a dialogue whose lines exceed the visible panel
- **THEN** scrolling and text editing retain all lines and remain usable within the Canvas

#### Scenario: Leave with unsaved changes
- **WHEN** a player attempts to leave a modified campaign
- **THEN** the Canvas offers save, discard or return to editing before navigation
