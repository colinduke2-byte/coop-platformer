extends CanvasLayer
## In-level HUD: Lum counter (bumps on pickup), each player's colour + Lums,
## Dream Gems, run timer, join hint, and the level name when a level starts.
## Listens only to EventBus / reads GameManager stats.

var _lums: Label
var _lum_box: Control
var _rush: RushBadge
var _players_row: HBoxContainer
var _gems: Array[GemIcon] = []
var _timer: Label
var _hint: Label
var _banner: Label
var _bump := 0.0
var _debug: Label
var _stats := FrameStats.new()
var _report_note := ""
var _snooze: SnoozeIcon
var _boss_box: Control
var _boss_name: Label
var _boss_bar: BossBar


func _ready() -> void:
	layer = 3  # above the foreground (1) and colour grade (2)
	# Build everything in code (old scenes had Margin/VBox children).
	for c in get_children():
		c.queue_free()
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	var top_left := VBoxContainer.new()
	top_left.position = Vector2(32, 20)
	root.add_child(top_left)
	var lum_row := HBoxContainer.new()
	lum_row.add_theme_constant_override(&"separation", 12)
	top_left.add_child(lum_row)
	_lum_box = _LumGlyph.new()
	lum_row.add_child(_lum_box)
	_lums = UIStyle.label("0", 48, Color.WHITE, 10)
	lum_row.add_child(_lums)
	_rush = RushBadge.new()
	_rush.visible = false
	lum_row.add_child(_rush)
	_players_row = HBoxContainer.new()
	_players_row.add_theme_constant_override(&"separation", 18)
	top_left.add_child(_players_row)

	var top_right := HBoxContainer.new()
	top_right.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	top_right.position = Vector2(-330, 24)
	top_right.add_theme_constant_override(&"separation", 8)
	root.add_child(top_right)
	for i in GameManager.GEMS_PER_LEVEL:
		var g := GemIcon.new(i, false, 40.0)
		_gems.append(g)
		top_right.add_child(g)
	# Story levels: a little cage that fills in when you free the Snoozling.
	var idx := LevelCatalog.index_of(GameManager.level.scene_file_path) if GameManager.level else -1
	if idx != -1 and LevelCatalog.LEVELS[idx]["world"] != "bonus":
		_snooze = SnoozeIcon.new()
		_snooze.freed = false
		top_right.add_child(_snooze)
		EventBus.snoozling_rescued.connect(func(_p: Vector2) -> void:
			_snooze.freed = true
			_snooze.queue_redraw())
	_timer = UIStyle.label("0:00.00", 34, Color.WHITE, 8)
	_timer.custom_minimum_size.x = 160
	_timer.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	top_right.add_child(_timer)

	_hint = UIStyle.label("", 24, Color.WHITE, 8)
	_hint.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_hint.position = Vector2(-500, -118)
	_hint.custom_minimum_size.x = 1000
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(_hint)

	_banner = UIStyle.label("", 64, Color.WHITE, 14)
	_banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_banner.position = Vector2(-700, 160)
	_banner.custom_minimum_size.x = 1400
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(_banner)

	# Boss health bar (hidden until a boss wakes up).
	_boss_box = VBoxContainer.new()
	_boss_box.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_boss_box.position = Vector2(-360, -120)
	_boss_box.custom_minimum_size.x = 720
	_boss_box.visible = false
	root.add_child(_boss_box)
	_boss_name = UIStyle.label("", 30, Color.WHITE, 8)
	_boss_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_box.add_child(_boss_name)
	_boss_bar = BossBar.new()
	_boss_box.add_child(_boss_bar)
	EventBus.boss_changed.connect(func(n: String, hp: int, mx: int, active: bool) -> void:
		if active and not _boss_box.visible:
			_boss_entrance(n)
		_boss_box.visible = active
		_boss_name.text = n
		_boss_bar.set_health(hp, mx))

	_debug = UIStyle.label("", 18, Color.WHITE, 6)
	_debug.position = Vector2(32, 180)
	_debug.visible = false
	root.add_child(_debug)

	EventBus.lums_changed.connect(_on_lums)
	EventBus.lum_rush_changed.connect(func(left: float) -> void:
		_rush.total = maxf(left, 0.01)
		_rush.visible = left > 0.0)
	EventBus.player_joined.connect(func(_p: Player) -> void: _refresh_players.call_deferred())
	EventBus.player_left.connect(func(_s: int) -> void: _refresh_players.call_deferred())
	EventBus.gem_collected.connect(func(i: int, _s: int, _p: Vector2) -> void:
		if i < _gems.size(): _gems[i].filled = true)
	_on_lums(GameManager.lums)
	_refresh_players.call_deferred()
	_show_banner.call_deferred()


func _show_banner() -> void:
	var lvl := GameManager.level
	if lvl == null or lvl.level_name == "":
		return
	_banner.text = lvl.level_name
	var idx := LevelCatalog.index_of(lvl.scene_file_path)
	if idx != -1 and LevelCatalog.LEVELS[idx]["world"] != "bonus":
		var w: String = LevelCatalog.LEVELS[idx]["world"]
		var n := LevelCatalog.levels_in(w).find(LevelCatalog.LEVELS[idx]) + 1
		_banner.text = "World %d-%d\n%s" % [LevelCatalog.world_number(w), n, lvl.level_name]
	_banner.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_banner, ^"modulate:a", 1.0, 0.4)
	tw.tween_interval(2.0)
	tw.tween_property(_banner, ^"modulate:a", 0.0, 0.8)


## A boss wakes up: big name card.
func _boss_entrance(boss_name: String) -> void:
	_banner.text = boss_name
	_banner.modulate = Color(1, 0.55, 0.5, 0.0)
	_banner.scale = Vector2(1.6, 1.6)
	_banner.pivot_offset = _banner.size * 0.5
	var tw := create_tween()
	tw.tween_property(_banner, ^"modulate:a", 1.0, 0.25)
	tw.parallel().tween_property(_banner, ^"scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_interval(1.8)
	tw.tween_property(_banner, ^"modulate:a", 0.0, 0.6)
	tw.tween_callback(func() -> void: _banner.modulate = Color.WHITE; _banner.modulate.a = 0.0)


func _on_lums(total: int) -> void:
	_lums.text = str(total)
	_bump = 1.0
	_refresh_players()


func _process(delta: float) -> void:
	_bump = maxf(_bump - delta * 5.0, 0.0)
	if _rush.visible:
		_rush.left = GameManager.lum_rush
		_rush.queue_redraw()
		_lums.modulate = Color(1.0, 0.85, 0.35)
	else:
		_lums.modulate = Color.WHITE
	_lums.scale = Vector2.ONE * (1.0 + 0.3 * _bump)
	_lums.pivot_offset = _lums.size * 0.5
	_timer.text = UIStyle.fmt_time(GameManager.level_time)
	var n := InputRouter.get_bound_slots().size()
	_hint.visible = n < InputRouter.MAX_PLAYERS and not Net.is_online()
	_hint.text = ("Press SPACE (WASD), ENTER (arrows) or A (gamepad) to join" if n == 0
			else "More friends can join anytime: SPACE / ENTER / A")
	# Once someone's playing, the join reminder fades after a few seconds.
	_hint.modulate.a = 1.0 if n == 0 else clampf(1.0 - (GameManager.level_time - 5.0) / 1.5, 0.0, 0.55)
	if _debug.visible:
		_stats.record(_where())
		_debug.text = _debug_text()


func _unhandled_input(event: InputEvent) -> void:
	var k := event as InputEventKey
	if k and k.pressed and not k.echo and k.physical_keycode == KEY_F3:
		_debug.visible = not _debug.visible
		_stats.reset()
	elif k and k.pressed and not k.echo and k.physical_keycode == KEY_F4 and _debug.visible:
		var path := _stats.save_report(_where())
		_report_note = ("saved " + path) if path != "" else "could not save report"


## F3 overlay: numbers for tuning feel (see player/tuning/player_default.tres).
func _debug_text() -> String:
	var lines := PackedStringArray()
	lines.append("FPS %d   draw calls %d   nodes %d" % [Engine.get_frames_per_second(),
			Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.OBJECT_NODE_COUNT)])
	lines.append(_stats.summary() + "   [F4 saves a report]")
	if _report_note != "":
		lines.append(_report_note)
	for slot: int in GameManager.players:
		var p: Player = GameManager.players[slot]
		if not is_instance_valid(p):
			continue
		lines.append("P%d %-10s v(%5.0f,%5.0f) floor %s  sprint %.2f  coyote %.2f  buffer %.2f  chain %d%s" % [
				slot + 1, p.state_machine.current_name(), p.velocity.x, p.velocity.y, "Y" if p.is_on_floor() else "n",
				p.sprint, p.coyote_timer, p.jump_buffer_timer, p.stomp_chain, "  PARACHUTE" if p.parachute else ""])
	return "\n".join(lines)


## Level name + first player's x, for the hitch log.
func _where() -> String:
	var lvl := get_tree().current_scene
	var x := 0.0
	for slot: int in GameManager.players:
		var p: Player = GameManager.players[slot]
		if is_instance_valid(p):
			x = p.global_position.x
			break
	return "%s x=%.0f" % [lvl.name if lvl else "?", x]


func _refresh_players() -> void:
	if _players_row == null:
		return
	for c in _players_row.get_children():
		c.queue_free()
	var slots := GameManager.players.keys()
	slots.sort()
	for slot: int in slots:
		var p: Player = GameManager.players[slot]
		if not is_instance_valid(p):
			continue
		var l := UIStyle.label("P%d %d" % [slot + 1, GameManager.lums_by_slot.get(slot, 0)], 24, p.player_color.lightened(0.35), 8)
		_players_row.add_child(l)


class _LumGlyph extends Control:
	func _init() -> void:
		custom_minimum_size = Vector2(52, 52)

	func _draw() -> void:
		var c := size * 0.5
		draw_circle(c, 24.0, Color(1, 0.9, 0.3, 0.3))
		draw_colored_polygon(PackedVector2Array([c + Vector2(-6, -4), c + Vector2(-22, -16), c + Vector2(-18, 0)]), Color(1, 1, 1, 0.9))
		draw_colored_polygon(PackedVector2Array([c + Vector2(6, -4), c + Vector2(22, -16), c + Vector2(18, 0)]), Color(1, 1, 1, 0.9))
		draw_circle(c, 14.0, UIStyle.OUTLINE)
		draw_circle(c, 11.0, Color("ffe45c"))
		draw_circle(c + Vector2(-4, -4), 4.0, Color(1, 1, 1, 0.9))



## Chunky segmented health bar for bosses.
class BossBar extends Control:
	var hp := 1
	var max_hp := 1
	var _shown := 1.0

	func _init() -> void:
		custom_minimum_size = Vector2(720, 34)

	func set_health(h: int, m: int) -> void:
		hp = h
		max_hp = maxi(m, 1)
		queue_redraw()

	func _process(delta: float) -> void:
		var target := float(hp) / max_hp
		if absf(_shown - target) > 0.001:
			_shown = move_toward(_shown, target, delta * 0.8)
			queue_redraw()

	func _draw() -> void:
		var r := Rect2(Vector2.ZERO, size)
		draw_rect(r, Color(0.1, 0.06, 0.14, 0.85))
		var w := size.x - 8.0
		draw_rect(Rect2(4, 4, w * _shown, size.y - 8), Color("ff9ec0"))
		draw_rect(Rect2(4, 4, w * float(hp) / max_hp, size.y - 8), Color("ff3d6a"))
		draw_rect(Rect2(4, 4, w * float(hp) / max_hp, 6), Color(1, 1, 1, 0.35))
		for i in range(1, max_hp):
			var x := 4.0 + w * i / max_hp
			draw_line(Vector2(x, 4), Vector2(x, size.y - 4), Color(0.1, 0.06, 0.14), 3.0)
		draw_rect(r, UIStyle.OUTLINE, false, 4.0)



## The Snoozling cage icon (World 1): empty cage until rescued.
class SnoozeIcon extends Control:
	var freed := false

	func _init() -> void:
		custom_minimum_size = Vector2(44, 44)

	func _draw() -> void:
		var c := Vector2(22, 24)
		if freed:
			SnoozlingCage.draw_snoozling(self, c + Vector2(0, 16), Color("ffb3d9"), 0.0, false)
		else:
			draw_circle(c, 14.0, Color(1, 1, 1, 0.25))
			for i in 4:
				var x := c.x - 12.0 + i * 8.0
				draw_line(Vector2(x, c.y - 14), Vector2(x, c.y + 14), Color(1, 1, 1, 0.7), 3.0)
			draw_line(Vector2(c.x - 16, c.y - 15), Vector2(c.x + 16, c.y - 15), Color(1, 1, 1, 0.8), 4.0)


## "x2" badge beside the Lum counter while a Lum Rush lasts, with a draining ring.
class RushBadge extends Control:
	var total := 10.0
	var left := 0.0
	var _t := 0.0

	func _init() -> void:
		custom_minimum_size = Vector2(76, 64)

	func _process(delta: float) -> void:
		_t += delta

	func _draw() -> void:
		var c := Vector2(38, 32)
		var gold := Color("ffc93f")
		var frac := clampf(left / total, 0.0, 1.0)
		var pulse := 1.0 + (0.12 * sin(_t * 12.0) if frac < 0.3 else 0.04 * sin(_t * 5.0))
		draw_circle(c, 30.0 * pulse, Color(0.1, 0.07, 0.15, 0.75))
		draw_arc(c, 26.0 * pulse, -PI * 0.5, -PI * 0.5 + TAU * frac, 40, gold, 6.0, true)
		var font := get_theme_default_font()
		draw_string_outline(font, c + Vector2(-19, 11), "x2", HORIZONTAL_ALIGNMENT_LEFT, -1, 30, 6, Color(0.15, 0.08, 0.02))
		draw_string(font, c + Vector2(-19, 11), "x2", HORIZONTAL_ALIGNMENT_LEFT, -1, 30, gold)
