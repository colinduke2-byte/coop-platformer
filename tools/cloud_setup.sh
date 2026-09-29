#!/usr/bin/env bash
# SessionStart hook for Claude Code cloud sessions: installs Godot (Linux) so
# tools/check.sh and tools/shots.sh work. Does nothing on local machines.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
VERSION="4.7.2"
BIN="/opt/godot/Godot_v${VERSION}-stable_linux.x86_64"
if [ ! -x "$BIN" ]; then
	mkdir -p /opt/godot
	curl -sSL -o /opt/godot/godot.zip \
		"https://github.com/godotengine/godot/releases/download/${VERSION}-stable/Godot_v${VERSION}-stable_linux.x86_64.zip"
	unzip -o -q /opt/godot/godot.zip -d /opt/godot && rm /opt/godot/godot.zip
fi
ln -sf "$BIN" /usr/local/bin/godot
# First import builds .godot/ (class cache) so tests can run straight away.
cd "$(dirname "$0")/.."
godot --headless --path . --import >/dev/null 2>&1 || true
