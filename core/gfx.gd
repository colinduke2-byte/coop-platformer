class_name Gfx
## Graphics quality preset. Every heavy visual effect asks `Gfx.at_least(...)`
## before it runs, so the same game scales from a phone browser to a gaming PC.
##   LOW    - web on phones / weak devices: painted textures, no extra layers
##   MEDIUM - web on laptops: + framing foliage, god rays, halo glows
##   HIGH   - desktop: everything (bloom, extra backdrop layers, grass bending)
## Chosen automatically on first launch (Settings.load_and_apply), changeable in
## Pause -> Settings -> Graphics. Headless (tests) counts as MEDIUM so effect
## code paths are covered without running the heaviest ones.

enum Level { LOW, MEDIUM, HIGH }

const NAMES := ["Low", "Medium", "High"]

static var level: int = Level.HIGH


static func at_least(l: int) -> bool:
	return level >= l


static func name_of(l: int) -> String:
	return NAMES[clampi(l, 0, NAMES.size() - 1)]


## The preset to start with on this device (used until the player picks one).
static func auto_pick() -> int:
	if DisplayServer.get_name() == "headless":
		return Level.MEDIUM
	if OS.has_feature("web"):
		var mobile := false
		if Engine.has_singleton("JavaScriptBridge"):
			mobile = bool(JavaScriptBridge.eval("/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && screen.width < 1100)", true))
		return Level.LOW if mobile else Level.MEDIUM
	return Level.HIGH
