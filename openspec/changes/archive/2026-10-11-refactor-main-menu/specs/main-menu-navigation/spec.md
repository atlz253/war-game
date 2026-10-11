# Spec Delta

## Purpose

Provide a clear entry point for game activities and settings through ordered navigation and focused submenus while retaining pending quick match setup.

## ADDED Requirements

### Requirement: Main menu entry points
The main menu SHALL show AI WAR GAME above exactly six navigation buttons in this order: CAMPAIGNS, QUICK MATCH, MULTIPLAYER, REPLAYS, MAP EDITOR, SETTINGS. Match setup, host/join controls, and individual settings controls SHALL appear only in their respective submenus. These labels SHALL be the English defaults.

#### Scenario: Initial menu
- **WHEN** the game opens its main menu
- **THEN** the title and six buttons appear in the specified order
- **AND** commander selectors, map selection, START MATCH, HOST P2P, JOIN P2P, movement speed, LM Studio settings, and language controls are absent from that screen

### Requirement: Existing direct destinations
CAMPAIGNS, REPLAYS, and MAP EDITOR SHALL retain their existing destinations and behavior. MAP EDITOR SHALL retain the existing pending selected-map context and commander configuration when opened.

#### Scenario: Open libraries
- **WHEN** the player selects CAMPAIGNS or REPLAYS
- **THEN** the existing campaign library or replay library opens respectively

#### Scenario: Open editor for pending map
- **WHEN** the player selects a map in QUICK MATCH, returns to the main menu, and selects MAP EDITOR
- **THEN** the editor opens that map with its existing source and pending commander configuration

### Requirement: Quick match submenu
QUICK MATCH SHALL provide BLUE COMMANDER and RED COMMANDER selection, existing model indicators, map selection, START MATCH, and a button returning to the main menu. Ready setup SHALL show "Choose commanders and a map, then start the match". Existing commander choices, map cycling, launch validation, and unavailable-setup feedback SHALL be preserved.

#### Scenario: Start ready match
- **WHEN** the player chooses commanders and a valid standalone map and selects START MATCH
- **THEN** the match starts with those commanders, the selected map, and the current saved LM Studio configuration snapshot

#### Scenario: Setup unavailable
- **WHEN** there are no maps, the selected map is not ready for a standalone match, or a selected LM Studio commander lacks required configuration
- **THEN** START MATCH is disabled and the existing applicable explanation is displayed

#### Scenario: Leave without starting
- **WHEN** the player selects the return button in QUICK MATCH
- **THEN** the main menu opens without starting a match

### Requirement: Multiplayer submenu
MULTIPLAYER SHALL provide HOST P2P, JOIN P2P, and a button returning to the main menu. Host and join SHALL open their existing workflows. Leaving either workflow through its existing back or cancel action SHALL return to MULTIPLAYER after existing connection cleanup.

#### Scenario: Host or join
- **WHEN** the player selects HOST P2P or JOIN P2P in MULTIPLAYER
- **THEN** the corresponding existing host or join screen opens

#### Scenario: Return from multiplayer
- **WHEN** the player leaves host/join setup and then selects the MULTIPLAYER return button
- **THEN** host/join setup returns to MULTIPLAYER and the submenu returns to the main menu
- **AND** abandoned connections are cleaned up and pending quick match selections remain available without being reused as multiplayer configuration

### Requirement: Settings submenu
SETTINGS SHALL show a movement settings section with an inline speed slider, LM STUDIO SETTINGS and LANGUAGE buttons, and a button returning to the main menu. There SHALL be no separate movement settings screen in this navigation flow. The slider SHALL retain the existing speed range, duration label, default, persistence, and session fallback behavior.

#### Scenario: Adjust speed directly
- **WHEN** the player opens SETTINGS and adjusts movement speed
- **THEN** the slider is available on that screen without another navigation step
- **AND** the saved choice applies to future movements and is restored after reload

#### Scenario: Return from settings children
- **WHEN** the player completes or leaves LM Studio settings or returns from LANGUAGE
- **THEN** SETTINGS opens with current saved values and current interface language
- **AND** the existing LM Studio validation and language authoring safeguards remain effective

#### Scenario: Return to main menu
- **WHEN** the player selects the return button in SETTINGS
- **THEN** the main menu opens

### Requirement: Pending quick match continuity
The system SHALL preserve pending commander choices and selected map during navigation between the main menu, QUICK MATCH, MULTIPLAYER, SETTINGS, and the settings and multiplayer child screens. Settings returns SHALL refresh saved LM Studio connections without resetting commander choices. Navigation data SHALL remain session-local and SHALL NOT create or modify a match.

#### Scenario: Settings round trip
- **WHEN** a player chooses commanders and a map, returns to the main menu, edits LM Studio settings or selects a language through SETTINGS, and reopens QUICK MATCH
- **THEN** the same commanders and map remain selected
- **AND** model indicators, launch availability, and labels reflect current saved settings and language

#### Scenario: Multiplayer round trip
- **WHEN** a player leaves pending QUICK MATCH setup to visit MULTIPLAYER and returns without starting a multiplayer match
- **THEN** reopening QUICK MATCH restores the pending commanders and map

### Requirement: Canvas submenu presentation and lifecycle
All navigation and submenu controls SHALL remain inside Canvas, use localized text with per-string English fallback, and stay readable and reachable at supported viewport sizes. Only the active menu screen SHALL accept input. Leaving SETTINGS SHALL release slider drag and keyboard focus so input on another screen cannot alter movement speed.

#### Scenario: Localized resized menu
- **WHEN** a player uses a partial locale or long Unicode labels and resizes the game
- **THEN** missing translations fall back to English and all active menu controls remain reachable
- **AND** clicks activate only their intended control

#### Scenario: Leave focused slider
- **WHEN** a player focuses or drags the SETTINGS slider, leaves SETTINGS, and uses pointer or arrow-key input elsewhere
- **THEN** movement speed does not change from stale slider input
- **AND** repeated submenu visits do not accumulate active input or resize handlers
