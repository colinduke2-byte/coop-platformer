extends CanvasLayer
## Pause menu any player can open with PAUSE (Esc / Backspace / Start).
## Resume, restart from checkpoint, restart level, level select, character
## select, or leave the game (drop out). Also opens when a controller unplugs.

var _open := false
var _index := 0
var _opener := 0
var _items: Array[String] = []
var _menu := MenuInput.new()
var _root: Control
var _list: VBoxContainer
var _note: Label
var _panel: Control
var _controls: Control     ## the ControlsCard overlay (null = not showing)
var _settings := false     ## showing the Settings rows instead of the main list
var _main_items: Array[String] = []
const SETTING_ROWS := ["music", "sfx", "graphics", "fullscreen", "shake", "hitstop", "flash", "rebind", "back"]
const ACTION_LABELS := {&"move_left": "Move left", &"move_right": "Move right", &"move_up": "Up", &"move_down": "Down",
		&"jump": "Jump", &"attack": "Punch", &"sprint": "Sprint", &"glide": "Glide"}
var _rebind := false        ## showing the key-rebinding rows
var _capturing := ""        ## the row waiting for a key / button press ("" = none)
var _capture_cool := 0.0


func _ready() -> void:
	layer = 50
	process_mode = Node.PROCESS_MODE_ALWAYS
	EventBus.pause_requested.connect(open)
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)
	var dim := ColorRect.new()
	dim.color = Color(0.08, 0.05, 0.15, 0.55)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)
	_panel = center
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override(&"panel", UIStyle.panel())
	center.add_child(pc)
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 14)
	pc.add_child(v)
	var title := UIStyle.label("Paused", 56)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)
	_note = UIStyle.label("", 22, UIStyle.ACCENT)
	_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_note.custom_minimum_size.x = 520
	v.add_child(_note)
	_list = VBoxContainer.new()
	_list.add_theme_constant_override(&"separation", 6)
	v.add_child(_list)
	var hint := UIStyle.label("Up/Down + Jump: choose     Attack / Pause: back", 18, Color(UIStyle.INK, 0.7))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(hint)
	_root.visible = false


func is_open() -> bool:
	return _open


func open(slot: int, message := "") -> void:
	if GameManager.level_complete:
		return
	_open = true
	_opener = slot
	_index = 0
	_settings = false
	_items = ["Resume", "Controls", "Settings", "Restart from checkpoint", "Restart level", "World map", "Character select", "Leave game (P%d)" % (slot + 1)]
	if Net.is_host():
		_items = ["Resume", "Controls", "Settings", "Restart level", "World map", "Character select", "Leave online game"]
	elif Net.is_client():
		_items = ["Resume", "Controls", "Settings", "Leave online game"]
	_note.text = message
	_note.visible = message != ""
	_rebuild()
	_root.visible = true
	get_tree().paused = not Net.is_online()  # online the game keeps going for everyone else
	_hold_players(true)
	Audio.play("menu_ok", -4.0, 0.8, 0.0)


func close() -> void:
	_hide_controls()
	_open = false
	_root.visible = false
	if not Net.is_online():
		get_tree().paused = false
	_hold_players(false)


## Online the world keeps running under the menu: our dreamer stands still meanwhile.
func _hold_players(hold: bool) -> void:
	if not Net.is_online():
		return
	for p: Player in GameManager.players.values():
		if is_instance_valid(p) and not p.remote:
			p.input.enabled = not hold


func _process(_delta: float) -> void:
	_menu.poll(_open)
	if not _open:
		if _menu.pause and not GameManager.level_complete:
			open(_menu.who)
		return
	if _controls:
		if _menu.back or _menu.pause or _menu.confirm:
			_hide_controls()
		return
	_capture_cool = maxf(_capture_cool - _delta, 0.0)
	if _rebind:
		_process_rebind()
		return
	if _settings and _items[_index] == "rebind" and _menu.confirm:
		_show_rebind(true)
		return
	if _settings and (_menu.left or _menu.right or _menu.confirm) and _items[_index] != "back":
		Settings.nudge(_items[_index], 1 if (_menu.right or (_menu.confirm and _items[_index] in ["fullscreen", "hitstop", "flash"])) else (-1 if _menu.left else 0))
		_rebuild()
		return
	if _settings and (_menu.back or _menu.pause or _menu.confirm):
		_show_settings(false)
		return
	if _menu.up:
		_index = wrapi(_index - 1, 0, _items.size())
		_rebuild()
	elif _menu.down:
		_index = wrapi(_index + 1, 0, _items.size())
		_rebuild()
	elif _menu.back or _menu.pause:
		close()
	elif _menu.confirm:
		_choose(_items[_index])


func _choose(item: String) -> void:
	match item:
		"Resume":
			close()
		"Controls":
			_controls = ControlsCard.overlay()
			_root.add_child(_controls)
			_panel.visible = false
		"Settings":
			_show_settings(true)
		"Restart from checkpoint":
			close()
			GameManager.respawn_all_at_checkpoint()
		"Restart level":
			GameManager.restart_level()
		"World map":
			GameManager.goto_scene(GameManager.WORLD_MAP)
		"Character select":
			GameManager.goto_scene(GameManager.CHARACTER_SELECT)
		"Leave online game":
			Net.leave()
			GameManager.goto_scene(Net.ONLINE_MENU)
		_:
			GameManager.drop_player(_opener)
			if InputRouter.get_bound_slots().is_empty():
				GameManager.goto_scene(GameManager.CHARACTER_SELECT)
			else:
				close()


## Swap the list to the settings rows (Left / Right change a value) and back.
func _show_settings(on: bool) -> void:
	_settings = on
	if on:
		_main_items = _items.duplicate()
		_items.assign(SETTING_ROWS)
		_index = 0
		_note.text = "Left / Right: change"
		_note.visible = true
	else:
		_items = _main_items
		_index = _items.find("Settings")
		_note.visible = false
	_rebuild()


## The key / button rows. Select a row + JUMP, then press the new key (Esc cancels).
func _show_rebind(on: bool) -> void:
	_rebind = on
	_capturing = ""
	if on:
		_settings_items = _items.duplicate()
		_items.clear()
		for layout: String in ["left", "right"]:
			for a: StringName in Settings.REBINDABLE:
				_items.append("k:%s:%s" % [layout, a])
		for a: StringName in Settings.PAD_REBINDABLE:
			_items.append("p:%s" % a)
		_items.append("reset")
		_items.append("back")
		_index = 0
		_note.text = "JUMP on a row, then press the new key or button.  Esc cancels."
	else:
		_items = _settings_items
		_index = _items.find("rebind")
		_note.text = "Left / Right: change"
	_note.visible = true
	_rebuild()


var _settings_items: Array[String] = []


func _process_rebind() -> void:
	if _capturing != "" or _capture_cool > 0.0:
		return
	if _menu.up:
		_index = wrapi(_index - 1, 0, _items.size())
		_rebuild()
	elif _menu.down:
		_index = wrapi(_index + 1, 0, _items.size())
		_rebuild()
	elif _menu.back or _menu.pause:
		_show_rebind(false)
	elif _menu.confirm:
		var item := _items[_index]
		if item == "back":
			_show_rebind(false)
		elif item == "reset":
			Settings.reset_binds()
			_rebuild()
		else:
			_capturing = item
			_rebuild()


func _input(event: InputEvent) -> void:
	if _capturing == "" or not _open:
		return
	var parts := _capturing.split(":")
	var done := false
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_ESCAPE:
			done = true   # cancel
		elif parts[0] == "k":
			var layout := parts[1]
			Settings.set_key(layout, StringName(parts[2]), event.physical_keycode, InputRouter.KEYS_LEFT if layout == "left" else InputRouter.KEYS_RIGHT)
			done = true
	elif event is InputEventJoypadButton and event.pressed and parts[0] == "p":
		Settings.set_pad(StringName(parts[1]), event.button_index)
		done = true
	if done:
		get_viewport().set_input_as_handled()
		_capturing = ""
		_capture_cool = 0.3
		_rebuild()


func _row_text(item: String) -> String:
	if item == "back":
		return "Back"
	if item == "reset":
		return "Reset to defaults"
	var parts := item.split(":")
	var waiting := item == _capturing
	if parts[0] == "k":
		var who := "P1 keys" if parts[1] == "left" else "P2 keys"
		return "%s  %s:  %s" % [who, ACTION_LABELS[StringName(parts[2])], "press a key..." if waiting else InputRouter.key_name(parts[1], StringName(parts[2]))]
	return "Gamepad  %s:  %s" % [ACTION_LABELS[StringName(parts[1])], "press a button..." if waiting else InputRouter.pad_button_name(StringName(parts[1]))]


func _rebuild() -> void:
	for c in _list.get_children():
		c.queue_free()
	for i in _items.size():
		var sel := i == _index
		var text := _items[i]
		if _rebind:
			text = _row_text(text)
		elif _settings:
			text = "Back" if text == "back" else Settings.describe(text)
		var small := _rebind
		var l := UIStyle.label(("> %s <" if sel and not _settings else "%s") % text, (24 if small else 34) if sel else (20 if small else 28),
				UIStyle.ACCENT if sel else UIStyle.INK)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_list.add_child(l)


func _hide_controls() -> void:
	if _controls:
		_controls.queue_free()
		_controls = null
	_panel.visible = true
