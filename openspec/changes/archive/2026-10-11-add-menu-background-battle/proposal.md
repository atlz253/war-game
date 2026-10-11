# Proposal

## Why

The menu currently has a static opaque background. A continuous local Heuristic-versus-Heuristic battle will show the game in motion while players navigate, without resetting the demonstration whenever they open another menu screen.

## What Changes

- Generate a session-local battlefield on first menu entry, wider than its visible camera region, with randomized Blue and Red forces initially hidden on opposite horizontal sides.
- Run both sides through the existing HeuristicAgent and public action validation/application pipeline; render movement and combat behind the Canvas menu.
- Replace an eliminated side with a randomized reinforcement wave in its offscreen spawn region, preserving the map and surviving forces. Use explicitly isolated demonstration rules with infinite ammunition and no terminal match victory.
- Keep one background session progressing across root menus, submenus, settings children, multiplayer setup, and campaign/replay libraries. Suspend it during gameplay, editing, and replay playback, and resume the same session on return. Reload creates a new session.
- Keep foreground controls readable and exclusive owners of input. Background state never affects selected maps, commanders, real matches, saved replays, or network/LM Studio activity.

## Capabilities

### New Capabilities

- `menu-background-battle`: Generated offscreen deployment, autonomous local combat, endless reinforcements, presentation, and session lifecycle for the menu background.

### Modified Capabilities

- `main-menu-navigation`: Clarify that pending navigation must not create or modify a player match while allowing the isolated background demonstration to continue.

## Impact

- Deterministic core map generation and demonstration-specific reinforcement/rule handling; existing match defaults remain intact.
- A headless-capable background battle controller using `src/ai/agents/HeuristicAgent.ts`, with bounded action scheduling and seeded generation.
- A separate Phaser background scene registered in `src/main.ts`, menu-family lifecycle integration, renderer/presenter reuse, and centralized presentation settings.
- Focused Vitest coverage for legality, generation, repeated waves, deterministic replay, navigation continuity, and cleanup; browser verification of layering, resize, animation, and responsiveness.
- Reuse existing manifest-backed terrain and Blue/Red unit assets. No new runtime dependencies or art requests are expected.
