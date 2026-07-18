# Architecture

## Dependency boundaries

`src/core` owns game rules and state. `src/ai` owns decisions and simulations. `src/game` owns Phaser scenes, rendering, Canvas UI, input, cameras, animation, sound, and effects.

Allowed dependencies are `game -> core`, `game -> ai`, and `ai -> core`. Neither `core` nor `ai` may import Phaser or anything from `game`.

```text
Phaser Canvas input
  -> BattleInputController creates GameAction
  -> validateAction(state, action)
  -> applyAction(state, action)
  -> next GameState and action events
  -> BattleScene.renderGameState(previousState, nextState)
```

The AI submits the same `GameAction` values through the same validation and application functions. No caller may edit match state directly.

## Core contracts

```ts
interface GameState {
  scenarioId: string;
  turn: number;
  activeSide: SideId;
  units: Record<string, UnitState>;
  controlPoints: Record<string, ControlPointState>;
  winner: SideId | null;
}

type GameAction = MoveAction | AttackAction | CaptureAction | WaitAction | EndTurnAction;

function validateAction(state: GameState, action: GameAction): ValidationResult;
function applyAction(state: GameState, action: GameAction): ApplyActionResult;

interface ApplyActionResult {
  accepted: boolean;
  state: GameState;
  events: GameEvent[];
}
```

`ValidationResult` is a discriminated valid/invalid result with a stable reason code. `applyAction` returns a new state and ordered domain events for accepted actions; rejected actions return the exact input state with no events. It must not depend on time, random global state, or Phaser objects.

Agents receive a state snapshot and return an action candidate:

```ts
interface Agent {
  readonly id: string;
  chooseAction(state: GameState, context: AgentContext): Promise<GameAction>;
}

interface AgentContext {
  actionsThisTurn: readonly GameAction[];
}
```

Randomness is injected through a seeded source stored in scenario or simulation configuration. A replay records scenario identity, seed, and accepted actions; replaying them must reproduce the final state.

`LmStudioAgent` remains under `src/ai` and depends only on core state/actions plus an injected HTTP
client. It sends a current state snapshot, legal action IDs, and current-turn history to LM Studio's
OpenAI-compatible API. Its response is mapped only to the offered action set, then still validated by
the shared action path. Network, JSON, timeout, and legality failures use `HeuristicAgent` for that
single decision. Remote inference is not deterministic; deterministic replays record its accepted
actions and do not issue HTTP requests.

The browser stores one local LM Studio endpoint, an optional request timeout, and independent Blue/Red
model IDs. Before a match, the menu copies them into side-specific connections in `MatchConfiguration`;
`BattleScene` uses only that snapshot. Therefore a running match and `PLAY AGAIN` retain their
competitors and timeout even if global settings are later changed.

Display models cross into Phaser as plain data only:

```ts
interface SelectedUnitViewModel {
  name: string;
  health: number;
  maxHealth: number;
  movementPoints: number;
  attackRange: string;
  hasActed: boolean;
}
```

## Phaser structure

- `BootScene` loads manifest-defined assets, fonts, audio, and temporary diagnostic textures, then opens the menu.
- `MainMenuScene` renders the title, scenario and AI selection, and the start button in Canvas.
- `BattleScene` owns `GameState`, selected unit ID, legal action previews, input lock, world rendering, Canvas HUD, and action animation.
- `ResultScene` renders match outcome, turn count, summary statistics, replay, and menu controls in Canvas.

`BattleScene` keeps separate `worldContainer` and `hudContainer` containers. World objects move with the map camera. HUD objects call `setScrollFactor(0)` and do not move or zoom with the board. The first version uses one bounded world camera; a separate UI camera is allowed only if needed later.

`renderGameState(previousState, nextState)` incrementally reconciles unit views by ID, terrain/control-point views, HUD data, event log entries, and legal-action indicators. It must not recreate the entire scene after each action.

## User map library

`MapDefinition` is a serializable core value object. It contains board dimensions, sparse terrain placements, unit placements, and control-point placements; grass is implicit. `createGameStateFromMap` deterministically creates runtime unit identifiers, stats, and terrain-aware board state. Browser-local persistence, the Canvas editor, and file import/export live under `src/game/maps` and must not be imported by `core` or `ai`.

Map files use a versioned JSON schema. Schema-v1 maps are migrated deterministically to schema v2 with an empty terrain list. A map can be saved as a draft, but a match may begin only when both sides have at least one unit. The only DOM exception is a short-lived native file picker/download link initiated by a Canvas button for JSON import/export; it is not part of the game interface.

## Canvas UI contracts

`Button` supports normal, hover, pressed, and disabled states; pointer handling; label changes; and destruction. `Panel` supports background, border, title, padding, children, resize, visibility, and destruction. `ProgressBar` represents bounded numeric progress. `ScrollableList` is a bounded event log showing the last 6–10 events in v1; full scrolling is out of scope.

All UI values come from one `UiTheme`. UI components never hold or mutate core entities: they receive view data and emit callbacks that create actions.

## Testing boundary

Use Vitest for unit tests and follow TDD: write a failing behavior-level test, implement the minimum code needed to pass it, then refactor with the suite green. Core and AI tests run without Phaser. Phaser tests focus on input-to-action wiring and presentation contracts, while rules correctness remains covered at the core boundary.
