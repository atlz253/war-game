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
The system SHALL include a playable tutorial campaign with its first mission and map available without authoring or importing content. The built-in campaign SHALL remain available independently of local storage contents and failures. Authors SHALL be able to open its definition in the editor and save an editable local copy without modifying the built-in original.

#### Scenario: Fresh installation
- **WHEN** the player opens the campaign library with no saved campaigns
- **THEN** the tutorial campaign is listed and can be started immediately

#### Scenario: Edit tutorial copy
- **WHEN** the author saves changes to an opened built-in tutorial
- **THEN** a local copy is saved and the original tutorial remains unchanged

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
