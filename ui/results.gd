extends CanvasLayer
## Level complete screen: time, Lums (and who grabbed the most), gems,
## secrets, new records. Then: next level / play again / level select.

const SHOW_DELAY := 1.6

var _results: Dictionary = {}
var _items: Array[String] = []
var _index := 0
var _active := false
var _menu := MenuInput.new()
var _root: Control
var _list: HBoxContainer


func _ready() -> void:
	layer = 40
	process_mode = Node.PROCESS_MODE_ALWAYS
	EventBus.level_completed.connect(_on_completed)


func _on_completed(results: Dictionary) -> void:
	_results = results
	await get_tree().create_timer(SHOW_DELAY).timeout
	_build()
	_active = true


func _process(_delta: float) -> void:
	if not _active:
		return
	_menu.poll()
	if _menu.left:
		_index = wrapi(_index - 1, 0, _items.size())
		_refresh_items()
	elif _menu.right:
		_index = wrapi(_index + 1, 0, _items.size())
		_refresh_items()
	elif _menu.confirm:
		_active = false
		match _items[_index]:
			"Next level":
				GameManager.goto_scene(_results["next"])
			"Play again":
				GameManager.restart_level()
			_:
				GameManager.goto_scene(GameManager.LEVEL_SELECT)


func _build() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)
	var dim := ColorRect.new()
	dim.color = Color(0.08, 0.05, 0.15, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override(&"panel", UIStyle.panel())
	pc.custom_minimum_size = Vector2(900, 0)
	center.add_child(pc)
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 12)
	pc.add_child(v)
	var news: Dictionary = _results.get("new", {})
	_add(v, UIStyle.label("DREAM COMPLETE!", 60, UIStyle.ACCENT, 8, UIStyle.OUTLINE))
	_add(v, UIStyle.label(_results.get("name", ""), 30))
	var t_text := "Time  %s%s" % [UIStyle.fmt_time(_results.get("time", 0.0)), "   NEW BEST!" if news.has("time") else ""]
	_add(v, UIStyle.label(t_text, 30))
	_add(v, UIStyle.label("Lums  %d%s" % [_results.get("lums", 0), "   NEW BEST!" if news.has("lums") else ""], 30))
	# Per-player Lums, with a crown for the top collector.
	var by: Dictionary = _results.get("lums_by_slot", {})
	var best_slot := -1
	for s: int in by:
		if best_slot == -1 or by[s] > by[best_slot]:
			best_slot = s
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override(&"separation", 40)
	for slot: int in GameManager.players:
		var p: Player = GameManager.players[slot]
		if not is_instance_valid(p):
			continue
		var top := slot == best_slot and by.size() > 1
		var name_text := "%s: %d%s" % [p.character.display_name, by.get(slot, 0), "  (most Lums!)" if top else ""]
		row.add_child(UIStyle.label(name_text, 26, p.player_color.darkened(0.2)))
	v.add_child(row)
	var gem_row := HBoxContainer.new()
	gem_row.alignment = BoxContainer.ALIGNMENT_CENTER
	gem_row.add_theme_constant_override(&"separation", 10)
	gem_row.add_child(UIStyle.label("Dream Gems ", 30))
	var gems: Array = _results.get("gems", [])
	for i in gems.size():
		gem_row.add_child(GemIcon.new(i, gems[i], 40.0))
	if news.has("gems"):
		gem_row.add_child(UIStyle.label("  NEW!", 30, UIStyle.ACCENT))
	v.add_child(gem_row)
	if _results.get("secrets_total", 0) > 0:
		_add(v, UIStyle.label("Secrets  %d / %d" % [_results.get("secrets", 0), _results.get("secrets_total", 0)], 26))
	_items = []
	if _results.get("next", "") != "":
		_items.append("Next level")
	_items.append_array(["Play again", "Level select"])
	_list = HBoxContainer.new()
	_list.alignment = BoxContainer.ALIGNMENT_CENTER
	_list.add_theme_constant_override(&"separation", 50)
	v.add_child(_list)
	_refresh_items()


func _add(parent: Control, l: Label) -> void:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	parent.add_child(l)


func _refresh_items() -> void:
	for c in _list.get_children():
		c.queue_free()
	for i in _items.size():
		var sel := i == _index
		_list.add_child(UIStyle.label(("> %s <" if sel else "%s") % _items[i], 34 if sel else 28, UIStyle.ACCENT if sel else UIStyle.INK))
