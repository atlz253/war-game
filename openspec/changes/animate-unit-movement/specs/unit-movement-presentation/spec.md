# Spec Delta

## Purpose

Make accepted unit movements readable through cell-by-cell presentation while allowing players to control or disable animation without affecting match outcomes.

## ADDED Requirements

### Requirement: Route-based movement
The system SHALL animate accepted moves through the same ordered cells used by movement rules, from the original cell to the destination. The unit image and health label SHALL travel together. Rejected actions SHALL produce no movement animation.

#### Scenario: Move around obstacles
- **WHEN** a human or AI move is accepted along a route with intermediate cells
- **THEN** its unit and label traverse those cells in order, including legal diagonal steps, without cutting across blocked cells outside the route

#### Scenario: Rejected move
- **WHEN** a movement action is rejected
- **THEN** the unit remains at its current position and no animation lock starts

### Requirement: Movement speed settings
The system SHALL provide a Canvas speed slider in main menu settings and battle/replay pause menus, with fine adjustment from Slow on the left to No animation on the right. It SHALL show the current duration per cell or No animation. The default SHALL be 200 ms per cell. Saved values SHALL apply locally to future moves and survive reload; absent or invalid data SHALL use the default, and unavailable storage SHALL leave controls usable for the session.

#### Scenario: Persisted choice
- **WHEN** a player saves an intermediate slider value and reloads the game
- **THEN** the slider restores that value and subsequent movements use its duration

#### Scenario: Ordered speeds
- **WHEN** the slider is moved toward the right and the same route is played again
- **THEN** travel time decreases monotonically until movement becomes instantaneous at the right endpoint

#### Scenario: Fine adjustment
- **WHEN** the player drags the thumb, clicks the track, or focuses the slider and uses arrow keys
- **THEN** the value, thumb, and duration label update together and intermediate values are available beyond four fixed choices
- **AND** the interaction cannot submit an order to the board underneath

#### Scenario: Invalid or unavailable storage
- **WHEN** saved data is invalid or browser storage is unavailable
- **THEN** settings open with the default duration and a new value remains usable for the current session

### Requirement: Instant movement
At the slider's No animation endpoint, the system SHALL display the accepted destination immediately without a tween, animation delay, or movement lock.

#### Scenario: Disabled animation
- **WHEN** a move is accepted with the slider at No animation
- **THEN** the unit and health label appear at the destination in the same presentation update and order processing continues normally

### Requirement: Presentation sequencing
During a movement animation the system SHALL block new local game orders and defer subsequent local AI action scheduling until completion. Camera controls and pause controls SHALL remain available. Accepted network actions SHALL retain their authoritative sequence and be presented in that order independently of each peer's speed setting.

#### Scenario: Local animation lock
- **WHEN** a move is in progress and the player attempts a board order or an order HUD button
- **THEN** no new order is submitted until the move completes
- **AND** opening pause and moving the camera remain possible when their existing controls permit them

#### Scenario: Consecutive AI moves
- **WHEN** an AI move takes longer than the usual AI action delay
- **THEN** the next local AI action is scheduled only after that move finishes

#### Scenario: Different peer speeds
- **WHEN** peers use different speed settings and additional accepted actions arrive during movement
- **THEN** authoritative state stays synchronized and visual transitions are presented in accepted sequence without interrupting the current route

### Requirement: Animation lifecycle
Opening pause SHALL freeze current movement; resuming SHALL continue it. A changed speed SHALL apply to the next movement. Exit, scene shutdown, or authoritative resynchronization SHALL cancel stale animations and callbacks; resynchronization SHALL display the new snapshot immediately.

#### Scenario: Change speed while paused
- **WHEN** the player pauses mid-move, changes speed, and resumes
- **THEN** the current move continues from its paused position with its original speed and the next move uses the saved choice

#### Scenario: Exit or resynchronize
- **WHEN** the scene exits or receives a replacement authoritative snapshot mid-animation
- **THEN** the old transition cannot resume or schedule another action and a replacement snapshot is rendered immediately when applicable

### Requirement: Replay movement
Forward single-step and automatic replay playback SHALL use the local movement setting. Playback SHALL finish a transition before advancing again; its existing playback speed SHALL scale movement duration. Backward steps and non-adjacent seeking SHALL cancel animation and render the requested frame immediately. Replays SHALL use stored accepted actions without AI or network inference.

#### Scenario: Forward playback
- **WHEN** replay advances across a recorded move at 2× playback speed
- **THEN** the route animates in half the duration for the selected slider value and the next frame waits for completion

#### Scenario: Seeking during movement
- **WHEN** the player steps backward or seeks to a non-adjacent frame during animation
- **THEN** the animation is canceled and the requested frame appears immediately without stale completion callbacks

### Requirement: Presentation-independent outcomes
Animation settings and intermediate visual positions SHALL NOT alter rules, movement cost, authoritative positions, action records, scores, or match results. Headless execution SHALL remain independent of animation and browser settings.

#### Scenario: Identical action sequence
- **WHEN** the same initial state and accepted actions run with different slider values, including both endpoints, or headlessly
- **THEN** their authoritative states, scores, and results are identical
