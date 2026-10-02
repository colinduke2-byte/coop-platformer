class_name WorldMap
extends Node2D
## WORLD MAP: the hub between levels. One illustrated landscape per world with
## a winding path through the levels; the gang walks between level badges.
## Gate nodes at the ends of a path lead to the next / previous world.
##   LEFT / RIGHT: walk to the previous / next level (locked ones stay shut)
##   JUMP: play the level (the balloon at the dock opens Bonus Dreams)
##   PUNCH: back to character select      PAUSE: controls
## Map space is 1920x1080. Level positions come from LevelCatalog ("map").
## The landscape is baked into a single mesh; only small bits animate.

const BONUS_POS := Vector2(115, 905)
const GATE_W2_POS := Vector2(1830, 170)     ## the gate onward to the next world (top right)
const GATE_W1_POS := Vector2(110, 975)      ## the path back to the previous world (bottom left)
## How each world's gates are named: [onward from the world before, back from the world after].
const GATE_TEXT := {
	"w1": ["", "Back to the Lullaby Woods", "Take the gondola back down to World 1."],
	"w2": ["Gondola to Frostwhistle Peaks", "Back to Frostwhistle Peaks", "World 2! Ride the gondola up into the snowy mountains."],
	"w3": ["Down to the Rainbloom Jungle", "Back to the Rainbloom Jungle", "World 3! Follow the river down into the warm, rainy jungle."],
}
const WALK_SPEED := 520.0            ## px/s along the path
const O := Color("1d1726")

static var world := "w1"             ## which world's map to show
static var last_index := {}          ## world -> node index, remembered between visits (this session)

var nodes: Array[Dictionary] = []    ## {"id", "pos", "name", "blurb", "unlocked", "done", "bonus"}
var index := 0
var _walking := false
var _walk_pts := PackedVector2Array()
var _walk_t := 0.0
var _walk_len := 0.0
var _walk_to := 0
var _t := 0.0
var _menu := MenuInput.new()
var _gang: Array[CharacterRig] = []
var _gang_pos := Vector2.ZERO
var _facing := 1.0
var _shake := 0.0
var _panel_name: Label
var _panel_blurb: Label
var _panel_stats: Label
var _toast: Label
var _toast_t := 0.0
var _controls: CanvasLayer
var _path := PackedVector2Array()    ## the whole winding path (for drawing)


func _ready() -> void:
	_build_nodes()
	var art: ArrayMesh
	match world:
		"w2": art = _bake_w2()
		"w3": art = _bake_w3()
		_: art = _bake_land()
	add_child(MapArt.new(art))
	var live := LiveBits.new()
	live.map = self
	add_child(live)
	var badges := Badges.new()
	badges.map = self
	add_child(badges)
	# Start on the remembered node, else the newest unlocked level.
	var remembered: int = last_index.get(world, -1)
	if remembered >= 0 and remembered < nodes.size() and nodes[remembered]["unlocked"]:
		index = remembered
	else:
		index = 0
		for i in nodes.size():
			if nodes[i]["unlocked"] and not nodes[i]["bonus"] and not nodes[i].has("gate"):
				index = i
	_gang_pos = nodes[index]["pos"]
	var slots := Net.all_slots() if Net.is_online() else InputRouter.get_bound_slots()
	if slots.is_empty():
		slots = [0]
	for k in slots.size():
		var rig := CharacterRig.new()
		rig.scale = Vector2.ONE * 0.9
		rig.z_index = 10
		add_child(rig)
		rig.build(GameManager.character_for(slots[k]))
		rig.position = _gang_pos
		_gang.append(rig)
	_build_ui()
	_refresh_panel()
	if LevelCatalog.dev_unlock:
		_show_toast("Dev: everything unlocked (F9 to undo)")
	if Net.is_online():
		# The host's save decides what's open; friends ride along.
		for n in nodes:
			n["unlocked"] = n["unlocked"] or Net.is_client()
		if Net.is_client():
			_show_toast("The host picks the level - enjoy the ride!")
	Audio.play_music({"w1": "worldmap", "w2": "gondola", "w3": "treetops"}.get(world, "worldmap"))


func _build_nodes() -> void:
	if world == "w1":
		nodes.append({"id": "bonus", "pos": BONUS_POS, "name": "Bonus Dreams", "bonus": true, "unlocked": true, "done": false,
				"blurb": "Hop in the balloon to visit the old favourites: the Playground, Candy Canopy, Sunset Gusts and Glacier Grotto."})
	else:
		var back := LevelCatalog.previous_world(world)
		nodes.append({"id": "gate_" + back, "pos": GATE_W1_POS, "name": GATE_TEXT[back][1], "bonus": false, "gate": back,
				"unlocked": true, "done": false, "blurb": "Head back to World %d." % LevelCatalog.world_number(back)})
	for l in LevelCatalog.levels_in(world):
		nodes.append({"id": l["id"], "pos": l["map"], "name": l["name"], "blurb": l["blurb"], "bonus": false,
				"unlocked": LevelCatalog.is_unlocked(l["id"]), "done": SaveData.get_record(l["id"]).get("done", false),
				"boss": l.get("boss", false), "scene": l["scene"]})
	var onward := LevelCatalog.next_world(world)
	if onward != "" and LevelCatalog.exists(onward + "_1"):
		nodes.append({"id": "gate_" + onward, "pos": GATE_W2_POS, "name": GATE_TEXT[onward][0], "bonus": false, "gate": onward,
				"unlocked": LevelCatalog.world_done(world) or OS.has_feature("unlock_all"), "done": false,
				"blurb": GATE_TEXT[onward][2]})
	var pts: Array[Vector2] = []
	for n in nodes:
		pts.append(n["pos"])
	_path = _smooth(pts, 14)


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	var totals := SaveData.world_totals(world)
	var title := UIStyle.label("World %d  -  %s" % [LevelCatalog.world_number(world), LevelCatalog.world_info(world).get("name", "")],
			46, Color.WHITE, 12)
	title.position = Vector2(40, 28)
	layer.add_child(title)
	var sub := UIStyle.label("Levels %d / %d      Dream Gems %d / %d      Snoozlings %d / %d" % [
			totals["done"], totals["levels"], totals["gems"], totals["gems_total"], totals["snoozlings"], totals["levels"]],
			24, Color.WHITE, 8)
	sub.position = Vector2(44, 92)
	layer.add_child(sub)
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override(&"panel", UIStyle.panel(Color(UIStyle.PANEL, 0.95), 18, 5))
	pc.position = Vector2(560, 900)
	pc.custom_minimum_size = Vector2(800, 150)
	layer.add_child(pc)
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 2)
	pc.add_child(v)
	_panel_name = UIStyle.label("", 34, UIStyle.INK)
	v.add_child(_panel_name)
	_panel_blurb = UIStyle.label("", 20, Color(UIStyle.INK, 0.8))
	_panel_blurb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_panel_blurb.custom_minimum_size.x = 740
	v.add_child(_panel_blurb)
	_panel_stats = UIStyle.label("", 22, UIStyle.ACCENT)
	v.add_child(_panel_stats)
	var hint := UIStyle.label("Left / Right: walk     Jump: play     Punch: back     Pause: controls", 20, Color.WHITE, 6)
	hint.position = Vector2(40, 1044)
	layer.add_child(hint)
	_toast = UIStyle.label("", 28, Color.WHITE, 10)
	_toast.position = Vector2(560, 840)
	_toast.custom_minimum_size.x = 800
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layer.add_child(_toast)


func _refresh_panel() -> void:
	var n := nodes[index]
	_panel_name.text = n["name"] + ("   (BOSS)" if n.get("boss", false) else "")
	_panel_blurb.text = n["blurb"]
	if n["bonus"]:
		_panel_stats.text = "Always open"
	elif n.has("gate"):
		_panel_stats.text = "Press JUMP to ride" if n["unlocked"] else "Locked - beat Thornwood Keep's boss first"
	elif not n["unlocked"]:
		_panel_stats.text = "Locked - finish the level before it"
	else:
		var r := SaveData.get_record(n["id"])
		if r.is_empty():
			_panel_stats.text = "New!  3 Dream Gems and a caged Snoozling to find"
		else:
			var g := 0
			for x in r.get("gems", []):
				g += 1 if x else 0
			_panel_stats.text = "Best %s    Lums %d    Gems %d/3    Snoozling %s" % [
					UIStyle.fmt_time(r.get("time", 0.0)), r.get("lums", 0), g, "rescued" if r.get("snoozling", false) else "caged"]


func _process(delta: float) -> void:
	_t += delta
	_shake = maxf(_shake - delta * 3.0, 0.0)
	_toast_t -= delta
	_toast.modulate.a = clampf(_toast_t * 2.0, 0.0, 1.0)
	if _controls:
		_menu.poll(false)
		if _menu.pause or _menu.confirm or _menu.back:
			_controls.queue_free()
			_controls = null
		_update_gang(delta)
		return
	if _walking:
		_walk_t += WALK_SPEED * delta
		var p := _sample(_walk_pts, _walk_t)
		if absf(p.x - _gang_pos.x) > 0.5:
			_facing = signf(p.x - _gang_pos.x)
		_gang_pos = p
		if _walk_t >= _walk_len:
			_walking = false
			index = _walk_to
			last_index[world] = index
			_refresh_panel()
		_update_gang(delta)
		return
	if Net.is_client():
		_follow_host_cursor()
		_update_gang(delta)
		return
	if Net.is_host():
		Net.map_index = index
	_menu.poll()
	if _menu.right:
		_try_walk(index + 1)
	elif _menu.left:
		_try_walk(index - 1)
	elif _menu.confirm:
		_enter()
	elif _menu.back:
		set_process(false)
		GameManager.goto_scene(GameManager.CHARACTER_SELECT)
	elif _menu.pause:
		_controls = CanvasLayer.new()
		_controls.layer = 20
		_controls.add_child(ControlsCard.overlay())
		add_child(_controls)
	_update_gang(delta)


## Online friends: walk to wherever the host's gang is standing.
func _follow_host_cursor() -> void:
	_menu.poll(false)
	if _menu.pause:
		_controls = CanvasLayer.new()
		_controls.layer = 20
		_controls.add_child(ControlsCard.overlay())
		add_child(_controls)
		return
	var target := int(Net.host_value("mi", -1))
	if target < 0 or target >= nodes.size() or target == index:
		return
	_try_walk(index + signi(target - index))


func _unhandled_input(event: InputEvent) -> void:
	# Dev shortcut: F9 opens every level, world and outfit (this session only).
	if event is InputEventKey and event.pressed and not event.echo and (event as InputEventKey).keycode == KEY_F9 and not Net.is_client():
		LevelCatalog.dev_unlock = not LevelCatalog.dev_unlock
		last_index[world] = index
		GameManager.goto_scene(GameManager.WORLD_MAP)


func _try_walk(to: int) -> void:
	if to < 0 or to >= nodes.size():
		return
	if not nodes[to]["unlocked"]:
		_shake = 1.0
		_show_toast("Locked! Finish %s first." % nodes[to - 1]["name"])
		Audio.play("clank", -6.0)
		return
	_walk_to = to
	var a := index
	var b := to
	var seg := _smooth_segment(a, b)
	_walk_pts = seg
	_walk_len = _poly_len(seg)
	_walk_t = 0.0
	_walking = true


func _enter() -> void:
	var n := nodes[index]
	if not n["unlocked"]:
		return
	set_process(false)
	last_index[world] = index
	Audio.play("menu_ok", -4.0)
	if n.has("gate"):
		# To the next world: start at its first level. Back: stand by that world's onward gate.
		var forward: bool = LevelCatalog.story_worlds().find(n["gate"]) > LevelCatalog.story_worlds().find(world)
		world = n["gate"]
		last_index[world] = 1 if forward else LevelCatalog.levels_in(world).size() + 1
		GameManager.goto_scene(GameManager.WORLD_MAP)
	elif n["bonus"]:
		GameManager.goto_scene(GameManager.LEVEL_SELECT)
	else:
		GameManager.goto_scene(n["scene"])


func _show_toast(text: String) -> void:
	_toast.text = text
	_toast_t = 2.0


func _update_gang(delta: float) -> void:
	var state := &"Run" if _walking else &"Ground"
	for k in _gang.size():
		var rig := _gang[k]
		# Stand just behind the badge (on the path), in a little huddle.
		var off := Vector2(-(k + 1) * 30.0 * _facing - 14.0 * _facing, -2.0 + (k % 2) * 8.0)
		var target := _gang_pos + (off if not _walking else Vector2(-k * 26.0 * _facing, (k % 2) * 6.0))
		rig.position = rig.position.lerp(target, clampf(14.0 * delta, 0.0, 1.0))
		rig.scale.x = absf(rig.scale.x) * _facing
		var speed := WALK_SPEED * _facing if _walking else 0.0
		rig.update_pose(&"Ground", Vector2(speed, 0), true, WALK_SPEED, delta)


# --- Path maths -----------------------------------------------------------------------

## Catmull-Rom through the points, `steps` samples per segment.
func _smooth(pts: Array[Vector2], steps: int) -> PackedVector2Array:
	var out := PackedVector2Array()
	for i in pts.size() - 1:
		var p0 := pts[maxi(i - 1, 0)]
		var p1 := pts[i]
		var p2 := pts[i + 1]
		var p3 := pts[mini(i + 2, pts.size() - 1)]
		for s in steps:
			var t := float(s) / steps
			out.append(_cr(p0, p1, p2, p3, t))
	out.append(pts[pts.size() - 1])
	return out


func _smooth_segment(a: int, b: int) -> PackedVector2Array:
	var lo := mini(a, b)
	var pts: Array[Vector2] = []
	for n in nodes:
		pts.append(n["pos"])
	var p0 := pts[maxi(lo - 1, 0)]
	var p1 := pts[lo]
	var p2 := pts[lo + 1]
	var p3 := pts[mini(lo + 2, pts.size() - 1)]
	var out := PackedVector2Array()
	for s in 31:
		out.append(_cr(p0, p1, p2, p3, float(s) / 30.0))
	if b < a:
		out.reverse()
	return out


static func _cr(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, t: float) -> Vector2:
	var t2 := t * t
	var t3 := t2 * t
	return 0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3)


static func _poly_len(pts: PackedVector2Array) -> float:
	var l := 0.0
	for i in pts.size() - 1:
		l += pts[i].distance_to(pts[i + 1])
	return l


static func _sample(pts: PackedVector2Array, d: float) -> Vector2:
	for i in pts.size() - 1:
		var seg := pts[i].distance_to(pts[i + 1])
		if d <= seg:
			return pts[i].lerp(pts[i + 1], d / maxf(seg, 0.001))
		d -= seg
	return pts[pts.size() - 1]


# --- The landscape (baked once) ---------------------------------------------------------

func _bake_land() -> ArrayMesh:
	var mp := MeshPainter.new()
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	# Sky + sea.
	_vgrad(mp, Rect2(0, 0, 1920, 1080), Color("7fd0f5"), Color("d8f3ff"), 12)
	var sea := Color("4fa8e0")
	mp.draw_rect(Rect2(0, 560, 1920, 520), sea)
	for i in 70:
		var p := Vector2(rng.randf_range(0, 1920), rng.randf_range(600, 1070))
		mp.draw_line(p, p + Vector2(rng.randf_range(14, 30), 0), Color(1, 1, 1, 0.35), 2.5)
	# Distant mountains along the top.
	var mts := PackedVector2Array([Vector2(0, 420)])
	for i in 25:
		var x := i * 80.0
		mts.append(Vector2(x, 330 - absf(sin(i * 1.3)) * 130.0 - rng.randf_range(0, 40)))
	mts.append(Vector2(1920, 420))
	mp.draw_colored_polygon(mts, Color("a9c7e8"))
	# The land: one big island with a wobbly shore.
	var land := PackedVector2Array()
	var c := Vector2(1000, 660)
	for i in 64:
		var a := TAU * i / 64.0
		var r := Vector2(900, 400) * (1.0 + 0.05 * sin(a * 5.0) + 0.03 * sin(a * 11.0 + 1.0))
		land.append(c + Vector2(cos(a) * r.x, sin(a) * r.y * (0.75 if sin(a) < 0 else 1.0)))
	var sand := Color("f2dfa2")
	var grown := PackedVector2Array()
	for p in land:
		grown.append(c + (p - c) * 1.03)
	mp.draw_colored_polygon(grown, sand)
	for p_i in grown.size():  # foam
		var p := grown[p_i]
		var q := grown[(p_i + 1) % grown.size()]
		mp.draw_line(p + (p - c).normalized() * 8.0, q + (q - c).normalized() * 8.0, Color(1, 1, 1, 0.6), 3.0)
	mp.draw_colored_polygon(land, Color("7cc86a"))
	# Soft hills everywhere (lighter tops).
	for i in 26:
		var h := Vector2(rng.randf_range(250, 1750), rng.randf_range(430, 920))
		if Geometry2D.is_point_in_polygon(h, land):
			var r := rng.randf_range(50, 110)
			mp.draw_colored_polygon(Art.ellipse(h, r, r * 0.45, 20), Color("6bbd5c"))
			mp.draw_colored_polygon(Art.ellipse(h + Vector2(-r * 0.2, -r * 0.12), r * 0.6, r * 0.22, 16), Color("8fd67c"))
	_region_meadow(mp, Vector2(250, 800))
	_region_fields(mp, Vector2(560, 640), rng)
	_region_hollow(mp, Vector2(860, 790))
	_region_canopy(mp, Vector2(1150, 560))
	_region_river(mp, Vector2(1440, 760))
	_region_keep(mp, Vector2(1680, 380))
	_region_dock(mp, BONUS_POS)
	if LevelCatalog.exists("w2_1"):
		_region_station(mp, GATE_W2_POS)
	# Scattered trees (not on top of regions).
	for i in 60:
		var p := Vector2(rng.randf_range(200, 1800), rng.randf_range(450, 960))
		if not Geometry2D.is_point_in_polygon(p, land):
			continue
		var clear := true
		for n in nodes:
			if p.distance_to(n["pos"]) < 110.0:
				clear = false
		if clear and _path_dist(p) > 36.0:
			_tree(mp, p, rng.randf_range(0.6, 1.0))
	# The path: an outline, a sandy fill, then dashes.
	mp.draw_polyline(_path, Color("6b4a2e"), 22.0)
	mp.draw_polyline(_path, Color("f4e2b0"), 16.0)
	var d := 0.0
	var total := _poly_len(_path)
	while d < total:
		mp.draw_circle(_sample(_path, d), 3.0, Color("c9a86a"))
		d += 22.0
	return mp.build()


# --- World 2: Frostwhistle Peaks (baked once) --------------------------------------------

func _bake_w2() -> ArrayMesh:
	var mp := MeshPainter.new()
	var rng := RandomNumberGenerator.new()
	rng.seed = 21
	var snow := Color("f4f9ff")
	var shade := Color("d6e4f3")
	var rock := Color("7d8ba6")
	var rock_dark := Color("5d6b86")
	_vgrad(mp, Rect2(0, 0, 1920, 1080), Color("7fa8e6"), Color("e6f2ff"), 12)
	# Far range: jagged blue peaks with snow caps.
	var far := PackedVector2Array([Vector2(0, 520)])
	var caps: Array[PackedVector2Array] = []
	var x := 0.0
	while x <= 1960.0:
		var h := 170.0 + absf(sin(x * 0.011)) * 150.0 + rng.randf_range(0, 50)
		var top := Vector2(x + 60.0, 470.0 - h)
		far.append(Vector2(x, 470.0))
		far.append(top)
		caps.append(PackedVector2Array([top, top + Vector2(34, 46), top + Vector2(12, 38), top + Vector2(-4, 50), top + Vector2(-30, 42)]))
		x += 120.0
	far.append(Vector2(1920, 470))
	far.append(Vector2(1920, 520))
	mp.draw_colored_polygon(far, Color("a3bde0"))
	for c in caps:
		mp.draw_colored_polygon(c, Color("f0f6ff"))
	# The great summit (World 2's boss) towering on the right.
	var peak := Vector2(1640, 140)
	var mtn := PackedVector2Array([Vector2(1180, 1080), Vector2(1380, 620), Vector2(1500, 420), peak, Vector2(1760, 380),
			Vector2(1900, 560), Vector2(1920, 1080)])
	mp.draw_colored_polygon(mtn, rock)
	mp.draw_colored_polygon(PackedVector2Array([peak, Vector2(1760, 380), Vector2(1900, 560), Vector2(1920, 1080), Vector2(1640, 1080)]), rock_dark)
	mp.draw_colored_polygon(PackedVector2Array([peak, Vector2(1700, 250), Vector2(1670, 236), Vector2(1650, 262), Vector2(1610, 240),
			Vector2(1570, 270), Vector2(1545, 250)]), snow)
	# Snowfields: rolling white land across the bottom of the map.
	var land := PackedVector2Array([Vector2(0, 1080), Vector2(0, 640)])
	for i in 25:
		var lx := i * 80.0
		land.append(Vector2(lx, 620.0 + sin(i * 0.9) * 40.0 + rng.randf_range(-10, 10)))
	land.append(Vector2(1920, 640))
	land.append(Vector2(1920, 1080))
	mp.draw_colored_polygon(land, snow)
	for i in 22:
		var h := Vector2(rng.randf_range(60, 1860), rng.randf_range(660, 1040))
		var r := rng.randf_range(60, 130)
		mp.draw_colored_polygon(Art.ellipse(h, r, r * 0.35, 20), shade)
		mp.draw_colored_polygon(Art.ellipse(h + Vector2(-r * 0.2, -r * 0.08), r * 0.7, r * 0.2, 16), snow)
	# Regions.
	_w2_village(mp, Vector2(230, 860))
	_w2_cliffs(mp, Vector2(520, 700), rock, rock_dark, snow)
	_w2_caverns(mp, Vector2(820, 820))
	_w2_avalanche(mp, Vector2(1110, 620), rock, snow, shade)
	_w2_springs(mp, Vector2(1420, 780))
	_w2_throne(mp, Vector2(1640, 300))
	# Pine forests (not on the regions or the path).
	for i in 90:
		var p := Vector2(rng.randf_range(40, 1880), rng.randf_range(640, 1060))
		var clear := true
		for n in nodes:
			if p.distance_to(n["pos"]) < 115.0:
				clear = false
		if clear and _path_dist(p) > 34.0 and p.x < 1280.0 + (p.y - 640.0) * 0.4:
			_pine(mp, p, rng.randf_range(0.6, 1.1))
	# The path: packed-snow trail with footprints.
	mp.draw_polyline(_path, Color("8a9bb8"), 22.0)
	mp.draw_polyline(_path, Color("eaf2fb"), 16.0)
	var d := 0.0
	var total := _poly_len(_path)
	while d < total:
		mp.draw_circle(_sample(_path, d), 3.0, Color("b3c3da"))
		d += 22.0
	return mp.build()


func _pine(mp: MeshPainter, base: Vector2, s: float) -> void:
	mp.draw_rect(Rect2(base + Vector2(-3, -10) * s, Vector2(6, 10) * s), Color("6b4a2e"))
	for k in 3:
		var y := -8.0 - k * 12.0
		var w := 16.0 - k * 4.0
		mp.draw_colored_polygon(PackedVector2Array([base + Vector2(-w, y) * s, base + Vector2(0, y - 18.0) * s, base + Vector2(w, y) * s]), Color("2f6b5c"))
		mp.draw_colored_polygon(PackedVector2Array([base + Vector2(-w * 0.5, y - 6.0) * s, base + Vector2(0, y - 18.0) * s, base + Vector2(w * 0.2, y - 9.0) * s]), Color("f4f9ff"))


func _igloo(mp: MeshPainter, c: Vector2, s: float) -> void:
	mp.draw_colored_polygon(Art.ellipse(c, 30 * s, 22 * s, 18), Color("dbe8f6"))
	var dome := PackedVector2Array()
	for i in 13:
		var a := PI + i * PI / 12.0
		dome.append(c + Vector2(cos(a) * 28.0, sin(a) * 24.0) * s)
	mp.draw_colored_polygon(dome, Color("ffffff"))
	for r in 2:
		mp.draw_line(c + Vector2(-24 + r * 4, -8 - r * 8) * s, c + Vector2(24 - r * 4, -8 - r * 8) * s, Color("c7dcef"), 2.0)
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(-8, -4) * s, 7 * s, 9 * s, 10), Color("3a4a66"))


func _w2_village(mp: MeshPainter, c: Vector2) -> void:
	_igloo(mp, c + Vector2(-90, -6), 1.0)
	_igloo(mp, c + Vector2(80, 16), 0.8)
	_cottage(mp, c + Vector2(-10, -30), Color("ff5d5d"))
	for i in 5:  # a snowman and some skis
		mp.draw_circle(c + Vector2(130, -10 - i * 0.0), 9.0, Color.WHITE)
	mp.draw_circle(c + Vector2(130, -24), 6.0, Color.WHITE)
	mp.draw_line(c + Vector2(-40, 30), c + Vector2(-34, 4), Color("ff5d5d"), 3.0)
	mp.draw_line(c + Vector2(-32, 30), c + Vector2(-26, 4), Color("5bc8ff"), 3.0)


func _w2_cliffs(mp: MeshPainter, c: Vector2, rock: Color, rock_dark: Color, snow: Color) -> void:
	# Stacked cliffs with the ski lift climbing them.
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-160, 90), c + Vector2(-120, -10), c + Vector2(-40, -30), c + Vector2(-20, -120),
			c + Vector2(90, -140), c + Vector2(120, -40), c + Vector2(170, 90)]), rock)
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-20, -120), c + Vector2(90, -140), c + Vector2(80, -118), c + Vector2(-10, -104)]), snow)
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-120, -10), c + Vector2(-40, -30), c + Vector2(-44, -18), c + Vector2(-112, 0)]), snow)
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(90, -140), c + Vector2(120, -40), c + Vector2(170, 90), c + Vector2(60, 90)]), rock_dark)
	for p: Vector2 in [c + Vector2(-110, 40), c + Vector2(60, -150)]:
		mp.draw_rect(Rect2(p + Vector2(-3, -60), Vector2(6, 60)), Color("5d6b82"))
		mp.draw_rect(Rect2(p + Vector2(-12, -64), Vector2(24, 5)), Color("5d6b82"))
	mp.draw_line(c + Vector2(-110, -20), c + Vector2(60, -210), Color("1d1726"), 2.0)


func _w2_caverns(mp: MeshPainter, c: Vector2) -> void:
	# A frozen lake by a glowing cave mouth.
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(40, 80), 150, 40, 28), Color("a9dcf5"))
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(10, 72), 90, 16, 20), Color("dff3ff"))
	for k in 4:
		mp.draw_line(c + Vector2(-40 + k * 40, 70), c + Vector2(-20 + k * 40, 92), Color(1, 1, 1, 0.7), 2.0)
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(-20, -10), 110, 70, 24), Color("8a9bb8"))
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(-20, 10), 44, 40, 20), Color("2a2f55"))
	for k in 5:
		var p := c + Vector2(-70 + k * 26, 30 - (k % 2) * 10)
		var col := Color("c58bff") if k % 2 else Color("7fe8ff")
		mp.draw_circle(p + Vector2(0, -12), 16, Color(col, 0.25))
		mp.draw_colored_polygon(PackedVector2Array([p + Vector2(-6, 0), p + Vector2(0, -22), p + Vector2(6, 0)]), col)


func _w2_avalanche(mp: MeshPainter, c: Vector2, rock: Color, snow: Color, shade: Color) -> void:
	# A steep slope with a great white avalanche scar down it.
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-200, 110), c + Vector2(-60, -170), c + Vector2(40, -190), c + Vector2(220, 110)]), rock)
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-60, -170), c + Vector2(40, -190), c + Vector2(110, 110), c + Vector2(-120, 110)]), snow)
	for k in 6:
		var p := c + Vector2(-60 + k * 26, -120 + k * 40)
		mp.draw_circle(p, 12.0 - k, shade)
		mp.draw_circle(p + Vector2(-2, -2), 9.0 - k, Color.WHITE)


func _w2_springs(mp: MeshPainter, c: Vector2) -> void:
	for k in 3:
		var p := c + Vector2(-80 + k * 80, 20 + (k % 2) * 24)
		mp.draw_colored_polygon(Art.ellipse(p, 46, 18, 20), Color("8a7a78"))
		mp.draw_colored_polygon(Art.ellipse(p, 38, 13, 18), Color("7fd6d0"))
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(-8, -3), 18, 5, 12), Color(1, 1, 1, 0.5))
	_cottage(mp, c + Vector2(110, -30), Color("ff8f5a"))


func _w2_throne(mp: MeshPainter, c: Vector2) -> void:
	# Grumblefrost's icy throne near the peak: pillars of ice and a crown.
	for k in 5:
		var x := -60.0 + k * 30.0
		var h := 50.0 + (30.0 if k == 2 else 0.0) + (k % 2) * 10.0
		mp.draw_colored_polygon(PackedVector2Array([c + Vector2(x - 12, 20), c + Vector2(x - 4, 20 - h), c + Vector2(x + 4, 20 - h - 12),
				c + Vector2(x + 12, 20)]), Color("bfe9ff"))
		mp.draw_line(c + Vector2(x - 2, 14), c + Vector2(x + 1, 24 - h), Color(1, 1, 1, 0.8), 2.0)
	mp.draw_rect(Rect2(c + Vector2(-80, 20), Vector2(160, 16)), Color("9fb9d6"))


# --- World 3: Rainbloom Jungle (baked once) -------------------------------------------------

func _bake_w3() -> ArrayMesh:
	var mp := MeshPainter.new()
	var rng := RandomNumberGenerator.new()
	rng.seed = 31
	var leaf := Color("3fb34a")
	var leaf_dark := Color("23803a")
	var leaf_light := Color("6fd65f")
	_vgrad(mp, Rect2(0, 0, 1920, 1080), Color("7fd3c8"), Color("eef8d8"), 12)
	# Misty green mountains with waterfalls.
	var far := PackedVector2Array([Vector2(0, 560)])
	var x := 0.0
	while x <= 1960.0:
		far.append(Vector2(x, 470.0 - absf(sin(x * 0.006)) * 200.0 - rng.randf_range(0, 40)))
		x += 80.0
	far.append(Vector2(1920, 560))
	mp.draw_colored_polygon(far, Color("a8d6b4"))
	for wx: float in [380.0, 980.0, 1520.0]:
		mp.draw_rect(Rect2(wx, 330, 14, 220), Color(1, 1, 1, 0.55))
	# The temple (World 3's boss) on its hill, top right.
	var hill := PackedVector2Array([Vector2(1380, 1080), Vector2(1450, 520), Vector2(1560, 400), Vector2(1760, 400), Vector2(1880, 560),
			Vector2(1920, 1080)])
	mp.draw_colored_polygon(hill, Color("5aa85a"))
	_w3_temple(mp, Vector2(1650, 330))
	# The jungle floor: dense green rolling land.
	var land := PackedVector2Array([Vector2(0, 1080), Vector2(0, 620)])
	for i in 25:
		land.append(Vector2(i * 80.0, 600.0 + sin(i * 0.8) * 40.0 + rng.randf_range(-10, 10)))
	land.append(Vector2(1920, 620))
	land.append(Vector2(1920, 1080))
	mp.draw_colored_polygon(land, Color("4fa04e"))
	# The river winding down from the falls.
	var river := PackedVector2Array()
	for i in 30:
		var t := float(i) / 29.0
		river.append(Vector2(1203 + sin(t * 6.0) * 120.0 - t * 500.0, 560 + t * 520.0))
	mp.draw_polyline(river, Color("5fb8e8"), 30.0)
	mp.draw_polyline(river, Color("8fd6f5"), 14.0)
	# Regions.
	_w3_village(mp, Vector2(240, 850))
	_w3_treetops(mp, Vector2(540, 650), leaf_dark, leaf)
	_w3_ruins(mp, Vector2(850, 820))
	_w3_falls(mp, Vector2(1130, 600))
	_w3_bog(mp, Vector2(1420, 800))
	# Jungle canopy blobs and palms (not on the regions or the path).
	for i in 120:
		var p := Vector2(rng.randf_range(30, 1890), rng.randf_range(620, 1060))
		var clear := true
		for n in nodes:
			if p.distance_to(n["pos"]) < 110.0:
				clear = false
		if clear and _path_dist(p) > 34.0:
			var r := rng.randf_range(18, 34)
			mp.draw_colored_polygon(Art.ellipse(p, r, r * 0.8, 14), leaf_dark if i % 3 == 0 else leaf)
			mp.draw_colored_polygon(Art.ellipse(p + Vector2(-r * 0.25, -r * 0.25), r * 0.45, r * 0.3, 10), leaf_light)
	# The path: a muddy jungle trail with stepping stones.
	mp.draw_polyline(_path, Color("5a3b24"), 22.0)
	mp.draw_polyline(_path, Color("c9a26a"), 16.0)
	var d := 0.0
	var total := _poly_len(_path)
	while d < total:
		mp.draw_circle(_sample(_path, d), 3.0, Color("8a6a3e"))
		d += 22.0
	return mp.build()


func _w3_village(mp: MeshPainter, c: Vector2) -> void:
	for k in 2:  # stilt huts with leaf roofs
		var p := c + Vector2(-90 + k * 170, -10 + k * 20)
		for lx: float in [-16.0, 16.0]:
			mp.draw_rect(Rect2(p + Vector2(lx - 2, -6), Vector2(4, 26)), Color("6b4a2e"))
		mp.draw_rect(Rect2(p + Vector2(-26, -34), Vector2(52, 30)), Color("c98a4b"))
		mp.draw_colored_polygon(PackedVector2Array([p + Vector2(-36, -32), p + Vector2(0, -62), p + Vector2(36, -32)]), Color("8fbf3a"))
	_w3_palm(mp, c + Vector2(30, 0), 1.0)


func _w3_palm(mp: MeshPainter, base: Vector2, s: float) -> void:
	mp.draw_line(base, base + Vector2(10, -70) * s, Color("8a5a36"), 6.0 * s)
	var top := base + Vector2(10, -70) * s
	for k in 6:
		var a := -PI * 0.5 + (k - 2.5) * 0.6
		var tip := top + Vector2(cos(a) * 40.0, sin(a) * 16.0 + 18.0) * s
		var n := (tip - top).normalized().orthogonal() * 6.0 * s
		mp.draw_colored_polygon(PackedVector2Array([top, top.lerp(tip, 0.5) + n, tip, top.lerp(tip, 0.5) - n * 0.3]), Color("3fb34a"))


func _w3_treetops(mp: MeshPainter, c: Vector2, dark: Color, leaf: Color) -> void:
	# Three giant trees linked by rope bridges.
	var xs: Array[float] = [-120.0, 0.0, 120.0]
	for k in 3:
		var p := c + Vector2(xs[k], -40 + (k % 2) * 20)
		mp.draw_rect(Rect2(p + Vector2(-10, 0), Vector2(20, 110)), Color("6b4a2e"))
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(0, -10), 60, 42, 18), dark)
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(-10, -22), 40, 26, 14), leaf)
	for k in 2:
		var a := c + Vector2(xs[k] + 20, 10 + (k % 2) * 20)
		var b := c + Vector2(xs[k + 1] - 20, 10 + ((k + 1) % 2) * 20)
		var pts := PackedVector2Array()
		for i in 9:
			var t := float(i) / 8.0
			pts.append(a.lerp(b, t) + Vector2(0, sin(t * PI) * 12.0))
		mp.draw_polyline(pts, Color("c9a86a"), 4.0)


func _w3_ruins(mp: MeshPainter, c: Vector2) -> void:
	var stone := Color("a9a07a")
	for k in 4:  # a small stepped shrine
		var w := 150.0 - k * 34.0
		mp.draw_rect(Rect2(c + Vector2(-w * 0.5, -k * 22 - 22), Vector2(w, 22)), stone.darkened(k * 0.04))
	mp.draw_rect(Rect2(c + Vector2(-12, -22), Vector2(24, 22)), Color("3a3628"))
	for p: Vector2 in [c + Vector2(-110, 0), c + Vector2(110, 10)]:  # broken pillars
		mp.draw_rect(Rect2(p + Vector2(-10, -50), Vector2(20, 50)), stone)
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(0, -50), 14, 5, 10), Color("5fae4a"))


func _w3_falls(mp: MeshPainter, c: Vector2) -> void:
	# A rocky cliff with the great waterfall.
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-110, 80), c + Vector2(-80, -160), c + Vector2(60, -190), c + Vector2(130, 80)]), Color("7a7058"))
	mp.draw_rect(Rect2(c + Vector2(60, -180), Vector2(36, 240)), Color(0.9, 0.97, 1.0, 0.9))
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(78, 64), 50, 14, 16), Color(1, 1, 1, 0.9))
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(-30, -168), 70, 20, 16), Color("4fa04e"))


func _w3_bog(mp: MeshPainter, c: Vector2) -> void:
	for k in 3:  # dark pools with lily pads
		var p := c + Vector2(-90 + k * 90, 20 + (k % 2) * 22)
		mp.draw_colored_polygon(Art.ellipse(p, 50, 18, 20), Color("2f4a3a"))
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(-10, -2), 12, 5, 10), Color("7ad13f"))
	for k in 3:  # dead trees
		var p := c + Vector2(-120 + k * 120, -30)
		mp.draw_line(p, p + Vector2(0, -60), Color("4a3a28"), 6.0)
		mp.draw_line(p + Vector2(0, -40), p + Vector2(18, -58), Color("4a3a28"), 4.0)


func _w3_temple(mp: MeshPainter, c: Vector2) -> void:
	# Chamelia's great stepped temple.
	var stone := Color("c9a46a")
	for k in 6:
		var w := 300.0 - k * 46.0
		mp.draw_rect(Rect2(c + Vector2(-w * 0.5, 70 - k * 30), Vector2(w, 30)), stone.lerp(Color("e8c88a"), k * 0.05))
	mp.draw_rect(Rect2(c + Vector2(-30, -110), Vector2(60, 30)), stone.darkened(0.1))
	mp.draw_rect(Rect2(c + Vector2(-12, -104), Vector2(24, 24)), Color("3a2a1a"))
	mp.draw_rect(Rect2(c + Vector2(-18, 70), Vector2(36, 30)), Color("3a2a1a"))
	for k in 4:  # vines down the sides
		var x := -130.0 + k * 86.0
		mp.draw_line(c + Vector2(x, 0), c + Vector2(x + 6, 80), Color("3f8f3a"), 3.0)


func _path_dist(p: Vector2) -> float:
	var best := 1e9
	for q in _path:
		best = minf(best, p.distance_to(q))
	return best


func _vgrad(mp: MeshPainter, r: Rect2, top: Color, bot: Color, bands: int) -> void:
	for i in bands:
		mp.draw_rect(Rect2(r.position.x, r.position.y + r.size.y * i / bands, r.size.x, r.size.y / bands + 1.0), top.lerp(bot, float(i) / (bands - 1)))


func _tree(mp: MeshPainter, base: Vector2, s: float) -> void:
	mp.draw_rect(Rect2(base + Vector2(-3, -14) * s, Vector2(6, 14) * s), Color("6b4a2e"))
	mp.draw_colored_polygon(Art.ellipse(base + Vector2(0, -24) * s, 16 * s, 14 * s, 14), Color("3f9a44"))
	mp.draw_colored_polygon(Art.ellipse(base + Vector2(-4, -28) * s, 9 * s, 7 * s, 12), Color("5fbf55"))


func _cottage(mp: MeshPainter, at: Vector2, roof: Color) -> void:
	mp.draw_rect(Rect2(at + Vector2(-18, -22), Vector2(36, 22)), Color("fff1d6"))
	mp.draw_colored_polygon(PackedVector2Array([at + Vector2(-24, -20), at + Vector2(0, -40), at + Vector2(24, -20)]), roof)
	mp.draw_rect(Rect2(at + Vector2(-5, -12), Vector2(10, 12)), Color("8a5a36"))
	mp.draw_rect(Rect2(at + Vector2(8, -18), Vector2(7, 7)), Color("ffd98a"))
	mp.draw_rect(Rect2(at + Vector2(10, -44), Vector2(6, 12)), Color("8a7a70"))


func _region_meadow(mp: MeshPainter, c: Vector2) -> void:
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(0, 10), 140, 60, 24), Color("9be07e"))
	_cottage(mp, c + Vector2(-80, -10), Color("e0503c"))
	_cottage(mp, c + Vector2(80, 10), Color("5b8cff"))
	for i in 6:  # fence
		mp.draw_line(c + Vector2(-60 + i * 22, 50), c + Vector2(-60 + i * 22, 36), Color("8a5a36"), 3.0)
	mp.draw_line(c + Vector2(-64, 42), c + Vector2(54, 42), Color("8a5a36"), 3.0)
	for i in 14:
		var p := c + Vector2(sin(i * 2.1) * 120, 30 + cos(i * 1.3) * 26)
		mp.draw_circle(p, 3.0, [Color("ff5d8f"), Color("ffd23f"), Color.WHITE][i % 3])


func _region_fields(mp: MeshPainter, c: Vector2, rng: RandomNumberGenerator) -> void:
	for k in 3:
		var p := c + Vector2(-90 + k * 70, 20 + k * 8)
		mp.draw_colored_polygon(PackedVector2Array([p + Vector2(-50, 20), p + Vector2(-30, -20), p + Vector2(50, -24), p + Vector2(40, 22)]), Color("e9d25a").darkened(k * 0.06))
		for j in 5:
			mp.draw_line(p + Vector2(-36 + j * 16, 16), p + Vector2(-26 + j * 16, -16), Color("c9a83a"), 2.0)
	# Windmill body (blades are animated live).
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(40, -10), c + Vector2(48, -70), c + Vector2(66, -70), c + Vector2(74, -10)]), Color("f4e8d0"))
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(44, -70), c + Vector2(57, -86), c + Vector2(70, -70)]), Color("b5533c"))
	for i in 8:
		var p := c + Vector2(rng.randf_range(-130, 110), rng.randf_range(-40, 60))
		mp.draw_line(p, p + Vector2(0, -16), Color("6fbf4a"), 2.0)
		mp.draw_circle(p + Vector2(0, -18), 6.0, Color(1, 1, 1, 0.9))


func _region_hollow(mp: MeshPainter, c: Vector2) -> void:
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(0, -10), 130, 80, 28), Color("5a8a52"))
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(-30, -40), 70, 36, 20), Color("6fa860"))
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(10, 20), 42, 38, 20), Color("2a2340"))  # cave mouth
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(10, 30), 30, 22, 16), Color("16111f"))
	for k in 4:
		var p := c + Vector2(-80 + k * 48, 44 + (k % 2) * 8)
		var col := Color("ff8ad8") if k % 2 else Color("8affe0")
		mp.draw_circle(p + Vector2(0, -12), 18, Color(col, 0.2))
		mp.draw_rect(Rect2(p + Vector2(-2, -10), Vector2(4, 10)), Color("e8e0d0"))
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(0, -12), 10, 6, 12), col)


func _region_canopy(mp: MeshPainter, c: Vector2) -> void:
	for k in 3:
		var p := c + Vector2(-90 + k * 90, 40 - (k % 2) * 20)
		mp.draw_rect(Rect2(p + Vector2(-12, -110), Vector2(24, 110)), Color("7a4e2d"))
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(0, -130), 62, 44, 20), Color("2f8a3b"))
		mp.draw_colored_polygon(Art.ellipse(p + Vector2(-12, -140), 40, 26, 16), Color("4fb548"))
		mp.draw_rect(Rect2(p + Vector2(-26, -80), Vector2(52, 8)), Color("c98a4b"))
		mp.draw_rect(Rect2(p + Vector2(-14, -104), Vector2(28, 24)), Color("e8c890"))
		mp.draw_colored_polygon(PackedVector2Array([p + Vector2(-20, -102), p + Vector2(0, -120), p + Vector2(20, -102)]), Color("ffcf3f"))
	for k in 2:  # rope bridges
		var a := c + Vector2(-78 + k * 90, -76 + (k % 2) * -20)
		var b := c + Vector2(-12 + k * 90, -96 + (k % 2) * 20)
		var pts := PackedVector2Array()
		for i in 9:
			var t := i / 8.0
			pts.append(a.lerp(b, t) + Vector2(0, sin(t * PI) * 10.0))
		mp.draw_polyline(pts, Color("8a6a45"), 3.0)


func _region_river(mp: MeshPainter, c: Vector2) -> void:
	# River from the mountains down to the sea, past the mill.
	var pts := PackedVector2Array()
	for i in 13:
		var t := i / 12.0
		pts.append(Vector2(lerpf(1520, 1400, t) + sin(t * 7.0) * 40.0, lerpf(360, 1060, t)))
	mp.draw_polyline(pts, Color("3d8ec9"), 34.0)
	mp.draw_polyline(pts, Color("5fb8e8"), 24.0)
	mp.draw_rect(Rect2(c + Vector2(30, -50), Vector2(60, 50)), Color("e8d5b0"))
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(22, -48), c + Vector2(60, -78), c + Vector2(98, -48)]), Color("b5533c"))
	mp.draw_circle(c + Vector2(22, -24), 26, Color("8a5a36"), false, 5.0)


func _region_keep(mp: MeshPainter, c: Vector2) -> void:
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-150, 120), c + Vector2(-90, -10), c + Vector2(-20, -40), c + Vector2(80, -20), c + Vector2(150, 120)]), Color("5a4a60"))
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-110, 120), c + Vector2(-70, 20), c + Vector2(40, 10), c + Vector2(110, 120)]), Color("6a5a70"))
	var castle := Color("4d3b52")
	for t: Vector3 in [Vector3(-50, 90, 26), Vector3(0, 130, 34), Vector3(50, 100, 26)]:
		var top := c + Vector2(t.x, -30 - t.y + 90)
		mp.draw_rect(Rect2(top + Vector2(-t.z * 0.5, 0), Vector2(t.z, t.y)), castle)
		mp.draw_colored_polygon(PackedVector2Array([top + Vector2(-t.z * 0.7, 0), top + Vector2(0, -t.z * 1.2), top + Vector2(t.z * 0.7, 0)]), Color("b8435e"))
		mp.draw_rect(Rect2(top + Vector2(-4, 16), Vector2(8, 12)), Color("ffcf6a"))
	mp.draw_rect(Rect2(c + Vector2(-70, 20), Vector2(140, 40)), castle)
	for k in 6:  # thorny vines climbing the crag
		var p := c + Vector2(-120 + k * 45, 110)
		var pts := PackedVector2Array()
		for i in 6:
			pts.append(p + Vector2(sin(i * 1.4 + k) * 10, -i * 16))
		mp.draw_polyline(pts, Color("43305a"), 4.0)


func _region_station(mp: MeshPainter, c: Vector2) -> void:
	# A little gondola station on the crag, with a cable up into the clouds.
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-70, 40), c + Vector2(-40, -10), c + Vector2(50, -14), c + Vector2(80, 40)]), Color("7d7a90"))
	mp.draw_rect(Rect2(c + Vector2(-34, -40), Vector2(60, 32)), Color("e8d5b0"))
	mp.draw_colored_polygon(PackedVector2Array([c + Vector2(-42, -38), c + Vector2(-4, -62), c + Vector2(34, -38)]), Color("5b8cff"))
	mp.draw_line(c + Vector2(26, -50), Vector2(1960, -40), Color("1d1726"), 2.5)


func _region_dock(mp: MeshPainter, c: Vector2) -> void:
	mp.draw_rect(Rect2(c + Vector2(-40, 20), Vector2(110, 12)), Color("8a5a36"))
	for i in 4:
		mp.draw_rect(Rect2(c + Vector2(-36 + i * 32, 30), Vector2(6, 24)), Color("6b4a2e"))


## The baked landscape.
class MapArt extends Node2D:
	var mesh: ArrayMesh

	func _init(m: ArrayMesh) -> void:
		mesh = m

	func _draw() -> void:
		draw_mesh(mesh, null)


## Little animated things: clouds, windmill, river sparkle, flags, the balloon.
class LiveBits extends Node2D:
	var map: WorldMap
	var t := 0.0

	func _process(delta: float) -> void:
		t += delta
		queue_redraw()

	func _draw() -> void:
		if map.world == "w2":
			_draw_w2()
			return
		if map.world == "w3":
			_draw_w3()
			return
		# Gondola bobbing up the cable to World 2.
		if LevelCatalog.exists("w2_1"):
			var a := WorldMap.GATE_W2_POS + Vector2(26, -50)
			var b := Vector2(1960, -40)
			var f := fposmod(t * 0.08, 1.0)
			var g := a.lerp(b, f)
			draw_line(g, g + Vector2(0, 14), Color("1d1726"), 2.0)
			Art.shape(self, Art.rounded_rect(g + Vector2(-12, 14), g + Vector2(12, 34), 4.0), Color("ff5d5d"), Color("1d1726"), 2.0)
			draw_rect(Rect2(g + Vector2(-8, 18), Vector2(16, 6)), Color("bfe6ff"))
		# Windmill blades.
		var hub := Vector2(617, 570)
		for k in 4:
			var a := t * 1.5 + k * PI * 0.5
			var d := Vector2(cos(a), sin(a))
			draw_line(hub, hub + d * 40.0, Color("6b4a2e"), 3.0)
			draw_colored_polygon(PackedVector2Array([hub + d * 10 + d.orthogonal() * 2, hub + d * 40 + d.orthogonal() * 2, hub + d * 40 + d.orthogonal() * 10, hub + d * 14 + d.orthogonal() * 8]), Color("fff8ec"))
		draw_circle(hub, 4.0, Color("6b4a2e"))
		# Water wheel.
		var wh := Vector2(1462, 736)
		for k in 8:
			var a := -t * 2.0 + k * TAU / 8.0
			draw_line(wh, wh + Vector2(cos(a), sin(a)) * 24.0, Color("6b4a2e"), 3.0)
		# River sparkles.
		for i in 10:
			var ph := fposmod(t * 0.3 + i * 0.1, 1.0)
			var p := Vector2(lerpf(1520, 1400, ph) + sin(ph * 7.0) * 40.0, lerpf(360, 1060, ph))
			draw_circle(p, 2.5, Color(1, 1, 1, 0.8))
		# Castle flag.
		var pole := Vector2(1680, 206)
		draw_line(pole, pole + Vector2(0, -30), Color("1d1726"), 2.0)
		var flag := PackedVector2Array()
		for i in 6:
			flag.append(pole + Vector2(i * 6, -30 + sin(t * 6.0 + i) * 2.0))
		for i in range(5, -1, -1):
			flag.append(pole + Vector2(i * 6, -18 + sin(t * 6.0 + i) * 2.0))
		draw_colored_polygon(flag, Color("ff5d3f"))
		# Chimney smoke in the meadow.
		for k in 2:
			var base := Vector2(183 if k == 0 else 343, 758 if k == 0 else 778)
			for i in 4:
				var ph := fposmod(t * 0.4 + i * 0.25, 1.0)
				draw_circle(base + Vector2(sin(ph * 6.0) * 6.0, -ph * 50.0), 4.0 + ph * 6.0, Color(1, 1, 1, 0.5 * (1.0 - ph)))
		# Hot-air balloon bobbing at the dock (Bonus Dreams).
		var b := WorldMap.BONUS_POS + Vector2(20, -70 + sin(t * 1.5) * 6.0)
		draw_line(b + Vector2(-14, 30), b + Vector2(-8, 52), Color("1d1726"), 2.0)
		draw_line(b + Vector2(14, 30), b + Vector2(8, 52), Color("1d1726"), 2.0)
		draw_rect(Rect2(b + Vector2(-10, 50), Vector2(20, 14)), Color("8a5a36"))
		Art.shape(self, Art.ellipse(b, 34, 40, 24), Color("ff5d8f"), Color("1d1726"), 3.0)
		draw_colored_polygon(Art.ellipse(b + Vector2(-10, -10), 10, 20, 12), Color(1, 1, 1, 0.3))
		draw_line(b + Vector2(0, -40), b + Vector2(0, 40), Color("ffd23f"), 4.0)
		_clouds()

	func _clouds() -> void:
		# Drifting clouds (over everything).
		for i in 5:
			var x := fposmod(i * 460.0 + t * 12.0, 2300.0) - 200.0
			var y := 160.0 + (i % 3) * 120.0
			for k in 3:
				draw_circle(Vector2(x + k * 30, y - (k % 2) * 12), 26.0, Color(1, 1, 1, 0.75))


	func _draw_w2() -> void:
		var o := Color("1d1726")
		# The ski lift chair climbing the cliffs (Cablecar Cliffs).
		var a := Vector2(410, 680)
		var b := Vector2(580, 490)
		var f := fposmod(t * 0.12, 2.0)
		f = f if f < 1.0 else 2.0 - f
		var g := a.lerp(b, f)
		draw_line(g, g + Vector2(0, 12), o, 2.0)
		draw_rect(Rect2(g + Vector2(-10, 12), Vector2(20, 5)), Color("ffb13f"))
		# Steam from the hot springs.
		for k in 3:
			var base := Vector2(1340 + k * 80, 800 + (k % 2) * 24)
			for i in 4:
				var ph := fposmod(t * 0.35 + i * 0.25 + k * 0.1, 1.0)
				draw_circle(base + Vector2(sin(ph * 6.0 + k) * 8.0, -ph * 70.0), 5.0 + ph * 9.0, Color(1, 1, 1, 0.5 * (1.0 - ph)))
		# Smoke from the village chimney.
		for i in 4:
			var ph := fposmod(t * 0.4 + i * 0.25, 1.0)
			draw_circle(Vector2(233, 786) + Vector2(sin(ph * 6.0) * 6.0, -ph * 50.0), 4.0 + ph * 6.0, Color(1, 1, 1, 0.5 * (1.0 - ph)))
		# Crystal glints by the caverns.
		for k in 3:
			var p := Vector2(760 + k * 40, 800 - (k % 2) * 16)
			var tw := maxf(sin(t * 3.0 + k * 2.0), 0.0)
			draw_line(p + Vector2(-8, 0) * tw, p + Vector2(8, 0) * tw, Color(1, 1, 1, tw), 2.0)
			draw_line(p + Vector2(0, -8) * tw, p + Vector2(0, 8) * tw, Color(1, 1, 1, tw), 2.0)
		# The Snowball King's banner on the summit.
		var pole := Vector2(1640, 140)
		draw_line(pole, pole + Vector2(0, -34), o, 2.0)
		var flag := PackedVector2Array()
		for i in 6:
			flag.append(pole + Vector2(i * 6, -34 + sin(t * 6.0 + i) * 2.0))
		for i in range(5, -1, -1):
			flag.append(pole + Vector2(i * 6, -22 + sin(t * 6.0 + i) * 2.0))
		draw_colored_polygon(flag, Color("5bc8ff"))
		# Snow falling over the whole map.
		for i in 70:
			var x := fposmod(i * 137.0 + sin(t * 0.8 + i) * 20.0, 1920.0)
			var y := fposmod(i * 71.0 + t * (40.0 + (i % 5) * 12.0), 1080.0)
			draw_circle(Vector2(x, y), 2.0 + (i % 3), Color(1, 1, 1, 0.8))
		_clouds()

	func _draw_w3() -> void:
		var o := Color("1d1726")
		# The waterfall shimmering down the cliffs (Rumbletide Rapids).
		for k in 5:
			var ph := fposmod(t * 0.9 + k * 0.2, 1.0)
			draw_line(Vector2(1196 + k * 6, 420 + ph * 150), Vector2(1196 + k * 6, 440 + ph * 150), Color(1, 1, 1, 0.8 * (1.0 - ph)), 3.0)
		# Fireflies over the bog.
		for i in 14:
			var p := Vector2(1420, 800) + Vector2(sin(t * 0.7 + i * 1.7) * 130.0, cos(t * 0.9 + i * 2.3) * 50.0 - 30.0)
			var tw := 0.5 + 0.5 * sin(t * 4.0 + i)
			draw_circle(p, 6.0, Color(0.8, 1.0, 0.4, 0.2 * tw))
			draw_circle(p, 2.5, Color(0.9, 1.0, 0.5, tw))
		# The Colour Queen's banner on the temple, cycling colours.
		var pole := Vector2(1650, 168)
		draw_line(pole, pole + Vector2(0, -34), o, 2.0)
		var flag := PackedVector2Array()
		for i in 6:
			flag.append(pole + Vector2(i * 6, -34 + sin(t * 6.0 + i) * 2.0))
		for i in range(5, -1, -1):
			flag.append(pole + Vector2(i * 6, -22 + sin(t * 6.0 + i) * 2.0))
		draw_colored_polygon(flag, Color.from_hsv(fposmod(t * 0.15, 1.0), 0.6, 1.0))
		# Warm rain over the whole map.
		for i in 90:
			var x := fposmod(i * 137.0 + t * 60.0, 1960.0) - 20.0
			var y := fposmod(i * 71.0 + t * (520.0 + (i % 5) * 60.0), 1120.0) - 20.0
			draw_line(Vector2(x, y), Vector2(x + 3, y + 16), Color(0.85, 0.95, 1.0, 0.35), 1.5)
		_clouds()


## Level badges on top of the path (redrawn when the selection moves).
class Badges extends Node2D:
	var map: WorldMap
	var t := 0.0

	## A signpost badge for a gate to another world (snowflake up, leaf back down).
	func _draw_gate(p: Vector2, n: Dictionary, sel: bool, r: float) -> void:
		var o := Color("1d1726")
		var to_snow: bool = n["gate"] == "w2"
		var to_jungle: bool = n["gate"] == "w3"
		var fill := Color("bfe6ff") if to_snow else (Color("ffb0d0") if to_jungle else Color("9be07e"))
		if not n["unlocked"]:
			fill = Color("9a93a8")
		draw_circle(p + Vector2(0, 6), r, Color(0, 0, 0, 0.25))
		Art.shape(self, Art.ellipse(p, r, r, 28), fill, o, 4.0)
		if not n["unlocked"]:
			draw_rect(Rect2(p + Vector2(-9, -2), Vector2(18, 14)), o)
			draw_arc(p + Vector2(0, -3), 7.0, PI, TAU, 10, o, 3.0)
		elif to_jungle:
			for k in 5:  # a jungle flower
				var d := Vector2.from_angle(k * TAU / 5.0) * 10.0
				Art.shape(self, Art.ellipse(p + d, 7, 7, 10), Color("ff4fa0"), o, 1.5)
			draw_circle(p, 6.0, Color("ffd23f"))
		elif to_snow:
			for k in 3:  # snowflake
				var d := Vector2.from_angle(k * PI / 3.0) * 16.0
				draw_line(p - d, p + d, Color.WHITE, 4.0)
				draw_line(p - d, p + d, o, 1.5)
		else:
			Art.shape(self, Art.ellipse(p, 9, 15, 12), Color("4fb548"), o, 2.5)
			draw_line(p + Vector2(0, -12), p + Vector2(0, 14), o, 2.0)
		if sel:
			draw_arc(p, r + 10.0, 0, TAU, 32, Color.WHITE, 4.0)

	func _process(delta: float) -> void:
		t += delta
		queue_redraw()

	func _draw() -> void:
		var font := ThemeDB.fallback_font
		for i in map.nodes.size():
			var n: Dictionary = map.nodes[i]
			var p: Vector2 = n["pos"]
			var sel: bool = i == map.index and not map._walking
			var r := 30.0 + (4.0 * sin(t * 5.0) if sel else 0.0)
			if i == map.index and map._shake > 0.0:
				p.x += sin(t * 60.0) * 4.0 * map._shake
			if n["bonus"]:
				if sel:
					draw_arc(p + Vector2(20, -70), 52.0, 0, TAU, 32, Color("ffd23f"), 4.0)
				continue
			if n.has("gate"):
				_draw_gate(p, n, sel, r)
				continue
			var fill := Color("ffd23f") if n["done"] else (UIStyle.ACCENT if n["unlocked"] else Color("9a93a8"))
			if n.get("boss", false) and n["unlocked"]:
				fill = Color("ff5d3f") if not n["done"] else Color("ffd23f")
			draw_circle(p + Vector2(0, 6), r, Color(0, 0, 0, 0.25))
			Art.shape(self, Art.ellipse(p, r, r, 28), fill, Color("1d1726"), 4.0)
			draw_circle(p + Vector2(-8, -9), r * 0.3, Color(1, 1, 1, 0.35))
			var label := str(i) if not n.get("boss", false) else "!"
			if not n["unlocked"]:
				# Padlock.
				draw_rect(Rect2(p + Vector2(-9, -2), Vector2(18, 14)), Color("1d1726"))
				draw_arc(p + Vector2(0, -3), 7.0, PI, TAU, 10, Color("1d1726"), 3.0)
			else:
				var w := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 30).x
				draw_string_outline(font, p + Vector2(-w * 0.5, 11), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, 6, Color("1d1726"))
				draw_string(font, p + Vector2(-w * 0.5, 11), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Color.WHITE)
			# Gems + Snoozling pips under the badge.
			var rec := SaveData.get_record(n["id"])
			var got: Array = rec.get("gems", [])
			for g in 3:
				var gp := p + Vector2(-26 + g * 17, r + 14)
				var have: bool = g < got.size() and got[g]
				var col: Color = DreamGem.COLORS[g] if have else Color(1, 1, 1, 0.35)
				draw_colored_polygon(PackedVector2Array([gp + Vector2(0, -7), gp + Vector2(6, 0), gp + Vector2(0, 7), gp + Vector2(-6, 0)]), col)
			var sp := p + Vector2(28, r + 14)
			draw_circle(sp, 7.0, Color("ffb3d9") if rec.get("snoozling", false) else Color(1, 1, 1, 0.35))
			if sel:
				draw_arc(p, r + 10.0, 0, TAU, 32, Color.WHITE, 4.0)
