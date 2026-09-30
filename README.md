# Co-op Platformer (framework)

A playable Godot 4 foundation for a Rayman Legends-style local co-op
platformer, set up so Claude Code can build on it safely.

## Play it
1. Install **Godot 4.6 or newer** (standard version, not .NET): https://godotengine.org/download
2. Open Godot > Import > select this folder's `project.godot`.
3. Press **F5**. Join with:
   - **Space** (WASD, Space jump, Left Shift punch, Left Ctrl sprint)
   - **Enter** (arrows, Enter jump, Right Shift punch, Right Ctrl sprint)
   - **A** on any gamepad (A jump, X/B punch, RT sprint)
   Double-tapping a direction also sprints. Full list: `docs/CONTROLS.md`,
   or Pause → Controls in the game.
4. Tune feel live: while running, open `player/tuning/player_default.tres`
   in the Inspector and change values.

## Build it with Claude Code
1. Tell the check script where Godot is (add to your shell profile):
   - Mac: `export GODOT="/Applications/Godot.app/Contents/MacOS/Godot"`
   - Windows (Git Bash): `export GODOT="/c/path/to/Godot_v4.6-stable_win64_console.exe"`
2. `git init && git add -A && git commit -m "framework"`. Commit often so you can undo.
3. Run `claude` in this folder. It reads `CLAUDE.md` automatically.
4. Try: `/check`, `/next`, `/tune jump feels too floaty`,
   `/new-move charged punch that goes further the longer you hold`,
   `/new-enemy`, `/new-level`.
5. Fill in `docs/GAME_DESIGN.md` so Claude builds *your* game.
