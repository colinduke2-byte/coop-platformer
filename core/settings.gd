class_name Settings
## Player settings: music / sound-effect volume and fullscreen. Saved to
## user://settings.json and applied at startup (Audio autoload calls
## load_and_apply()). Changed from Pause -> Settings.

const PATH := "user://settings.json"
const BASE_DB := {&"Music": -6.0, &"SFX": -2.0}   ## the mix at 100%
const STEP := 0.1

static var music := 1.0                 ## 0..1
static var sfx := 1.0                   ## 0..1
static var fullscreen := false
static var graphics := -1               ## Gfx.Level; -1 = not chosen yet (auto-picked)


static func load_and_apply() -> void:
	if FileAccess.file_exists(PATH):
		var f := FileAccess.open(PATH, FileAccess.READ)
		var d: Variant = JSON.parse_string(f.get_as_text())
		if d is Dictionary:
			music = clampf(float(d.get("music", music)), 0.0, 1.0)
			sfx = clampf(float(d.get("sfx", sfx)), 0.0, 1.0)
			fullscreen = bool(d.get("fullscreen", fullscreen))
			graphics = int(d.get("graphics", graphics))
	if graphics < 0:
		Gfx.level = Gfx.auto_pick()
	else:
		Gfx.level = clampi(graphics, 0, 2)
	apply()


static func save() -> void:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({"music": music, "sfx": sfx, "fullscreen": fullscreen, "graphics": graphics}))


static func apply() -> void:
	_set_bus(&"Music", music)
	_set_bus(&"SFX", sfx)
	if DisplayServer.get_name() == "headless":
		return
	var mode := DisplayServer.window_get_mode()
	var is_full := mode == DisplayServer.WINDOW_MODE_FULLSCREEN or mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN
	if fullscreen != is_full:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if fullscreen else DisplayServer.WINDOW_MODE_WINDOWED)


## Nudge a setting by one step (`dir` -1 / +1); fullscreen toggles. Saves.
static func nudge(key: String, dir: int) -> void:
	match key:
		"music":
			music = clampf(snappedf(music + dir * STEP, STEP), 0.0, 1.0)
		"sfx":
			sfx = clampf(snappedf(sfx + dir * STEP, STEP), 0.0, 1.0)
		"fullscreen":
			fullscreen = not fullscreen
		"graphics":
			graphics = wrapi(Gfx.level + (1 if dir >= 0 else -1), 0, 3)
			Gfx.level = graphics
	apply()
	save()


## How a row reads in the menu, e.g. "Music  [||||||....]  60%".
static func describe(key: String) -> String:
	match key:
		"music":
			return "Music   %s" % _bar(music)
		"sfx":
			return "Sound effects   %s" % _bar(sfx)
		"fullscreen":
			return "Fullscreen   %s" % ("ON" if fullscreen else "OFF")
		"graphics":
			return "Graphics   < %s >" % Gfx.name_of(Gfx.level)
	return key


static func _bar(v: float) -> String:
	var n := roundi(v * 10.0)
	return "< %s%s >  %d%%" % ["|".repeat(n), ".".repeat(10 - n), n * 10]


static func _set_bus(bus_name: StringName, v: float) -> void:
	var i := AudioServer.get_bus_index(bus_name)
	if i == -1:
		return
	AudioServer.set_bus_mute(i, v <= 0.001)
	AudioServer.set_bus_volume_db(i, float(BASE_DB[bus_name]) + linear_to_db(maxf(v, 0.001)))
