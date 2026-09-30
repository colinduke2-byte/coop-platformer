extends Control
## Pick a dream (level). LEFT/RIGHT to browse, JUMP to play, ATTACK to go back
## to character select. Shows each level's best time, Lums and Dream Gems.
## Levels come from LevelCatalog.

const CARD := Vector2(440, 470)

var _index := 0
var _menu := MenuInput.new()
var _cards: Array[Control] = []
var _row: HBoxContainer
var _rigs: Array[CharacterRig] = []
var _t := 0.0


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := TextureRect.new()
	var grad := Gradient.new()
	grad.set_color(0, Color("7b5cff"))
	grad.set_color(1, Color("ffb3d9"))
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill_to = Vector2(0, 1)
	bg.texture = tex
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var title := UIStyle.label("Pick a dream", 72, Color.WHITE, 14)
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position = Vector2(-600, 50)
	title.custom_minimum_size.x = 1200
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(title)
	var hint := UIStyle.label("Left / Right: browse     Jump: play     Attack: back to characters", 24, Color.WHITE, 8)
	hint.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint.position = Vector2(-600, -70)
	hint.custom_minimum_size.x = 1200
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(hint)
	_row = HBoxContainer.new()
	_row.add_theme_constant_override(&"separation", 40)
	_row.position = Vector2(0, 190)
	add_child(_row)
	for i in LevelCatalog.LEVELS.size():
		_cards.append(_make_card(LevelCatalog.LEVELS[i]))
		_row.add_child(_cards[i])
	# The gang, cheering at the bottom.
	var slots := InputRouter.get_bound_slots()
	for k in slots.size():
		var rig := CharacterRig.new()
		rig.position = Vector2(960 + (k - (slots.size() - 1) * 0.5) * 160.0, 960)
		rig.scale = Vector2.ONE * 1.6
		add_child(rig)
		rig.build(GameManager.character_for(slots[k]))
		_rigs.append(rig)
	_refresh()
	Audio.play_music("menu")


func _make_card(info: Dictionary) -> Control:
	var pc := PanelContainer.new()
	pc.custom_minimum_size = CARD
	pc.add_theme_stylebox_override(&"panel", UIStyle.panel())
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 10)
	pc.add_child(v)
	var th: LevelTheme = load(info.get("theme", LevelTheme.DEFAULT_PATH))
	v.add_child(_Preview.new(th))
	var name_l := UIStyle.label(info["name"], 32)
	name_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(name_l)
	var blurb := UIStyle.label(info.get("blurb", ""), 20, Color(UIStyle.INK, 0.8))
	blurb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	blurb.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	blurb.custom_minimum_size.x = CARD.x - 60
	v.add_child(blurb)
	var rec := SaveData.get_record(info["id"])
	var rec_text := "Not played yet" if rec.is_empty() else "Best  %s    Lums %d" % [UIStyle.fmt_time(rec.get("time", 0.0)), rec.get("lums", 0)]
	var rec_l := UIStyle.label(rec_text, 22)
	rec_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(rec_l)
	var gems := HBoxContainer.new()
	gems.alignment = BoxContainer.ALIGNMENT_CENTER
	var got: Array = rec.get("gems", [])
	for i in GameManager.GEMS_PER_LEVEL:
		gems.add_child(GemIcon.new(i, i < got.size() and got[i], 36.0))
	v.add_child(gems)
	return pc


func _process(delta: float) -> void:
	_t += delta
	for rig in _rigs:
		rig.update_pose(&"Victory" if fmod(_t, 3.0) < 1.0 else &"Ground", Vector2.ZERO, true, 1.0, delta)
	_menu.poll()
	if _menu.left:
		_index = wrapi(_index - 1, 0, _cards.size())
		_refresh()
	elif _menu.right:
		_index = wrapi(_index + 1, 0, _cards.size())
		_refresh()
	elif _menu.confirm:
		set_process(false)
		GameManager.goto_scene(LevelCatalog.LEVELS[_index]["scene"])
	elif _menu.back:
		set_process(false)
		GameManager.goto_scene(GameManager.CHARACTER_SELECT)
	# Keep the selected card centred.
	var target_x := 960.0 - (_index * (CARD.x + 40.0) + CARD.x * 0.5)
	_row.position.x = lerpf(_row.position.x, target_x, clampf(10.0 * delta, 0.0, 1.0))


func _refresh() -> void:
	for i in _cards.size():
		var sel := i == _index
		_cards[i].modulate = Color.WHITE if sel else Color(1, 1, 1, 0.6)
		_cards[i].scale = Vector2.ONE * (1.0 if sel else 0.9)
		_cards[i].pivot_offset = CARD * 0.5


## Little painted postcard of the level's theme.
class _Preview extends Control:
	var th: LevelTheme

	func _init(p_th: LevelTheme) -> void:
		th = p_th
		custom_minimum_size = Vector2(380, 200)

	func _draw() -> void:
		var s := size
		for i in 10:
			var y := s.y * i / 10.0
			draw_rect(Rect2(0, y, s.x, s.y / 10.0 + 1.0), th.sky_top.lerp(th.sky_bottom, i / 9.0))
		draw_circle(Vector2(s.x * 0.8, s.y * 0.25), 26.0, th.sun)
		var hills := PackedVector2Array([Vector2(0, s.y)])
		for i in 21:
			var x := s.x * i / 20.0
			hills.append(Vector2(x, s.y * 0.55 + sin(x * 0.03) * 16.0))
		hills.append(Vector2(s.x, s.y))
		draw_colored_polygon(hills, th.near_hills)
		draw_rect(Rect2(0, s.y * 0.75, s.x, s.y * 0.25), th.ground)
		draw_rect(Rect2(0, s.y * 0.75, s.x, 10), th.top)
		draw_rect(Rect2(Vector2.ZERO, s), UIStyle.OUTLINE, false, 4.0)
