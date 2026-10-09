# Movement animation

Open **MOVEMENT SETTINGS** from the main menu, or press **Esc** in a battle or replay.
Drag the Canvas slider or click its track. After clicking it, use arrow keys for fine
adjustment and Home/End for its endpoints. Settings save immediately; Back returns to
the menu. The chosen value is local to your browser and survives reload. If storage is
unavailable, the choice remains available during the session.

The slider runs from **Slow** (400 ms per cell) to **No animation** (0 ms). Its 101
positions provide 4 ms increments; the default is 200 ms per cell. Orthogonal and
diagonal steps have the same duration. Units and health labels follow the accepted
route using existing images. The right endpoint moves them immediately.

Changing the setting affects the next movement. Pause freezes the current movement,
which resumes at its original speed. Orders wait for movement to finish; camera
controls remain available. Multiplayer peers can choose different speeds without
changing the accepted action sequence or match outcome.

Forward replay steps and playback use this setting. Replay 2× halves the cell duration
and the existing interval between actions. Backward steps and Start cancel movement
and display the requested frame immediately. Saved replays require no migration and
never call AI or network inference.
