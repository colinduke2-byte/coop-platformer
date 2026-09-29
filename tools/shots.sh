#!/usr/bin/env bash
# Render level screenshots headlessly-ish (xvfb) for review. Usage:
#   bash tools/shots.sh <out_dir> -- --level=res://levels/demo_level.tscn --overview
set -uo pipefail
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/.."
out="$1"; shift; [ "${1:-}" = "--" ] && shift
mkdir -p "$out"
runner=()
if [ -z "${DISPLAY:-}" ] && command -v xvfb-run >/dev/null; then runner=(xvfb-run -a -s "-screen 0 1920x1080x24"); fi
timeout 240 "${runner[@]}" "$GODOT" --rendering-driver opengl3 --resolution 1920x1080 --path . res://tools/level_shots.tscn -- --shots="$(realpath "$out")" "$@" 2>&1 \
	| grep -vE "ALSA|audio|init_output_device|at: (initialize|init_output)" || true
