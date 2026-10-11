# mission-dialogue-events Specification

## Purpose

Allow authors to bind linear character dialogues to mission events and play them in a stable order without affecting the combat simulation.

## Requirements

### Requirement: Dialogue authoring
Each dialogue event SHALL have a stable identity, one trigger and an ordered nonempty list of lines. Each line SHALL have a stable event-local identity and contain a nonempty English speaker name and text. The editor SHALL support adding, editing, removing and reordering events and lines in English, and editing translations for existing lines. Reordering SHALL preserve translations by line identity; removing a line SHALL remove its translations. Dialogue SHALL have no branching, gameplay choices or required portrait.

#### Scenario: Multiple speakers
- **WHEN** an author saves a valid dialogue containing lines from two named characters
- **THEN** runtime displays their names and texts in authored order

#### Scenario: Reorder translated lines
- **WHEN** an author moves an English line within its event
- **THEN** all translations stay attached to that line and follow its new position

#### Scenario: Add and delete English lines
- **WHEN** an author adds a line and removes another line in English
- **THEN** the new line receives a unique stable ID and initially uses English fallback in other languages
- **AND** the removed line's translation entries are removed

### Requirement: First tutorial dialogue sequence
The first built-in tutorial mission SHALL use ordinary one-shot dialogue events: mission-start explains selecting a unit; first selection explains moving it; first accepted movement explains movement points, ending the turn and the far-edge goal; mission-end congratulates the player. Instructions SHALL match actual controls and SHALL NOT teach combat or capture in this lesson.

#### Scenario: Learn by selecting and moving
- **WHEN** the player starts the lesson, selects either Blue unit and performs its first accepted movement
- **THEN** introduction, selection instruction and movement instruction appear in that order without duplicates

#### Scenario: Finish movement lesson
- **WHEN** an eligible unit arrives at the goal
- **THEN** the congratulatory mission-end dialogue follows movement completion and precedes the victory result

### Requirement: Lifecycle triggers
The system SHALL support mission-start and mission-end triggers. Start dialogue SHALL precede the first order or AI decision. End dialogue SHALL trigger on either victory or defeat once a match winner exists, after final action presentation and before result navigation.

#### Scenario: Start before gameplay
- **WHEN** a mission starts with a start dialogue
- **THEN** the first order or AI decision waits until that dialogue closes

#### Scenario: End on defeat
- **WHEN** Red wins the mission
- **THEN** mission-end dialogue displays before the defeat result

### Requirement: Turn number trigger
The system SHALL support a positive integer turn trigger using the game's displayed turn counter. It SHALL check the initial turn and each accepted side transition. Turn one SHALL follow mission-start processing; the counter SHALL advance on each side change, not after a full Blue/Red round.

#### Scenario: Second turn
- **WHEN** the first accepted end-turn action changes the counter from one to two
- **THEN** turn-two dialogue triggers before the new side issues orders

#### Scenario: Initial turn
- **WHEN** mission-start and turn-one dialogues are authored
- **THEN** mission-start dialogues precede turn-one dialogues

### Requirement: Movement triggers
The system SHALL support accepted unit movement and accepted movement ending at an exact cell. Each trigger SHALL target either any unit or a specific valid initial-map unit. Human and AI moves SHALL both qualify. Intermediate animated cells, rejected moves and units already standing on a target cell SHALL NOT qualify as arrival.

#### Scenario: Destination matches
- **WHEN** a targeted unit's accepted move ends at the authored cell
- **THEN** its arrival dialogue is queued after movement presentation finishes

#### Scenario: Crossing the cell
- **WHEN** an accepted path crosses the target cell but ends elsewhere
- **THEN** the arrival dialogue does not trigger

#### Scenario: AI movement and rejected movement
- **WHEN** an AI performs a matching accepted move
- **THEN** the movement dialogue triggers just as it does for a human move
- **AND** rejected movement produces no dialogue

### Requirement: Selection trigger
The system SHALL support a trigger targeting any selectable unit or a specific initial-map unit. Only a human selection change to a valid selectable unit SHALL qualify. Reclicking the selected unit, deselection, rejected input and AI decisions SHALL NOT qualify. Selection SHALL remain presentation state and SHALL NOT become a battle order.

#### Scenario: Select and reselect
- **WHEN** the player selects a matching unit and clicks it again
- **THEN** the initial change qualifies and the second click generates no new occurrence

### Requirement: Once per attempt and ordered occurrences
Each event SHALL fire at most once per mission attempt. Matching events for one signal SHALL queue in authored order. Signals SHALL be processed in accepted gameplay order; mission-start SHALL precede initial-turn, and mission-end SHALL follow final-action signals. Fired identities SHALL reset on retry.

#### Scenario: Two matching movement dialogues
- **WHEN** one move matches both a movement event and an arrival event
- **THEN** they display in their authored event order without overlap or duplicate firing

#### Scenario: Retry resets occurrences
- **WHEN** the player retries a mission with previously fired events
- **THEN** those events can fire once again in the new attempt

### Requirement: Modal dialogue presentation
Dialogue SHALL show speaker and text in a Canvas modal with explicit next/close controls and readable wrapped text. While dialogue is queued or open, battle orders and further AI scheduling SHALL wait. Its pointer and keyboard input SHALL NOT reach the board. Pause SHALL preserve dialogue position; scene exit SHALL cancel pending dialogue callbacks.

#### Scenario: Last line closes
- **WHEN** the player advances past the last line and no dialogue remains
- **THEN** the appropriate gameplay or result transition resumes once

#### Scenario: Pause and exit
- **WHEN** a player pauses a dialogue, resumes, then exits the mission
- **THEN** resume retains the same line and exit prevents stale callbacks from submitting orders or opening results

### Requirement: Replay dialogue history
Completed campaign mission records SHALL snapshot dialogue definitions, translations, the selected narrative language ID, and ordered occurrences, including selection-triggered occurrences positioned between accepted actions. Playback SHALL use that record without live campaign or locale content, live selection triggers, AI or network inference. Older action-only and English narrative records SHALL remain readable; legacy narrative defaults to English.

#### Scenario: Selection between actions
- **WHEN** a mission records a selection dialogue between its first and second accepted actions
- **THEN** forward replay shows that dialogue at the same boundary even if the campaign is edited later

#### Scenario: Seek and replay
- **WHEN** replay seeks backward or to a nonadjacent frame while dialogue is open
- **THEN** the modal and stale callbacks are canceled and the target frame renders immediately
- **AND** subsequent forward traversal shows recorded occurrences for the traversed boundary in their stored order

#### Scenario: Translation changes after recording
- **WHEN** source translations change or their language pack is removed after a translated mission is recorded
- **THEN** replay dialogue retains the recorded language and text with English fallback from its snapshot
- **AND** replay controls use the viewer's current interface language

### Requirement: Presentation-independent battle results
Dialogue display, selection and advancement SHALL NOT mutate combat state, consume a turn or change scores, legal actions or match results. Pure event matching SHALL be headless-capable and deterministic given identical definitions and input signals.

#### Scenario: Equal accepted actions
- **WHEN** the same map and accepted actions run with different dialogue reading times or without Canvas presentation
- **THEN** combat state, score and outcome are identical

### Requirement: Localized dialogue presentation
Dialogue speaker and text SHALL resolve independently from the snapshotted language translations by line identity, falling back to the English source for absent or whitespace-only fields. Translation SHALL preserve event triggers, line order, modal input barriers, pause position, and deterministic results.

#### Scenario: Partial dialogue translation
- **WHEN** the selected language has translated text but no translated speaker for a line
- **THEN** the dialogue displays translated text with the English speaker

#### Scenario: Missing dialogue locale
- **WHEN** no dictionary exists for the selected language in the campaign
- **THEN** all dialogue lines display their English source in the same event order
