#!/usr/bin/env bash
# Before/after harness. Usage: bash tools/art/compare.sh <tag> [out_root]
#   Renders a fixed list of spots (levels, menus, maps, enemy gallery) into
#   <out_root>/<tag>/ and, if <out_root>/baseline exists and tag != baseline,
#   stitches <out_root>/<tag>_vs_baseline.png (left = before, right = after).
set -uo pipefail
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/../.."
tag="${1:?tag}"
root="${2:-${ART_OUT:-/tmp/art_compare}}"
out="$root/$tag"; mkdir -p "$out"
runner=()
if [ -z "${DISPLAY:-}" ] && command -v xvfb-run >/dev/null; then runner=(xvfb-run -a -s "-screen 0 1920x1080x24"); fi
quiet() { grep -vE "ALSA|audio|init_output_device|at: (initialize|init_output)" || true; }

# level|x,y   (one overview-ish spot each; two per world)
SPOTS=(
 "w1_1_pillow_meadow|1500,-300" "w1_3_mossy_hollow|3000,-300"
 "w2_1_snowball_slopes|2500,-300" "w2_3_crystal_caverns|3000,-300"
 "w3_2_canopy_highway|1500,-300" "w3_4_rumbletide_rapids|3000,-300"
 "w4_1_cogwheel_courtyard|1500,-300" "w4_5_night_shift|2500,-300"
 "w5_1_seashell_shore|3800,200" "w5_5_midnight_trench|4300,800"
 "w7_1_starfall_gardens|1700,-200" "candy_canopy|3000,-300"
)
i=0
for s in "${SPOTS[@]}"; do
  lvl="${s%%|*}"; at="${s##*|}"; i=$((i+1))
  d="$out/_tmp_$lvl"; rm -rf "$d"; mkdir -p "$d"
  timeout 240 "${runner[@]}" "$GODOT" --rendering-driver opengl3 --resolution 1920x1080 --path . res://tools/level_shots.tscn -- --shots="$d" --level="res://levels/$lvl.tscn" --at="$at" --zoom=0.45 2>&1 | quiet >/dev/null
  f=$(ls "$d"/shot_*.png 2>/dev/null | head -1); [ -n "$f" ] && cp "$f" "$out/$(printf %02d $i)_$lvl.png"
  rm -rf "$d"
done
# menus and maps
shot() { # name scene [extra args]
  n="$1"; sc="$2"; shift 2
  timeout 120 "${runner[@]}" "$GODOT" --rendering-driver opengl3 --resolution 1920x1080 --path . res://tools/scene_shot.tscn -- --scene="$sc" --wait=1.5 --out="$out/$n.png" "$@" 2>&1 | quiet >/dev/null
}
shot 20_title res://ui/title.tscn
shot 21_charselect res://ui/character_select.tscn --players=2
for w in w1 w2 w3 w4 w5 w6 w7; do shot "22_map_$w" res://ui/world_map.tscn --map_world=$w; done
shot 29_shop res://ui/lum_shop.tscn
mkdir -p "$out/_g"
timeout 120 "${runner[@]}" "$GODOT" --rendering-driver opengl3 --resolution 1920x1080 --path . res://tools/enemy_gallery.tscn -- --shots="$out/_g" 2>&1 | quiet >/dev/null
[ -f "$out/_g/enemies.png" ] && mv "$out/_g/enemies.png" "$out/30_enemies.png"; rm -rf "$out/_g"

python3 - "$root" "$tag" <<'PY'
import sys, glob, os
from PIL import Image
root, tag = sys.argv[1:3]
def sheet(files, path, cols, w=640):
    ims = [Image.open(f).convert("RGB") for f in files]
    if not ims: return
    h = int(w * 9 / 16)
    rows = (len(ims) + cols - 1) // cols
    out = Image.new("RGB", (cols * w, rows * h))
    for i, im in enumerate(ims):
        out.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
    out.save(path)
files = sorted(glob.glob(f"{root}/{tag}/[0-9]*.png"))
sheet(files, f"{root}/{tag}_sheet.png", 4)
base = f"{root}/baseline"
if tag != "baseline" and os.path.isdir(base):
    pairs = []
    for f in files:
        b = os.path.join(base, os.path.basename(f))
        if os.path.exists(b): pairs += [b, f]
    sheet(pairs, f"{root}/{tag}_vs_baseline.png", 2, 800)
print("done", len(files))
PY
