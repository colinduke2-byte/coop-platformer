extends Node2D
## TITLE SCREEN: the logo over a drifting meadow, the gang goofing around on a
## hill. Any join button (SPACE / ENTER / A) starts: that player is already
## joined when the character select opens. Rename the game in GAME_TITLE.

const GAME_TITLE := "DREAMERS"
const SUBTITLE := "a co-op dream adventure"
const NEXT := "res://ui/character_select.tscn"
const ONLINE := "res://ui/online_menu.tscn"
const LETTER_COLORS := [Color("ff5d8f"), Color("ffd23f"), Color("5bc8ff"), Color("7ee05a"), Color("c58bff"),
		Color("ff9e3f"), Color("3bceac"), Color("ff7fb0")]

@export var level_theme: LevelTheme = preload("res://world/themes/meadow.tres")

var _t := 0.0
var _letters: Array[Label] = []
var _prompt: Label
var _ribbon: Label
var _rigs: Array[CharacterRig] = []
var _cam: Camera2D
var _leaving := false


func _ready() -> void:
	var bd := Backdrop.new()
	bd.horizon_y = 200.0
	bd.scenery = Backdrop.Scenery.HILLS
	add_child(bd)
	var amb := Ambience.new()
	amb.kind = Ambience.Kind.PETALS
	amb.density = 0.8
	add_child(amb)
	var pollen := Ambience.new()
	pollen.kind = Ambience.Kind.POLLEN
	add_child(pollen)
	# A grassy hill for the gang to stand on.
	var hill := Terrain.new()
	hill.polygon = PackedVector2Array([Vector2(-1400, 330), Vector2(-500, 300), Vector2(0, 280), Vector2(500, 300),
			Vector2(1400, 330), Vector2(1400, 1200), Vector2(-1400, 1200)])
	add_child(hill)
	for k in [Vector3(-620, 312, 1.2), Vector3(640, 312, 1.0), Vector3(-260, 292, 0.8), Vector3(430, 294, 0.9)]:
		var d := Deco.new()
		d.kind = Deco.Kind.BIG_FLOWER if int(k.x) % 3 == 0 else Deco.Kind.FLOWERS
		d.position = Vector2(k.x, k.y)
		d.size = k.z
		add_child(d)
	var tree := Deco.new()
	tree.kind = Deco.Kind.TREE
	tree.position = Vector2(-820, 322)
	tree.size = 1.3
	add_child(tree)
	_cam = Camera2D.new()
	_cam.position = Vector2(0, -60)
	add_child(_cam)
	_cam.make_current()
	for i in GameManager.CHARACTERS.size():
		var rig := CharacterRig.new()
		rig.position = Vector2(-270 + i * 180, 282 + absf(i - 1.5) * 4.0)
		rig.scale = Vector2.ONE * 1.5
		add_child(rig)
		rig.build(GameManager.CHARACTERS[i])
		_rigs.append(rig)
	_build_logo()
	InputRouter.join_requested.connect(_on_join)
	Audio.play_music("menu")
	# The start page's "Host a game" / "Join" buttons skip straight to online play.
	var intent := Net.transport.intent()
	if not intent.is_empty():
		Net.pending_intent = intent
		_leaving = true
		get_tree().change_scene_to_file.call_deferred(ONLINE)


func _exit_tree() -> void:
	if InputRouter.join_requested.is_connected(_on_join):
		InputRouter.join_requested.disconnect(_on_join)


func _build_logo() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	var box := HBoxContainer.new()
	box.add_theme_constant_override(&"separation", 6)
	box.position = Vector2(960 - GAME_TITLE.length() * 58, 150)
	layer.add_child(box)
	for i in GAME_TITLE.length():
		var l := UIStyle.label(GAME_TITLE[i], 150, LETTER_COLORS[i % LETTER_COLORS.size()], 26)
		l.add_theme_color_override(&"font_shadow_color", Color(0, 0, 0, 0.35))
		l.add_theme_constant_override(&"shadow_offset_y", 10)
		box.add_child(l)
		_letters.append(l)
	var sub := UIStyle.label(SUBTITLE, 40, Color.WHITE, 12)
	sub.position = Vector2(560, 360)
	sub.custom_minimum_size.x = 800
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layer.add_child(sub)
	_prompt = UIStyle.label("Press SPACE, ENTER or A to start", 40, Color.WHITE, 12)
	_prompt.position = Vector2(460, 900)
	_prompt.custom_minimum_size.x = 1000
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layer.add_child(_prompt)
	_ribbon = UIStyle.label("NEW!  World 4 - Clockwhirl Works", 32, Color("ffd23f"), 12)
	_ribbon.position = Vector2(1330, 380)
	_ribbon.rotation = -0.12
	layer.add_child(_ribbon)
	if OS.has_feature("web"):
		var online := UIStyle.label("Press O (or Y on a gamepad) to PLAY ONLINE with friends", 30, Color("ffd23f"), 10)
		online.position = Vector2(460, 1010)
		online.custom_minimum_size.x = 1000
		online.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		layer.add_child(online)
	var hint := UIStyle.label("1-4 players - keyboards and gamepads welcome", 22, Color(1, 1, 1, 0.8), 6)
	hint.position = Vector2(560, 960)
	hint.custom_minimum_size.x = 800
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layer.add_child(hint)


func _process(delta: float) -> void:
	_t += delta
	for i in _letters.size():
		var l := _letters[i]
		l.position.y = sin(_t * 2.4 + i * 0.55) * 12.0
		l.rotation = sin(_t * 1.7 + i) * 0.05
		l.pivot_offset = l.size * 0.5
	_prompt.modulate.a = 0.55 + 0.45 * sin(_t * 4.0)
	_ribbon.scale = Vector2.ONE * (1.0 + 0.05 * sin(_t * 5.0))
	_cam.position.x = sin(_t * 0.12) * 160.0
	for i in _rigs.size():
		var rig := _rigs[i]
		var beat := fmod(_t + i * 0.7, 4.0)
		var pose := &"Victory" if beat < 1.2 else (&"Jump" if beat < 1.5 else &"Ground")
		rig.update_pose(pose, Vector2.ZERO, pose != &"Jump", 1.0, delta)
		rig.position.y = 282 + absf(i - 1.5) * 4.0 - (sin((beat - 1.2) / 0.3 * PI) * 30.0 if pose == &"Jump" else 0.0)


func _unhandled_input(event: InputEvent) -> void:
	if _leaving or not OS.has_feature("web"):
		return
	var key: bool = event is InputEventKey and event.pressed and not event.echo and (event as InputEventKey).physical_keycode == KEY_O
	var pad: bool = event is InputEventJoypadButton and event.pressed and (event as InputEventJoypadButton).button_index == JOY_BUTTON_Y
	if key or pad:
		_leaving = true
		Audio.play("menu_ok", -2.0)
		get_tree().change_scene_to_file.call_deferred(ONLINE)


func _on_join(_slot: int) -> void:
	if _leaving:
		return
	_leaving = true
	Audio.play("menu_ok", -2.0)
	var tw := create_tween()
	for l in _letters:
		tw.parallel().tween_property(l, ^"scale", Vector2(1.3, 1.3), 0.15)
	tw.tween_interval(0.25)
	tw.tween_callback(func() -> void: get_tree().change_scene_to_file(NEXT))
