#!/usr/bin/env bash
# Record a movement scenario to a GIF. Usage: bash tools/clip.sh <scenario> <out.gif> [extra --args]
set -uo pipefail
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/.."
name="$1"; out="$2"; shift 2
tmp="$(mktemp -d)"
runner=()
if [ -z "${DISPLAY:-}" ] && command -v xvfb-run >/dev/null; then runner=(xvfb-run -a -s "-screen 0 1920x1080x24"); fi
"${runner[@]}" "$GODOT" --rendering-driver opengl3 --fixed-fps 40 --resolution 1920x1080 --path . res://tools/scenario_shots.tscn -- \
	--scenario="$name" --shots="$tmp" "$@" 2>&1 | grep -E "SCRIPT ERROR|saved" || true
python3 tools/make_gif.py "$tmp" "$out" 0.5 360,140,1560,940
rm -rf "$tmp"
