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
## Rebinding: "left" / "right" keyboard layout -> action name -> physical keycode; pad: action -> JoyButton.
## Empty = the defaults in InputRouter. Saved with the other settings.
## Comfort: screen-shake amount (0..1), hit-stop freeze on/off, reduce flashing (softer hit flashes).
static var shake := 1.0
static var hit_stop := true
static var reduce_flash := false
static var key_binds := {"left": {}, "right": {}}
static var pad_binds := {}
const REBINDABLE: Array[StringName] = [&"move_left", &"move_right", &"move_up", &"move_down", &"jump", &"attack", &"sprint"]
const PAD_REBINDABLE: Array[StringName] = [&"jump", &"attack"]


static func load_and_apply() -> void:
	if FileAccess.file_exists(PATH):
		var f := FileAccess.open(PATH, FileAccess.READ)
		var d: Variant = JSON.parse_string(f.get_as_text())
		if d is Dictionary:
			music = clampf(float(d.get("music", music)), 0.0, 1.0)
			sfx = clampf(float(d.get("sfx", sfx)), 0.0, 1.0)
			fullscreen = bool(d.get("fullscreen", fullscreen))
			graphics = int(d.get("graphics", graphics))
			shake = clampf(float(d.get("shake", shake)), 0.0, 1.0)
			hit_stop = bool(d.get("hit_stop", hit_stop))
			reduce_flash = bool(d.get("reduce_flash", reduce_flash))
			_load_binds(d)
	if graphics < 0:
		Gfx.level = Gfx.auto_pick()
	else:
		Gfx.level = clampi(graphics, 0, 2)
	apply()


static func save() -> void:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({"music": music, "sfx": sfx, "fullscreen": fullscreen, "graphics": graphics,
				"keys": key_binds, "pad": pad_binds, "shake": shake, "hit_stop": hit_stop, "reduce_flash": reduce_flash}))


static func _load_binds(d: Dictionary) -> void:
	var keys: Variant = d.get("keys")
	if keys is Dictionary:
		for layout: String in ["left", "right"]:
			var m: Variant = keys.get(layout)
			if m is Dictionary:
				for a: String in m:
					if StringName(a) in REBINDABLE:
						key_binds[layout][a] = int(m[a])
	var pad: Variant = d.get("pad")
	if pad is Dictionary:
		for a: String in pad:
			if StringName(a) in PAD_REBINDABLE:
				pad_binds[a] = int(pad[a])


## The physical keycode override for `action` on a keyboard layout ("left" / "right"), or -1.
static func key_override(layout: String, action: StringName) -> int:
	return int((key_binds[layout] as Dictionary).get(String(action), -1))


## Bind `keycode` to `action` on a keyboard layout. If another action of that layout already uses the key
## the two swap, so a layout never has one key doing two things.
static func set_key(layout: String, action: StringName, keycode: int, defaults: Dictionary) -> void:
	var mine: Dictionary = key_binds[layout]
	var old := _effective_key(layout, action, defaults)
	for other: StringName in REBINDABLE:
		if other != action and _effective_key(layout, other, defaults) == keycode:
			mine[String(other)] = old
	mine[String(action)] = keycode
	save()
	InputRouter.rebuild_bindings()


static func _effective_key(layout: String, action: StringName, defaults: Dictionary) -> int:
	var o := key_override(layout, action)
	if o != -1:
		return o
	var d: Variant = defaults.get(action)
	return int(d[0]) if d is Array else int(d)


static func set_pad(action: StringName, button: int) -> void:
	for other: String in pad_binds.keys():
		if other != String(action) and int(pad_binds[other]) == button:
			pad_binds.erase(other)   # one button, one job
	pad_binds[String(action)] = button
	save()
	InputRouter.rebuild_bindings()


static func reset_binds() -> void:
	key_binds = {"left": {}, "right": {}}
	pad_binds = {}
	save()
	InputRouter.rebuild_bindings()


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
		"shake":
			shake = clampf(snappedf(shake + dir * STEP, STEP), 0.0, 1.0)
		"hitstop":
			hit_stop = not hit_stop
		"flash":
			reduce_flash = not reduce_flash
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
		"rebind":
			return "Rebind controls   >"
		"shake":
			return "Screen shake   %s" % _bar(shake)
		"hitstop":
			return "Hit freeze   %s" % ("ON" if hit_stop else "OFF")
		"flash":
			return "Reduce flashing   %s" % ("ON" if reduce_flash else "OFF")
	return key


## How strong enemy hit flashes are (1 = normal).
static func flash_scale() -> float:
	return 0.3 if reduce_flash else 1.0


static func _bar(v: float) -> String:
	var n := roundi(v * 10.0)
	return "< %s%s >  %d%%" % ["|".repeat(n), ".".repeat(10 - n), n * 10]


static func _set_bus(bus_name: StringName, v: float) -> void:
	var i := AudioServer.get_bus_index(bus_name)
	if i == -1:
		return
	AudioServer.set_bus_mute(i, v <= 0.001)
	AudioServer.set_bus_volume_db(i, float(BASE_DB[bus_name]) + linear_to_db(maxf(v, 0.001)))
