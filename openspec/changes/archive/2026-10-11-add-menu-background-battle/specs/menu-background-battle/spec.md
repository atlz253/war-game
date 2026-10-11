# Spec Delta

## Purpose

Provide a continuous autonomous battle behind menu navigation, with generated offscreen deployments and endless reinforcement waves isolated from player matches.

## ADDED Requirements

### Requirement: Generated offscreen battlefield
On first menu entry after application load, the system SHALL generate a battlefield wider than its visible viewport and randomized forces for both sides. Blue SHALL deploy beyond the visible left edge and Red beyond the visible right edge, within valid map cells. The map SHALL provide traversable routes into the visible combat area.

#### Scenario: Initial deployment
- **WHEN** the menu background session is first created
- **THEN** a generated map extends beyond both horizontal edges of the visible area
- **AND** each team has randomized units in valid, distinct, initially invisible deployment cells on its own side
- **AND** both teams can advance into the visible area

### Requirement: Autonomous heuristic combat
Both sides SHALL be controlled by local Heuristic AI. Every order SHALL use the shared public game action validation and application rules. The background SHALL require no player input, remote inference, or multiplayer connection.

#### Scenario: Battle advances behind the menu
- **WHEN** any supported menu screen remains open
- **THEN** both sides take legal turns and their movements, attacks, and destruction are presented behind the foreground menu
- **AND** no LM Studio requests or P2P messages are initiated by the demonstration

### Requirement: Infinite demonstration ammunition
Background units SHALL have infinite ammunition: accepted attacks and counterattacks SHALL NOT consume ammunition or become unavailable through ammunition exhaustion. This rule SHALL apply only to the menu demonstration.

#### Scenario: Sustained attacks
- **WHEN** a background unit attacks and counterattacks more times than its normal ammunition capacity
- **THEN** its ammunition remains available and otherwise legal attacks continue

#### Scenario: Ordinary match ammunition
- **WHEN** the same unit type attacks in a player match
- **THEN** ordinary ammunition consumption, empty-ammunition validation, and resupply rules still apply

### Requirement: Endless reinforcement waves
When an action eliminates all units of one team, the system SHALL generate a randomized reinforcement wave for that team beyond its original side's visible boundary. The same map, surviving units, and accumulated combat state SHALL continue. The demonstration SHALL NOT enter a terminal winner state or open a result screen.

#### Scenario: Blue or Red is eliminated
- **WHEN** an attack or counterattack destroys the last unit of either team
- **THEN** a nonempty replacement wave appears only in valid unoccupied offscreen cells on that team's original side
- **AND** surviving units retain their identities, positions, health, and turn status
- **AND** the map and turn progression continue without a result screen

#### Scenario: Repeated eliminations
- **WHEN** elimination and reinforcement occur repeatedly
- **THEN** each eliminated side receives another wave with unique unit identities
- **AND** removed units and obsolete presentation objects do not accumulate

### Requirement: Continuous menu session
One background session SHALL keep progressing across the main menu, QUICK MATCH, MULTIPLAYER, SETTINGS, LM Studio settings, language selection/authoring, host/join setup, and campaign/replay libraries. Foreground navigation SHALL NOT regenerate its map, reset its seed or units, or restart its action sequence.

#### Scenario: Settings round trip
- **WHEN** the player moves from the main menu to SETTINGS, opens LANGUAGE or LM Studio settings, and returns
- **THEN** the same battle continues throughout the navigation
- **AND** its state reflects actions taken while those screens were open

#### Scenario: Other menu destinations
- **WHEN** the player visits quick match, multiplayer setup, or a campaign/replay library and returns without starting another activity
- **THEN** the existing background battle remains active without a second session being created

### Requirement: Activity suspension and isolation
The demonstration SHALL be hidden and suspended during player gameplay, result screens, map/campaign editing, and replay playback. Returning to a supported menu SHALL resume the retained session. Application reload SHALL create a new session. Background combat SHALL NOT modify player setup, campaign progress, saved maps, replay records, or player-match state.

#### Scenario: Start and leave a match
- **WHEN** a player starts a real match from a menu and later returns
- **THEN** the background stops advancing during that activity and resumes its previous session on return
- **AND** the real match uses only its selected map and participant configuration

#### Scenario: Replay and editor isolation
- **WHEN** the player opens replay playback or an editor
- **THEN** the background session is suspended and produces no saved replay, map changes, or campaign progress

### Requirement: Responsive noninteractive presentation
The background SHALL remain Canvas-rendered, visible behind readable foreground controls, and unable to accept board orders, camera input, or selection. Resizing SHALL preserve battle state and keep deployment regions outside the visible viewport. Movement SHALL follow accepted routes and current local movement speed. Scheduling and presentation resources SHALL remain bounded during long sessions.

#### Scenario: Click and adjust settings
- **WHEN** a player clicks menu controls or adjusts the speed slider while combat continues
- **THEN** only foreground controls respond to input
- **AND** the new speed applies to subsequent background movement without changing authoritative action outcomes

#### Scenario: Resize during battle
- **WHEN** the viewport changes size or aspect ratio during a move
- **THEN** the existing map and units are preserved, foreground controls remain reachable, and the camera keeps both deployment strips offscreen

#### Scenario: Long running or hidden application
- **WHEN** the menu runs for many waves or the application loses and regains visibility
- **THEN** action processing yields between bounded steps and does not build an unbounded catch-up queue
- **AND** transitions, timers, and listeners remain bounded and are released when the session is disposed

### Requirement: Deterministic demonstration rules
Given the same generation seed, configuration, and accepted action sequence, map generation, wave composition, placements, combat state, and scores SHALL be identical in headless execution. Foreground navigation and animation speed SHALL NOT alter rule results.

#### Scenario: Replay reinforcement sequence headlessly
- **WHEN** the same seeded demonstration and accepted actions are executed twice, including elimination waves
- **THEN** both executions produce identical states and reinforcement identities without Canvas, browser storage, or network dependencies
