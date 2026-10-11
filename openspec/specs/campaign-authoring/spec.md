# campaign-authoring Specification

## Purpose

Allow players to create and store campaigns as ordered sets of missions on built-in maps, editing their settings and dialogue events through the game interface.

## Requirements

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
The system SHALL include a playable tutorial campaign with its first mission and map available without authoring or importing content. The built-in campaign SHALL remain available independently of local storage contents and failures. In DEV, authors SHALL be able to open its definition in the editor and use SAVE to save an editable local campaign without modifying the built-in original. Direct built-in source editing SHALL follow the DEV-only requirement below.

#### Scenario: Fresh installation
- **WHEN** the player opens the campaign library with no saved campaigns
- **THEN** the tutorial campaign is listed and can be started immediately

#### Scenario: Edit tutorial copy
- **WHEN** the author opens the built-in tutorial in DEV and chooses SAVE
- **THEN** a local copy is saved and the original tutorial remains unchanged

### Requirement: Built-in campaign JSON catalog
The system SHALL store each built-in campaign as a separate `CampaignDefinition` v2 JSON file under `src/core/campaigns/definitions`, including `tutorial.json`, and SHALL continue reading v1 definitions as English-only content. The catalog SHALL discover these files automatically, validate supported structure and unique campaign IDs, return independent definitions in deterministic ID order, and remain independent of browser storage. Built-in content SHALL NOT be duplicated as hardcoded TypeScript campaign payloads. Launch readiness SHALL still validate map references and mission fields separately from structural validity.

#### Scenario: Discover source definition
- **WHEN** a supported campaign JSON file is added to the definitions directory and the catalog is rebuilt or refreshed
- **THEN** the campaign appears without adding a hardcoded registry entry

#### Scenario: Invalid source data
- **WHEN** a source definition has an unsupported version, invalid structure, or a duplicate campaign ID
- **THEN** catalog validation reports the source error rather than silently accepting or overwriting the definition

#### Scenario: Independent catalog results
- **WHEN** a caller changes a returned campaign draft
- **THEN** later catalog reads retain the source JSON content

#### Scenario: Legacy English definition
- **WHEN** the catalog loads a v1 campaign
- **THEN** its English content and ordering are retained with deterministic line identities and no translations

### Requirement: DEV-only built-in campaign editing
The system SHALL permit opening and editing built-in campaign definitions only when `import.meta.env.DEV` is true. The editor SHALL expose SAVE for local storage and BUILT IN SAVE for project JSON persistence; BUILT IN SAVE SHALL be available only in DEV, including for new and local campaigns. SAVE AS COPY SHALL be removed. BUILT IN SAVE SHALL preserve the current campaign ID and create or update its canonical `<id>.json` through a development-server API without changing local storage entries. Production SHALL retain built-in play/export and local campaign editing, but SHALL reject direct editor entry for a built-in campaign and SHALL NOT provide a source-writing endpoint. Editor origin SHALL distinguish local and built-in entries even if their IDs match after a deliberate source save. Source writes SHALL validate structure, use a filename-safe ID, stay within the definitions directory, and report failures without clearing the draft or reporting success. Successful writes SHALL be reflected by the refreshed catalog.

#### Scenario: Save built-in source in DEV
- **WHEN** an author edits a built-in campaign in DEV and chooses BUILT IN SAVE
- **THEN** its source JSON is updated and the refreshed catalog contains the saved content with the same campaign ID

#### Scenario: Save a new or local campaign as built-in
- **WHEN** an author chooses BUILT IN SAVE for a new or local draft in DEV
- **THEN** the project file for its current campaign ID is created or updated and becomes available in the refreshed built-in catalog
- **AND** existing local storage entries remain unchanged

#### Scenario: Separate local entry remains editable
- **WHEN** a local campaign has been saved as a built-in with the same ID and is later opened from the local library in production
- **THEN** local editing and SAVE remain available, while BUILT IN SAVE is unavailable and direct built-in editing remains rejected

#### Scenario: Production editing guard
- **WHEN** a production user attempts to open a built-in campaign editor, including direct scene entry
- **THEN** editing is rejected while playing and exporting that campaign remain available

#### Scenario: Source write failure
- **WHEN** a DEV save is rejected or the development server cannot write the file
- **THEN** the editor reports failure, keeps the unsaved draft editable, and does not mark it saved

### Requirement: Explicit local campaign saving
SAVE SHALL always persist the current draft in the local campaign library in DEV and production, without writing project files. On the first SAVE of a built-in draft, the system SHALL allocate a separate local campaign ID without colliding with either catalog, preserve mission/event IDs, order, bindings and content, and continue editing that local copy. Subsequent SAVE operations SHALL update the same local entry rather than create additional copies. SAVE AND LEAVE SHALL use the same local save behavior and leave only after successful persistence with no newer unsaved edits. Both save destinations SHALL mark only the successfully persisted snapshot as saved; edits made while a save is pending SHALL remain unsaved. Storage failures SHALL preserve the draft and existing entries, report an error, and prevent save-and-leave navigation.

#### Scenario: Repeated local save of a built-in copy
- **WHEN** an author saves a built-in draft with SAVE, changes the resulting local copy and chooses SAVE again
- **THEN** one separate local entry contains the latest changes and the original built-in source remains unchanged

#### Scenario: Save and leave uses local storage
- **WHEN** an author chooses SAVE AND LEAVE for a dirty built-in draft in DEV
- **THEN** a separate local copy is saved before navigation and no project file is written

#### Scenario: Local save failure or newer edits
- **WHEN** local persistence fails or the draft changes after the submitted save snapshot
- **THEN** the error or newer changes remain visible and save-and-leave does not discard the unsaved draft

### Requirement: Campaign JSON import and export
The system SHALL provide Canvas import/export controls in DEV and production. Each exported `.ai-war-campaign.json` file SHALL contain one `CampaignDefinition` v2, without a library envelope, run progress or replay data. Export SHALL preserve mission/event/line identities, order, policies, bindings, complete Unicode English dialogue content and translation dictionaries; the library SHALL export selected built-in or local definitions, and the editor SHALL support exporting its current draft. Import SHALL accept v1 and v2, treating v1 as English-only, and create a local campaign, including when the file originated from a built-in campaign, resolving campaign ID collisions against both built-in and local entries without overwriting either. Mission/event/line IDs and references SHALL be preserved after legacy normalization. Structurally valid incomplete drafts or missing-map references SHALL remain editable but SHALL fail Play readiness. Malformed or unsupported files SHALL be rejected with a visible error and without changing stored campaigns or the current draft.

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

#### Scenario: Portable translations
- **WHEN** an author imports and reexports a translated v2 campaign on a machine missing one of its game language packs
- **THEN** line IDs and all translation dictionaries remain intact and the missing pack is reported without invalidating English play

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

### Requirement: Campaign dialogue language editing
The campaign editor SHALL initially author dialogues in English and allow adding a translation linked to an existing non-English game locale ID. It SHALL edit translated speaker/text for existing lines through Canvas controls, show English source and fallback status, and retain partial translations. Line creation and structural editing SHALL be available only in English. Duplicate locale links SHALL be rejected.

#### Scenario: Add a dialogue localization
- **WHEN** an author chooses an installed game language for a dialogue
- **THEN** a dictionary linked to that stable language ID is added and its values can be edited without changing the English source or trigger

#### Scenario: Rename game language
- **WHEN** a linked game language's display name changes
- **THEN** the campaign editor shows its new name and existing translations remain linked by the same ID

#### Scenario: Incomplete translation
- **WHEN** an author leaves some speaker or text translations blank
- **THEN** the campaign remains playable if its English source is ready and missing translations are shown as English fallback

### Requirement: Translation persistence and compatible drafts
Campaign saves SHALL write v2 payloads including line identities and translations through existing local or DEV source destinations. Readers SHALL accept v1 drafts without eager destructive rewriting. Local copying SHALL preserve translation links. Unknown locale IDs SHALL be retained with warnings and remain editable; invalid line references, duplicate line IDs, or nonstring translation values SHALL be rejected.

#### Scenario: Save translated local copy
- **WHEN** an author uses SAVE on a translated built-in draft in DEV and reopens the resulting local copy
- **THEN** the original source remains unchanged and the copy retains all translations and line identities

#### Scenario: Source save
- **WHEN** an author uses BUILT IN SAVE on a translated draft in DEV
- **THEN** its canonical campaign JSON contains the translations and the local library remains unchanged

#### Scenario: Reopen legacy storage
- **WHEN** the library reads a saved v1 campaign
- **THEN** it exposes an editable English-only draft with stable normalized line IDs without overwriting the original storage until explicit save

#### Scenario: Invalid translation structure
- **WHEN** a campaign contains translations for nonexistent lines, duplicate line IDs, or nonstring values
- **THEN** loading or saving reports a structural error and preserves existing storage and the current draft
