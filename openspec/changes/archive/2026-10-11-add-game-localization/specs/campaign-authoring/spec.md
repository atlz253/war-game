## MODIFIED Requirements

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

## ADDED Requirements

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
