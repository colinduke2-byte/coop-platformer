#!/usr/bin/env bash
# Build the browser version and publish it to the gh-pages branch (GitHub Pages).
# Friends then play at https://<user>.github.io/<repo>/ - online play uses PeerJS (WebRTC),
# no accounts needed. One-time GitHub setting: Settings > Pages > Deploy from a branch > gh-pages / (root).
set -euo pipefail
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/../.."
mkdir -p build/web
"$GODOT" --headless --export-release "Web" build/web/index.html
out=$(mktemp -d)
gzip -9 -c build/web/index.wasm > "$out/part1.bin"
cp build/web/index.pck "$out/part2.bin"
cp build/web/index.js build/web/index.audio.worklet.js build/web/index.audio.position.worklet.js "$out/"
cp tools/web/play.html "$out/index.html"
cp tools/web/peerjs.min.js "$out/"
touch "$out/.nojekyll"
url=$(git remote get-url origin)
cd "$out"
git init -q -b gh-pages
git add -A
git commit -q -m "Browser build $(date -u +%Y-%m-%d)"
git push -f "$url" gh-pages
echo "Pushed. Live in a minute or two at your GitHub Pages address."
