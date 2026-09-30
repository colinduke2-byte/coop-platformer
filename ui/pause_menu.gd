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
	_items = ["Resume", "Controls", "Restart from checkpoint", "Restart level", "Level select", "Character select", "Leave game (P%d)" % (slot + 1)]
	_note.text = message
	_note.visible = message != ""
	_rebuild()
	_root.visible = true
	get_tree().paused = true
	Audio.play("menu_ok", -4.0, 0.8, 0.0)


func close() -> void:
	_hide_controls()
	_open = false
	_root.visible = false
	get_tree().paused = false


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
		"Restart from checkpoint":
			close()
			GameManager.respawn_all_at_checkpoint()
		"Restart level":
			GameManager.restart_level()
		"Level select":
			GameManager.goto_scene(GameManager.LEVEL_SELECT)
		"Character select":
			GameManager.goto_scene(GameManager.CHARACTER_SELECT)
		_:
			GameManager.drop_player(_opener)
			if InputRouter.get_bound_slots().is_empty():
				GameManager.goto_scene(GameManager.CHARACTER_SELECT)
			else:
				close()


func _rebuild() -> void:
	for c in _list.get_children():
		c.queue_free()
	for i in _items.size():
		var sel := i == _index
		var l := UIStyle.label(("> %s <" if sel else "%s") % _items[i], 34 if sel else 28,
				UIStyle.ACCENT if sel else UIStyle.INK)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_list.add_child(l)


func _hide_controls() -> void:
	if _controls:
		_controls.queue_free()
		_controls = null
	_panel.visible = true
