#!/usr/bin/env bash
# Performance gate for the visual overhaul: frame stats on 3 heavy levels with a
# real renderer (xvfb, software GL: fps is NOT meaningful here - compare draw calls
# and process ms between phases; the budget is no more than +25% draw calls / +30% ms).
#   bash tools/art/bench.sh > $SCRATCH/bench_<tag>.txt
set -uo pipefail
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/../.."
runner=(); if [ -z "${DISPLAY:-}" ] && command -v xvfb-run >/dev/null; then runner=(xvfb-run -a -s "-screen 0 1920x1080x24"); fi
for lvl in w3_2_canopy_highway w4_1_cogwheel_courtyard w5_5_midnight_trench; do
  echo "== $lvl"
  timeout 200 "${runner[@]}" "$GODOT" --rendering-driver opengl3 --resolution 1920x1080 --path . res://tools/bench.tscn -- --level=res://levels/$lvl.tscn --seconds=8 2>&1 | grep -E "^BENCH|frame ms|draw calls"
done
