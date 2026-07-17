# AI War Game

AI War Game is a small, turn-based 2D strategy prototype. A human player and a programmatic AI command compact armies on a grid map. The project is designed for rapid, informal iteration: add a rule, play a few matches, adjust the scenario data, and repeat.

All presentation and interaction live in one Phaser Canvas. The rules engine is deterministic and can run without graphics for simulations, AI evaluation, and replay verification.

## Technology

- TypeScript, Vite, Phaser, Vitest, Biome, and npm
- No React, Vue, Svelte, Redux, Zustand, DOM UI, or CSS-built game interface
- The HTML page contains only the Phaser mount point: `<div id="game"></div>`

## Planned local setup

```sh
npm install
npm run dev
npm test
npm run simulate
npm run build
```

`npm run simulate` runs a deterministic graphics-free match between two Heuristic agents and prints its outcome as JSON.

## Testing approach

Development follows test-driven development (TDD). Each rule, action, AI decision rule, and replay behavior starts with a focused failing Vitest unit test; implementation makes it pass, followed by safe refactoring. Vitest is the project's unit-testing tool.

## Code quality limits

Biome rejects magic numbers, production files over 1000 lines, and test files over 1500 lines. Functions are limited to 75 non-blank lines and a cognitive-complexity score of 15. Name numeric values in configuration, scenario data, UI themes, or local domain constants.

## Architecture at a glance

```text
src/game  -> Phaser scenes, Canvas UI, rendering, camera, input
src/core  -> deterministic models, rules, actions, combat, scenarios, replays
src/ai    -> agents, evaluation, simulations
```

`core` and `ai` never import Phaser or files from `game`. Human and AI actions use the same validated public action interface.

## Documentation

- [Architecture](docs/architecture.md)
- [Game rules](docs/game-rules.md)
- [Art direction](docs/art-direction.md)
- [Asset pipeline](docs/assets.md)
- [Implementation plan](docs/implementation-plan.md)
- [Contributor and agent guide](AGENTS.md)
