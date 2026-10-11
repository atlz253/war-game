# campaign-playthrough Specification

## Purpose

Run campaign missions in their authored order while preserving existing single-match rules and providing clear transitions after victory, defeat, and campaign completion.

## Requirements

### Requirement: Mission match initialization
The system SHALL start each mission attempt from its built-in map with its snapshotted victory policy. The player SHALL control Blue; Red SHALL use Heuristic AI where Red units exist. Each attempt SHALL reset match state and dialogue occurrences, without carrying units, health, scores or resources between missions.

#### Scenario: Start next mission
- **WHEN** the player advances after winning a mission
- **THEN** the next mission starts with its map's initial units and resources, initial scores and untriggered dialogue events

### Requirement: Standard mission outcome
A mission SHALL retain standard victory when combat rules declare Blue the winner and standard defeat when they declare Red the winner. A configured reach-cell objective SHALL additionally permit Blue victory. Captures, score and turn count SHALL NOT independently end a mission. Exiting an unfinished mission SHALL NOT count as completion or fire mission-end dialogue.

#### Scenario: Capture without match victory
- **WHEN** Blue captures a control point but the match has no winner
- **THEN** the mission remains active

#### Scenario: Exit unfinished mission
- **WHEN** the player returns to the menu before the match ends
- **THEN** no next mission unlock or mission-end dialogue occurs

### Requirement: Reach-cell victory
A configured reach-cell objective SHALL award Blue victory only after an accepted move by an eligible Blue unit ends at the exact target cell. Eligible units SHALL be any Blue unit or the configured specific unit. Crossing the cell, rejected moves, selection and initial occupancy SHALL NOT count. The outcome SHALL be deterministic and terminal independently of dialogue or animation.

#### Scenario: Eligible arrival
- **WHEN** an eligible Blue unit completes an accepted move ending at the target while Red units remain
- **THEN** Blue wins, further battle orders are rejected and ending dialogues follow final movement presentation

#### Scenario: No matching arrival
- **WHEN** a move crosses but does not end at the target, is rejected, or is made by an ineligible unit
- **THEN** reach-cell victory does not occur

#### Scenario: Initial occupancy
- **WHEN** a mission starts with an eligible unit already on the target
- **THEN** initial placement does not award reach-cell victory

### Requirement: Opponent-free movement missions
Reach-cell missions SHALL permit a valid map with Blue units and no Red units. Absence of Red units at initialization SHALL NOT award victory. On an empty Red turn the system SHALL automatically end that turn through normal action rules and restore Blue's turn. Standard-match readiness for standalone play SHALL remain unchanged.

#### Scenario: Tutorial turn renewal
- **WHEN** Blue ends its turn in the opponent-free tutorial
- **THEN** an accepted Red end-turn returns control to Blue with normal movement refresh and both transitions are recorded

### Requirement: First tutorial mission
The system SHALL ship the first tutorial mission on a dedicated built-in map without enemies. At least two selectable Blue infantry units SHALL start near one edge. A clearly identified exact target SHALL lie at the opposite edge and be reachable by either unit, requiring multiple moves and at least one movement refresh. Victory SHALL occur when any Blue unit arrives at the target after the short dialogue-led lesson.

#### Scenario: Complete first lesson
- **WHEN** the player follows the selection and movement instructions, renews movement through ending a turn and moves a Blue unit onto the goal
- **THEN** the mission ends in Blue victory and the final dialogue precedes the result

#### Scenario: Early move
- **WHEN** the player performs the first accepted movement
- **THEN** the movement lesson displays and the far-edge goal is still beyond that move, so the mission remains active

### Requirement: Replay mission victory policy
Campaign mission records SHALL snapshot their victory policy. Replaying accepted actions SHALL reproduce reach-cell or standard victory and the terminal state using that snapshot without live campaign definitions, dialogue decisions or AI. Legacy records without a mission policy SHALL use standard match rules.

#### Scenario: Replay tutorial completion
- **WHEN** a completed tutorial replay is loaded after the authored campaign changes
- **THEN** the recorded final move still yields Blue victory under the saved policy and further orders remain invalid

### Requirement: Sequential progression and retry
After a won mission the system SHALL offer the next mission, or campaign completion for the final mission. After a lost mission it SHALL offer retry and SHALL NOT advance. Mission-end dialogues SHALL finish before result navigation becomes available.

#### Scenario: Defeat and retry
- **WHEN** Red wins and the player retries after the ending dialogue
- **THEN** the same mission starts fresh and its one-shot dialogues can trigger again

#### Scenario: Final victory
- **WHEN** Blue wins the last mission and all ending dialogues are closed
- **THEN** the result announces campaign completion without offering a nonexistent next mission

### Requirement: Stable playthrough snapshot
A playthrough SHALL use a snapshot of the authored campaign including dialogue translations, selected narrative language ID, resolved mission maps and participant configuration taken at start. Later editor, locale catalog, or language preference changes SHALL NOT affect that playthrough, including retry and next mission. Progression SHALL remain within the current session without requiring mid-mission or cross-reload resume.

#### Scenario: Campaign edited during a run
- **WHEN** a stored campaign or map changes after a playthrough starts
- **THEN** continuing or retrying the playthrough uses its original definitions

#### Scenario: Language changes during a run
- **WHEN** locale files or the stored preferred language change after launch
- **THEN** subsequent dialogue, retry, and next mission retain the run's original language and translation content

### Requirement: Existing match compatibility
Standalone matches, multiplayer matches and action-only replays SHALL retain their existing behavior. Campaign progression SHALL NOT run while watching a replay or playing a standalone match.

#### Scenario: Watch campaign replay
- **WHEN** the player watches a completed campaign mission replay
- **THEN** finishing playback does not unlock missions or alter campaign progression
