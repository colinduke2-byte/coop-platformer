extends Node2D
## Preview all characters side by side, cycling through every animated state.
## Open characters/character_gallery.tscn and press F6. Left/right arrows
## step through states manually; any other key resumes auto-cycling.

const CHARACTERS: Array[CharacterDef] = [
	preload("res://characters/mumbleby.tres"),
	preload("res://characters/sir_dinkworth.tres"),
	preload("res://characters/tootle.tres"),
	preload("res://characters/gribble.tres"),
]
const STATES: Array[StringName] = [
	&"Ground", &"Idle", &"Run", &"Sprint", &"Skid", &"Jump", &"Fall", &"Glide", &"WallSlide",
	&"LedgeHang", &"Crouch", &"Slide", &"Punch", &"Uppercut", &"GroundPound", &"Bubble",
]
const SPACING := 260.0
const DISPLAY_SCALE := 2.0
const SECONDS_PER_STATE := 1.8
const PREVIEW_RUN_SPEED := 430.0

var _rigs: Array[CharacterRig] = []
var _state_label: Label
var _index := 0
var _timer := 0.0
var _auto := true


func _ready() -> void:
	var cam := Camera2D.new()
	cam.position = Vector2(0, -60)
	add_child(cam)
	var floor_line := Line2D.new()
	floor_line.points = PackedVector2Array([Vector2(-600, 0), Vector2(600, 0)])
	floor_line.width = 4.0
	floor_line.default_color = Color("4a3f5c")
	add_child(floor_line)
	for i in CHARACTERS.size():
		var def := CHARACTERS[i]
		var x := (float(i) - (CHARACTERS.size() - 1) * 0.5) * SPACING
		var rig := CharacterRig.new()
		rig.position = Vector2(x, 0)
		rig.scale = Vector2.ONE * DISPLAY_SCALE
		add_child(rig)
		rig.build(def)
		_rigs.append(rig)
		var name_label := _label("P%d  %s" % [i + 1, def.display_name], 22, Vector2(x - 120, 20))
		name_label.add_theme_color_override(&"font_color", def.main_color.lightened(0.3))
		_label(def.blurb, 13, Vector2(x - 115, 52), true)
	_state_label = _label("", 26, Vector2(-300, -330))
	_state_label.size.x = 600.0
	_state_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER


func _label(text: String, font_size: int, pos: Vector2, wrap := false) -> Label:
	var l := Label.new()
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD
		l.custom_minimum_size.x = 230.0
	l.text = text
	l.position = pos
	l.size.x = 230.0 if wrap else 240.0
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override(&"font_size", font_size)
	add_child(l)
	return l


func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	if event.physical_keycode == KEY_RIGHT or event.physical_keycode == KEY_LEFT:
		_auto = false
		_index = wrapi(_index + (1 if event.physical_keycode == KEY_RIGHT else -1), 0, STATES.size())
	else:
		_auto = true


## `godot --path . res://characters/character_gallery.tscn -- --shots=<dir>` saves
## one PNG per state and quits (lets tools/agents review the art).
func _shots_dir() -> String:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			return a.trim_prefix("--shots=")
	return ""


func _process(delta: float) -> void:
	var shots := _shots_dir()
	if shots != "" and _auto and _timer + delta >= SECONDS_PER_STATE:
		get_viewport().get_texture().get_image().save_png("%s/%02d_%s.png" % [shots, _index, STATES[_index]])
		if _index == STATES.size() - 1:
			get_tree().quit()
	if _auto:
		_timer += delta
		if _timer >= SECONDS_PER_STATE:
			_timer = 0.0
			_index = (_index + 1) % STATES.size()
	var shown := STATES[_index]
	_state_label.text = "%s   (%s)" % [shown, "auto" if _auto else "left/right to step"]
	var state := shown
	var vel := Vector2.ZERO
	match shown:
		&"Idle":
			state = &"Ground"
		&"Run":
			state = &"Ground"
			vel.x = PREVIEW_RUN_SPEED
		&"Jump":
			vel.y = -500.0
		&"Fall":
			vel.y = 600.0
		&"Glide":
			vel.y = 110.0
		&"Sprint", &"Skid":
			state = &"Ground"
			vel.x = PREVIEW_RUN_SPEED * 1.4
		&"Uppercut":
			state = &"Punch"
		&"Slide":
			vel.x = 500.0
	# Punch: charge up for 0.6 s, then throw a full-power punch.
	var punch_t := fmod(_timer, 0.9)
	var is_punch := shown in [&"Punch", &"Uppercut"]
	var punching := is_punch and punch_t > 0.6
	var charge := clampf(punch_t / 0.6, 0.0, 1.0) if is_punch and not punching else 0.0
	# Ground pound: spin, dive, thud on a loop.
	var pound_t := fmod(_timer, 0.9)
	for rig in _rigs:
		rig.sprint = 1.0 if shown == &"Sprint" else 0.0
		rig.skidding = shown == &"Skid"
		rig.punch_up = shown == &"Uppercut"
		rig.ledge_climb = clampf(fmod(_timer, 1.8) - 1.0, 0.0, 1.0) if shown == &"LedgeHang" else 0.0
		rig.pound_phase = (0 if pound_t < 0.3 else (1 if pound_t < 0.5 else 2)) if shown == &"GroundPound" else -1
		rig.pound_spin = clampf(pound_t / 0.3, 0.0, 1.0)
		rig.rotation = rig.spin_angle()
		rig.gliding = shown == &"Glide"
		rig.idle_quirk_delay = 0.2 if shown == &"Idle" else 1000.0  # quirks only on the Idle page
		rig.punching = punching
		rig.punch_charge = charge
		rig.punch_power = 1.0 if punching else 0.0
		rig.punch_target = Vector2(8.0, -30.0 - 72.0 * 1.6) if shown == &"Uppercut" else Vector2(72.0 * 1.6, -30.0)
		rig.update_pose(state, vel, shown in [&"Ground", &"Idle", &"Run", &"Sprint", &"Skid", &"Punch", &"Crouch", &"Slide"], PREVIEW_RUN_SPEED, delta)
