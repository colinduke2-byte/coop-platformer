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
	if Net.is_client():
		return  # the host picks what's next; everyone follows
	_menu.poll(true)
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
				GameManager.goto_scene(GameManager.WORLD_MAP)


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
	v.add_child(_medals())
	_add(v, UIStyle.label(_results.get("name", ""), 30))
	var t_text := "Time  %s%s" % [UIStyle.fmt_time(_results.get("time", 0.0)), "   NEW BEST!" if news.has("time") else ""]
	_add(v, UIStyle.label(t_text, 30))
	var lum_label := UIStyle.label("Lums  0", 30)
	_add(v, lum_label)
	var lum_total: int = _results.get("lums", 0)
	var lum_tail := "   NEW BEST!" if news.has("lums") else ""
	var count := create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)   # numbers tick up
	count.tween_interval(0.5)
	count.tween_method(func(n: float) -> void: lum_label.text = "Lums  %d" % int(n), 0.0, float(lum_total), minf(0.35 + lum_total * 0.012, 1.4))
	count.tween_callback(func() -> void: lum_label.text = "Lums  %d%s" % [lum_total, lum_tail])
	_add(v, UIStyle.label("+%d Lums for the Lum Shop  (saved up: %d)" % [_results.get("lums", 0), SaveData.lum_bank()], 22, Color("b8860b")))
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
	var info := LevelCatalog.by_id(_results.get("id", ""))
	var world_levels := LevelCatalog.levels_in(info.get("world", ""))
	var world: String = info.get("world", "")
	var story := world != "" and world != "bonus"
	if story and not world_levels.is_empty() and world_levels[-1]["id"] == info["id"]:
		var t := SaveData.world_totals(world)
		_add(v, UIStyle.label("WORLD %d COMPLETE!" % LevelCatalog.world_number(world), 44, Color("ffd23f"), 10, UIStyle.OUTLINE))
		_add(v, UIStyle.label("Snoozlings rescued %d / %d     Dream Gems %d / %d" % [
				t["snoozlings"], t["levels"], t["gems"], t["gems_total"]], 24))
		var ws := LevelCatalog.story_worlds()
		var nxt := ws.find(world) + 1
		if nxt < ws.size() and LevelCatalog.is_unlocked(ws[nxt] + "_1"):
			_add(v, UIStyle.label("A new world is open: %s!" % LevelCatalog.world_info(ws[nxt])["name"], 26, UIStyle.ACCENT))
		elif nxt < ws.size() and ws[nxt] == LevelCatalog.SECRET_WORLD:
			_add(v, UIStyle.label("Something stirs beyond the palace... find %d Dream Gems to see." % LevelCatalog.secret_gems_needed(), 24, Color("c58bff")))
	if story:
		var freed: bool = _results.get("snoozling", false)
		var s_text := "Snoozling rescued!" if freed else ("Snoozling already safe" if SaveData.has_snoozling(info["id"]) else "The Snoozling is still caged somewhere...")
		_add(v, UIStyle.label(s_text + ("   NEW!" if news.has("snoozling") else ""), 26, UIStyle.ACCENT if freed else UIStyle.INK))
	for o: String in _results.get("new_outfits", []):
		_add(v, UIStyle.label("New outfit in the Dream Wardrobe: %s!  (character select: up / down)" % o, 24, Color("c58bff")))
	if Net.is_client():
		_add(v, UIStyle.label("Waiting for the host to pick what's next...", 28, UIStyle.ACCENT))
		return
	_items = []
	if _results.get("next", "") != "":
		_items.append("Next level")
	_items.append_array(["Play again", "World map"])
	_list = HBoxContainer.new()
	_list.alignment = BoxContainer.ALIGNMENT_CENTER
	_list.add_theme_constant_override(&"separation", 50)
	v.add_child(_list)
	_refresh_items()
	_animate_in(pc, v)


## Three medal stars: one for finishing, one for every Dream Gem found / the Snoozling, one for all three gems.
func _medals() -> Control:
	var gems: Array = _results.get("gems", [])
	var found := 0
	for g in gems:
		found += 1 if g else 0
	var earned := [true, found >= 1 or _results.get("snoozling", false), found >= 3]
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override(&"separation", 14)
	for i in 3:
		row.add_child(MedalStar.new(earned[i], i))
	return row


class MedalStar extends Control:
	var earned := false
	var index := 0
	var _t := 0.0

	func _init(e: bool, i: int) -> void:
		earned = e
		index = i
		custom_minimum_size = Vector2(74, 74)

	func _process(delta: float) -> void:
		_t += delta
		queue_redraw()

	func _draw() -> void:
		var pop := clampf((_t - 0.5 - index * 0.28) / 0.35, 0.0, 1.0)
		var s := (1.0 + 0.25 * sin(pop * PI)) * pop
		if s < 0.05:
			return
		var c := size * 0.5
		var tilt := sin(_t * 2.0 + index) * 0.08 if earned else 0.0
		var col := Color("ffd23f") if earned else Color(0.55, 0.52, 0.6, 0.6)
		draw_colored_polygon(Art.star(c + Vector2(0, 3), 33.0 * s, 5, 0.46, tilt), Color(0, 0, 0, 0.22))
		Art.shape(self, Art.star(c, 33.0 * s, 5, 0.46, tilt), col, UIStyle.OUTLINE, 3.0)
		if earned:
			draw_colored_polygon(Art.ellipse(c + Vector2(-8, -10) * s, 6.0 * s, 4.0 * s, 10), Color(1, 1, 1, 0.55))


## Pop the panel in, then reveal its rows one after another.
func _animate_in(panel: Control, rows: VBoxContainer) -> void:
	panel.pivot_offset = panel.size * 0.5
	panel.scale = Vector2(0.7, 0.7)
	panel.modulate.a = 0.0
	var tw := panel.create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tw.tween_property(panel, ^"scale", Vector2.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(panel, ^"modulate:a", 1.0, 0.2)
	var k := 0
	for c in rows.get_children():
		if c is CanvasItem:
			c.modulate.a = 0.0
			var t2 := c.create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
			t2.tween_interval(0.2 + k * 0.07)
			t2.tween_property(c, ^"modulate:a", 1.0, 0.18)
			k += 1


func _add(parent: Control, l: Label) -> void:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	parent.add_child(l)


func _refresh_items() -> void:
	for c in _list.get_children():
		c.queue_free()
	for i in _items.size():
		var sel := i == _index
		_list.add_child(UIStyle.label(("> %s <" if sel else "%s") % _items[i], 34 if sel else 28, UIStyle.ACCENT if sel else UIStyle.INK))
