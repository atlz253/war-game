# Spec Delta

## MODIFIED Requirements

### Requirement: Pending quick match continuity
The system SHALL preserve pending commander choices and selected map during navigation between the main menu, QUICK MATCH, MULTIPLAYER, SETTINGS, and the settings and multiplayer child screens. Settings returns SHALL refresh saved LM Studio connections without resetting commander choices. Navigation data SHALL remain session-local and SHALL NOT create or modify a player match. The isolated menu background demonstration SHALL continue independently of pending setup.

#### Scenario: Settings round trip
- **WHEN** a player chooses commanders and a map, returns to the main menu, edits LM Studio settings or selects a language through SETTINGS, and reopens QUICK MATCH
- **THEN** the same commanders and map remain selected
- **AND** model indicators, launch availability, and labels reflect current saved settings and language

#### Scenario: Multiplayer round trip
- **WHEN** a player leaves pending QUICK MATCH setup to visit MULTIPLAYER and returns without starting a multiplayer match
- **THEN** reopening QUICK MATCH restores the pending commanders and map

#### Scenario: Background battle independence
- **WHEN** the player changes pending commanders or the selected map while the background battle runs
- **THEN** those choices affect only future player matches
- **AND** the existing background battle continues with its own generated map and Heuristic commanders
