# Movement animation verification — 2026-10-09

Automated checks: `npm run typecheck`, `npm run lint`, `npm test` (57 files,
244 tests), and `npm run build` passed. Biome verifies file/function size,
cognitive complexity, named numeric values, and formatting. BattleScene now has
991 lines; its prior file-size suppression was removed by extracting HUD and
development diagnostics. Build emits the existing large-bundle warning for the
Phaser application. `git diff --check` passed. Simulation behavior and core/AI
dependencies were unchanged, so `npm run simulate` was not required.

Focused tests cover numeric storage validation and unavailable storage, all slider
duration values, legal routes including diagonals/occupancy/terrain, frame-driven
interpolation, renderer refresh/rounding/health-label alignment, mixed action
queues, synchronous zero duration, pause/resume/reset, order locks, AI scheduling,
visible LM Studio fallback, exit cancellation, replay timing/seek, and identical
completed match results across animation speeds and headless core replay.

Browser smoke checks used Vite, Chromium, current manifest assets, and isolated
browser contexts:

- Settings and pause layouts inspected at 500×844, 1280×900, and 800×600.
  Slider track/thumb/labels fit; pause controls retain their existing buttons.
- Canvas track clicks and dragging selected an intermediate value. End selected
  No animation. At 800×600 a click selected 73 (108 ms/cell); a full page reload
  restored both the value and the label. No DOM input, button, or select was added.
- Multi-cell battle movement displayed matching image/HP-label coordinates while
  authoritative state was already at the destination. Pause froze the image.
  Selecting No animation while paused retained 400 ms/cell for the active move.
  Orders were blocked while moving. Camera controls remained usable; leaving and
  restarting the scene cleared pending presentation work.
- Two actual WebRTC peers used the local signaling service, initially with Slow
  versus No animation. Accepted actions updated both authoritative states while
  the slower display was paused. After resuming and draining the queue, both peers
  reached sequence 4 with identical SHA-256 state digests:
  `63e4d06cb473fbce5915b27a98946fb8b0842a38424cd89c0fb8d8ddc9a60191`.
- Heuristic versus Heuristic at value 73 produced three accepted moves followed
  by capture; pause remained available.
- A completed version-1 replay containing movement and attacks reconstructed
  without migration. At 2×, the default movement duration was 100 ms/cell.
  Forward step animated; Start canceled it immediately. Autoplay reached frame
  8/8 and stopped with no active movement. Zoom retained image/label alignment.
- No warnings/errors appeared after a clean reload. The asset manifest was
  unchanged; animation reused existing unit images and introduced no artwork.
