# AI War Game

AI War Game is a small, turn-based 2D strategy game. A human player and a programmatic AI command compact armies on a grid map. The project is designed for rapid, informal iteration: add a rule, play a few matches, adjust the scenario data, and repeat.

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

## Headless simulations

`npm run simulate` runs graphics-free matches for AI evaluation, statistics, and training data. It
does not load Phaser, browser storage, or Canvas assets.

```sh
npm run simulate -- --map skirmish --blue heuristic --red random --matches 100 --seed 42
npm run simulate -- --map ./maps/example.ai-war-map.json --blue heuristic --red heuristic --records ./results/matches.jsonl
```

Use `random`, `heuristic`, or `lm-studio` independently for `--blue` and `--red`. A batch executes
sequentially; match `i` receives `seed + i`. Stdout contains a JSON summary. `--records` is optional
and writes one JSONL match record per line. Each record includes accepted actions, their ordered domain
events, per-action Blue/Red score deltas, and final team scores for replay or training.
Matches reaching `--max-actions` without a winner are counted as `incomplete` and do not stop a batch.

`--map skirmish` selects the built-in map. Any other `--map` value must be a versioned map JSON
exported from the editor and contain at least one unit for each side.

For LM Studio, use `--lm-url`, `--blue-model`, `--red-model`, and optionally `--lm-timeout disabled`
or a positive millisecond value. LM Studio errors, timeouts, malformed responses, and invalid orders
fall back to Heuristic AI for that order; the summary records the fallback count.

### Environment policy

The committed [.env](.env) contains safe defaults. Create a personal `.env.local` to override them;
it is ignored by Git. CLI arguments take precedence over `.env.local`, which takes precedence over
`.env`, which takes precedence over built-in constants. Do not put credentials or machine-specific
configuration in `.env`.

## Replays

Every completed match is saved locally as a deterministic replay. Open `REPLAYS` from the main Canvas menu to watch, export, import, or delete records. A replay stores its initial map snapshot, participant configuration, and accepted actions; playback never contacts LM Studio and regenerates domain events through the game rules.

## P2P multiplayer

Choose `HOST P2P` to create a room code, then share it with the Red player, who chooses `JOIN P2P` and enters the code. The host selects the map and starts the match. WebRTC carries game traffic directly between browsers; the host validates every action and sends accepted actions to the client.

Run the signaling relay locally with Docker:

```sh
docker compose up --build signaling
```

The relay listens on port `8080` and provides `GET /health`. Set `VITE_SIGNALING_URL` to its public `wss://` URL for deployed HTTPS builds. The relay only exchanges WebRTC offers, answers, and ICE candidates; it never receives game state or orders. The default public STUN server supports direct connections. For restrictive NATs, set `VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` in untracked `.env.local`; never commit TURN credentials. A public signaling service needs HTTPS/WSS in production. Normal WebRTC connections do not require port forwarding, but a TURN relay may be needed when direct traversal fails.

## LM Studio opponent

Start the local server in LM Studio, then run the game with `npm run dev` and open `LM STUDIO SETTINGS`
in the Canvas menu. The default endpoint is `/lm-studio-api/v1`: Vite proxies it to
`http://127.0.0.1:1234/v1`, avoiding browser CORS restrictions. Restart `npm run dev` after updating
the project so the proxy is active. Refresh the model list or type a model ID manually, test the
connection, set a request timeout between 1,000 and 300,000 ms (or disable it), then choose a separate Blue and Red model ID and save. Either commander can then use
`LM STUDIO AI`, including an AI-versus-AI match with two different local models on the same server.

The model receives one decision at a time, the latest game state, and orders already issued in its
current turn. It can select only an offered legal action. If the local server, response, or action is
invalid, the game visibly records a side-specific Heuristic AI fallback and continues. The default
timeout is 60 seconds to allow local models to load. Match launch
snapshots both model selections, so `PLAY AGAIN` retains the same competitors. Replays record the
accepted actions and never contact LM Studio.

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
Teams earn points deterministically: actual HP removed by attacks and 5 points for each successful control-point capture.

## Documentation

- [Architecture](docs/architecture.md)
- [Game rules](docs/game-rules.md)
- [Art direction](docs/art-direction.md)
- [Asset pipeline](docs/assets.md)
- [Implementation plan](docs/implementation-plan.md)
- [Contributor and agent guide](AGENTS.md)
