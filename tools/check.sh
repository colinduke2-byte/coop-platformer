#!/usr/bin/env bash
# One command to verify the project: import, boot the main scene, run tests.
# Exit 0 = healthy. Set GODOT to your Godot 4.6+ binary if it is not on PATH:
#   macOS:    export GODOT="/Applications/Godot.app/Contents/MacOS/Godot"
#   Windows:  export GODOT="/c/Godot/Godot_v4.6-stable_win64_console.exe"   (Git Bash)
set -uo pipefail
GODOT="${GODOT:-godot}"
cd "$(dirname "$0")/.."
fail=0

scan() {  # print engine/script errors, ignore harmless exit-time leak reports
	grep -E "SCRIPT ERROR|ERROR:|Parse Error|Compile Error" | grep -v "leaked at exit" || true
}

echo "== 1/3 import (parse every script and scene) =="
errs=$("$GODOT" --headless --path . --import 2>&1 | scan)
if [ -n "$errs" ]; then echo "$errs"; fail=1; else echo "ok"; fi

echo "== 2/3 boot main scene for 4 seconds =="
errs=$("$GODOT" --headless --path . --quit-after 480 2>&1 | scan)
if [ -n "$errs" ]; then echo "$errs"; fail=1; else echo "ok"; fi

echo "== 3/3 feel & regression tests =="
out=$("$GODOT" --headless --path . res://tests/test_runner.tscn 2>&1)
rc=$?
echo "$out" | grep -E "^(PASS|FAIL)|tests,|^  - "
errs=$(echo "$out" | scan)
if [ -n "$errs" ]; then echo "$errs"; fail=1; fi
if [ $rc -ne 0 ]; then fail=1; fi

if [ $fail -ne 0 ]; then echo; echo "CHECK FAILED"; exit 1; fi
echo; echo "ALL CHECKS PASSED"
