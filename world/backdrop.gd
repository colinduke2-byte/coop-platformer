@tool
class_name Backdrop
extends Node2D
## Painted-style parallax background built from the level's LevelTheme.
## Drop ONE in a level (anywhere; it draws behind everything). Set `horizon_y`
## to roughly the world y of your main ground and pick a `scenery`.
##
## Layers, back to front: sky gradient (+ sun or stars), drifting clouds, up to
## four parallax layers that fade into the sky with distance (aerial haze), and
## optional light shafts. Every layer is baked into ONE mesh, so a whole
## backdrop costs a handful of draw calls no matter how detailed it is.

enum Scenery {
	HILLS,      ## rolling meadow hills, round trees, a windmill
	FOREST,     ## tall trunks in layers, ferns, light shafts
	CAVE,       ## dark rock layers, stalactites, glowing crystals and mushrooms
	CANOPY,     ## treetop village: huge trunks, huts on branches, rope bridges
	RIVER,      ## hills with a river valley and a water mill
	CASTLE,     ## thorny hills and a dark castle on a crag
	CANDY,      ## lollipop trees and gumdrop hills
	ICE,        ## snowy peaks and pines
	JUNGLE,     ## misty rainforest: waterfalls, giant trees, palms, hanging vines
	RUINS,      ## jungle with old stepped temples and broken pillars
	FACTORY,    ## the clockwork dream factory: smokestacks, giant gears, pipes and girders
	OCEAN,      ## a bright seaside: the sea on the horizon, sea stacks, gulls, a reef below the waterline
	DEEP,       ## deep under the sea: rock spires, kelp, glowing jellies and passing fish
	NEBULA,     ## the dream's edge: planets, nebula swirls, floating islands and crystal spires
}

@export var horizon_y := 600.0:
	set(v):
		horizon_y = v
		_rebuild()
@export var scenery: Scenery = Scenery.HILLS:
	set(v):
		scenery = v
		_rebuild()
@export var seed_value := 7:
	set(v):
		seed_value = v
		_rebuild()
@export var clouds := true:
	set(v):
		clouds = v
		_rebuild()
@export var trees := true:
	set(v):
		trees = v
		_rebuild()
@export var light_shafts := false:           ## soft sunbeams (forests, canopies)
	set(v):
		light_shafts = v
		_rebuild()
@export var stars := false:                  ## night / cave sky sparkles instead of a sun
	set(v):
		stars = v
		_rebuild()
@export var cloud_sea := false:             ## sky levels: a sea of puffy clouds below the islands
	set(v):
		cloud_sea = v
		_rebuild()
@export var critters := true:                ## drifting birds / parrots / gulls / smoke / shooting stars
	set(v):
		critters = v
		_rebuild()
@export var theme_override: LevelTheme:
	set(v):
		theme_override = v
		_rebuild()

const SEA := Color("3fa9e0")   ## open-sea blue (ocean scenery)
const DEPTH := 5000.0          ## how far below the horizon layers extend
const CLOUD_REPEAT := 3200.0

var _th: LevelTheme
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	z_index = -100
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for c in get_children(true):
		c.queue_free()
	_th = theme_override if theme_override else LevelTheme.find(self)
	_rng.seed = seed_value
	_build_sky()
	if clouds and not scenery in [Scenery.CAVE, Scenery.DEEP, Scenery.NEBULA]:
		_build_clouds()
	match scenery:
		Scenery.HILLS: _hills_scene()
		Scenery.FOREST: _forest_scene()
		Scenery.CAVE: _cave_scene()
		Scenery.CANOPY: _canopy_scene()
		Scenery.RIVER: _river_scene()
		Scenery.CASTLE: _castle_scene()
		Scenery.CANDY: _candy_scene()
		Scenery.ICE: _ice_scene()
		Scenery.JUNGLE: _jungle_scene(false)
		Scenery.RUINS: _jungle_scene(true)
		Scenery.FACTORY: _factory_scene()
		Scenery.OCEAN: _ocean_scene()
		Scenery.DEEP: _deep_scene()
		Scenery.NEBULA: _nebula_scene()
	if critters:
		_critters()
	if cloud_sea:
		_build_cloud_sea()
	if light_shafts:
		_build_shafts()


# --- Sky ------------------------------------------------------------------------------

func _build_sky() -> void:
	var layer := CanvasLayer.new()
	layer.layer = -100
	add_child(layer, false, Node.INTERNAL_MODE_FRONT)
	var grad := Gradient.new()
	grad.set_color(0, _th.sky_top)
	grad.set_color(1, _th.sky_bottom)
	grad.add_point(0.62, _th.sky_top.lerp(_th.sky_bottom, 0.75))
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill_from = Vector2(0, 0)
	tex.fill_to = Vector2(0, 1)
	tex.width = 8
	tex.height = 256
	var sky := TextureRect.new()
	sky.texture = tex
	sky.stretch_mode = TextureRect.STRETCH_SCALE
	sky.set_anchors_preset(Control.PRESET_FULL_RECT)
	sky.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(sky)
	var mp := MeshPainter.new()
	if stars or scenery in [Scenery.CAVE, Scenery.NEBULA]:
		for i in 90:
			var p := Vector2(_rng.randf_range(0, 1920), _rng.randf_range(0, 700))
			var r := _rng.randf_range(1.0, 2.6)
			mp.draw_circle(p, r, Color(1, 1, 1, _rng.randf_range(0.25, 0.8)))
			if r > 2.2:
				mp.draw_line(p - Vector2(r * 3, 0), p + Vector2(r * 3, 0), Color(1, 1, 1, 0.3), 1.0)
				mp.draw_line(p - Vector2(0, r * 3), p + Vector2(0, r * 3), Color(1, 1, 1, 0.3), 1.0)
	if scenery == Scenery.NEBULA:  # a big ringed dream planet instead of a sun
		var pc := Vector2(1420, 230)
		mp.draw_circle(pc, 150, Color(_th.accent, 0.12))
		mp.draw_circle(pc, 96, _th.far_hills.lightened(0.25))
		mp.draw_circle(pc + Vector2(-26, -24), 60, Color(1, 1, 1, 0.12))
		var ring := PackedVector2Array()
		for i in 49:
			var a := TAU * i / 48.0
			ring.append(pc + Vector2(cos(a) * 170.0, sin(a) * 34.0).rotated(-0.25))
		mp.draw_polyline(ring, Color(_th.accent, 0.7), 8.0)
	elif not scenery in [Scenery.CAVE, Scenery.DEEP]:
		var sc := Vector2(1480, 190)
		if stars:  # a moon
			mp.draw_circle(sc, 120, Color(_th.sun, 0.12))
			mp.draw_circle(sc, 70, _th.sun.lightened(0.3))
			mp.draw_circle(sc + Vector2(24, -12), 60, _th.sky_top.lerp(_th.sky_bottom, 0.3))
		else:
			mp.draw_circle(sc, 86, _th.sun)
			mp.draw_circle(sc + Vector2(-20, -22), 40, Color(1, 1, 1, 0.35))
			_sun_glow(layer, sc)
	var art := MeshArt.new(mp.build())
	layer.add_child(art)


## Smooth radial glow (a gradient texture: no banding, one draw call).
func _sun_glow(layer: CanvasLayer, at: Vector2) -> void:
	var g := Gradient.new()
	g.set_color(0, Color(_th.sun, 0.55))
	g.set_color(1, Color(_th.sun, 0.0))
	g.add_point(0.25, Color(_th.sun, 0.3))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = 256
	tex.height = 256
	var spr := Sprite2D.new()
	spr.texture = tex
	spr.position = at
	spr.scale = Vector2(3.2, 3.2)
	layer.add_child(spr)


func _build_clouds() -> void:
	var p := _parallax(0.1, CLOUD_REPEAT, Vector2(-14, 0))
	var mp := MeshPainter.new()
	for i in 8:
		var c := Vector2(_rng.randf_range(0, CLOUD_REPEAT), horizon_y - _rng.randf_range(700, 1250))
		_cloud(mp, c, _rng.randf_range(0.7, 1.5))
	p.add_child(MeshArt.new(mp.build()))


func _cloud(mp: MeshPainter, c: Vector2, s: float) -> void:
	var col := _th.cloud
	var shade := col.lerp(_th.sky_top, 0.25)
	var blobs := [Vector3(0, 0, 52), Vector3(-58, 14, 36), Vector3(58, 12, 42), Vector3(-22, -26, 40), Vector3(30, -22, 36), Vector3(90, 22, 26), Vector3(-92, 24, 24)]
	for b: Vector3 in blobs:  # shadow side first
		mp.draw_colored_polygon(Art.ellipse(c + Vector2(b.x, b.y + 8) * s, b.z * s, b.z * s * 0.8, 20), shade)
	for b: Vector3 in blobs:
		mp.draw_colored_polygon(Art.ellipse(c + Vector2(b.x, b.y) * s, b.z * s, b.z * s * 0.78, 20), col)
	mp.draw_colored_polygon(Art.ellipse(c + Vector2(-18, -30) * s, 22 * s, 12 * s, 14), Color(1, 1, 1, 0.5))


## Two layers of cloud tops rolling along below the horizon.
func _build_cloud_sea() -> void:
	for layer in 2:
		var scale := 0.7 if layer == 0 else 0.85
		var width := 2400.0
		var l := _layer(scale, width)
		l.parallax.autoscroll = Vector2(-10.0 - layer * 8.0, 0)
		var y := horizon_y + 40.0 + layer * 110.0
		var col := _th.cloud.lerp(_th.sky_bottom, 0.35 - layer * 0.25)
		var shade := col.lerp(_th.far_hills, 0.25)
		var n := 22
		for i in n + 1:
			var x := width * float(i) / n
			var r := _rng.randf_range(70, 140)
			l.painter.draw_colored_polygon(Art.ellipse(Vector2(x, y + 10.0), r * 1.1, r * 0.55, 20), shade)
		for i in n + 1:
			var x := width * float(i) / n + _rng.randf_range(-20, 20)
			var r := _rng.randf_range(70, 130)
			l.painter.draw_colored_polygon(Art.ellipse(Vector2(x, y), r, r * 0.5, 20), col)
			l.painter.draw_colored_polygon(Art.ellipse(Vector2(x - r * 0.25, y - r * 0.2), r * 0.45, r * 0.18, 14), Color(1, 1, 1, 0.35))
		l.painter.draw_rect(Rect2(0, y + 30.0, width, DEPTH), col)
		_commit(l)
		l.parallax.z_index = -60 + layer * 10


func _build_shafts() -> void:
	var p := _parallax(0.85, 2600.0)
	var mp := MeshPainter.new()
	for i in 5:
		var x := _rng.randf_range(0, 2600)
		var w := _rng.randf_range(60, 160)
		var top := horizon_y - 1500.0
		var bot := horizon_y + 200.0
		var lean := 380.0
		var pts := PackedVector2Array([Vector2(x, top), Vector2(x + w, top), Vector2(x + w + lean, bot), Vector2(x + lean - w * 0.3, bot)])
		mp.draw_colored_polygon(pts, Color(_th.sun, 0.07))
		var inner := PackedVector2Array([Vector2(x + w * 0.3, top), Vector2(x + w * 0.7, top), Vector2(x + w * 0.7 + lean, bot), Vector2(x + w * 0.2 + lean, bot)])
		mp.draw_colored_polygon(inner, Color(_th.sun, 0.06))
	var art := MeshArt.new(mp.build())
	p.add_child(art)
	p.z_index = -40  # in front of the scenery, behind the gameplay


# --- Scenery sets ---------------------------------------------------------------------

func _hills_scene() -> void:
	_mountain_layer(0.05, 3000.0, 0.7, 420.0, 5, false)
	var far := _layer(0.14, 2600.0)
	_hill_band(far, 2600.0, horizon_y - 300.0, 160.0, 5, _haze(_th.far_hills, 0.4))
	if trees:
		_tree_row(far, 2600.0, 16, 0.3, _haze(_th.far_hills.darkened(0.15), 0.38), false)
	_commit(far)
	var mid := _layer(0.3, 2400.0)
	_hill_band(mid, 2400.0, horizon_y - 170.0, 130.0, 3, _haze(_th.far_hills.lerp(_th.near_hills, 0.5), 0.22))
	if trees:
		_tree_row(mid, 2400.0, 6, 0.55, _haze(_th.near_hills.darkened(0.12), 0.2), true)
	_windmill(mid, Vector2(_rng.randf_range(300, 1900), 0), 0.8, _haze(_th.ground.lightened(0.3), 0.22))
	_commit(mid)
	var near := _layer(0.55, 2000.0)
	_hill_band(near, 2000.0, horizon_y - 60.0, 90.0, 2, _haze(_th.near_hills, 0.08))
	if trees:
		_tree_row(near, 2000.0, 4, 0.85, _haze(_th.near_hills.darkened(0.1).lerp(_th.foliage, 0.3), 0.06), true)
		_bushes(near, 2000.0, 6, _haze(_th.foliage_dark.lerp(_th.near_hills, 0.5), 0.06))
	_commit(near)


func _forest_scene() -> void:
	# Trunks are tinted green-grey (bark in shade), never the gameplay brown.
	var bark := _th.ground.lerp(_th.near_hills, 0.45).darkened(0.1)
	var back := _layer(0.08, 2400.0)
	_trunk_row(back, 2400.0, 14, 60.0, _haze(bark, 0.68))
	_canopy_band(back, 2400.0, horizon_y - 1300.0, _haze(_th.foliage_dark, 0.55))
	_commit(back)
	var mid := _layer(0.22, 2000.0)
	_hill_band(mid, 2000.0, horizon_y - 120.0, 80.0, 3, _haze(_th.near_hills, 0.3))
	_trunk_row(mid, 2000.0, 7, 100.0, _haze(bark, 0.45))
	_canopy_band(mid, 2000.0, horizon_y - 1150.0, _haze(_th.foliage_dark, 0.35))
	_commit(mid)
	var near := _layer(0.45, 1700.0)
	_hill_band(near, 1700.0, horizon_y - 40.0, 60.0, 2, _haze(_th.near_hills.darkened(0.05), 0.12))
	_trunk_row(near, 1700.0, 4, 150.0, _haze(bark.darkened(0.15), 0.25))
	_ferns(near, 1700.0, 12, _haze(_th.foliage_dark, 0.1))
	_commit(near)


func _cave_scene() -> void:
	# Background rock is lighter and bluer than the solid gameplay rock.
	var rock := _th.far_hills.lerp(_th.near_hills, 0.3)
	var back := _layer(0.08, 2400.0)
	_rock_band(back, 2400.0, horizon_y - 900.0, 380.0, _haze(rock, 0.45), true)
	_crystals(back, 2400.0, 10, horizon_y - 500.0, 0.6)
	_commit(back)
	var mid := _layer(0.25, 2000.0)
	_rock_band(mid, 2000.0, horizon_y - 500.0, 300.0, _haze(rock, 0.22), false)
	_stalactites(mid, 2000.0, 14, horizon_y - 1600.0, _haze(rock, 0.22))
	_glow_mushrooms(mid, 2000.0, 7, 0.8)
	_commit(mid)
	var near := _layer(0.5, 1700.0)
	_rock_band(near, 1700.0, horizon_y - 200.0, 200.0, rock.darkened(0.15), false)
	_stalactites(near, 1700.0, 8, horizon_y - 1300.0, rock.darkened(0.15))
	_crystals(near, 1700.0, 5, horizon_y - 180.0, 1.0)
	_commit(near)


func _canopy_scene() -> void:
	var back := _layer(0.07, 2600.0)
	_canopy_band(back, 2600.0, horizon_y - 1400.0, _haze(_th.foliage_dark, 0.5))
	_trunk_row(back, 2600.0, 10, 90.0, _haze(_th.ground, 0.5))
	_commit(back)
	var mid := _layer(0.2, 2200.0)
	var trunk_col := _haze(_th.ground.darkened(0.1), 0.22)
	var xs := _trunk_row(mid, 2200.0, 4, 200.0, trunk_col)
	for i in xs.size() - 1:  # rope bridges between the big trunks
		var y := horizon_y - _rng.randf_range(500, 900)
		_rope_bridge(mid, Vector2(xs[i] + 100, y), Vector2(xs[i + 1] - 100, y + _rng.randf_range(-60, 60)), _haze(_th.ledge, 0.35))
	for i in xs.size():
		if i % 2 == 0:  # a hut on every other trunk
			_hut(mid, Vector2(xs[i], horizon_y - _rng.randf_range(650, 1000)), 1.0, _haze(_th.ledge, 0.35), _haze(_th.accent, 0.45))
	_canopy_band(mid, 2200.0, horizon_y - 1250.0, _haze(_th.foliage_dark, 0.3))
	_commit(mid)
	var near := _layer(0.5, 1800.0)
	_leaf_clusters(near, 1800.0, 5, horizon_y - 700.0, _haze(_th.foliage_dark, 0.25))
	_commit(near)


func _river_scene() -> void:
	_mountain_layer(0.05, 3000.0, 0.65, 380.0, 4, false)
	var far := _layer(0.15, 2600.0)
	_hill_band(far, 2600.0, horizon_y - 260.0, 160.0, 5, _haze(_th.far_hills, 0.3))
	_tree_row(far, 2600.0, 18, 0.35, _haze(_th.far_hills.darkened(0.2), 0.3), false)
	_commit(far)
	var mid := _layer(0.32, 2200.0)
	_hill_band(mid, 2200.0, horizon_y - 150.0, 120.0, 3, _haze(_th.near_hills, 0.12))
	# The river: a band of water with sparkles along the valley floor.
	var water := Color("5fb8e8").lerp(_th.sky_bottom, 0.3)
	mid.painter.draw_rect(Rect2(0, horizon_y - 40.0, 2200.0, 60.0), water)
	for i in 30:
		var x := _rng.randf_range(0, 2200)
		mid.painter.draw_line(Vector2(x, horizon_y - 25 + _rng.randf_range(0, 30)), Vector2(x + _rng.randf_range(20, 60), horizon_y - 25 + _rng.randf_range(0, 30)), Color(1, 1, 1, 0.4), 2.0)
	_mill(mid, Vector2(_rng.randf_range(400, 1600), horizon_y - 120.0), 1.0)
	_tree_row(mid, 2200.0, 8, 0.6, _haze(_th.near_hills.darkened(0.15), 0.12), true)
	_commit(mid)
	var near := _layer(0.55, 1800.0)
	_hill_band(near, 1800.0, horizon_y - 70.0, 90.0, 3, _th.near_hills)
	_reeds(near, 1800.0, 20, _th.foliage_dark)
	_commit(near)


func _castle_scene() -> void:
	_mountain_layer(0.05, 3000.0, 0.6, 520.0, 3, false)
	var far := _layer(0.14, 2600.0)
	_hill_band(far, 2600.0, horizon_y - 280.0, 220.0, 4, _haze(_th.far_hills, 0.3))
	_castle(far, Vector2(1300, horizon_y - 420.0), 1.2, _haze(_th.ground.darkened(0.4), 0.3), _haze(_th.accent, 0.2))
	_commit(far)
	var mid := _layer(0.3, 2200.0)
	_hill_band(mid, 2200.0, horizon_y - 160.0, 150.0, 4, _haze(_th.near_hills, 0.12))
	_thorns(mid, 2200.0, 10, _haze(_th.foliage_dark.darkened(0.3), 0.12))
	_commit(mid)
	var near := _layer(0.55, 1800.0)
	_hill_band(near, 1800.0, horizon_y - 80.0, 110.0, 3, _th.near_hills)
	_thorns(near, 1800.0, 7, _th.foliage_dark.darkened(0.4))
	_commit(near)


func _candy_scene() -> void:
	_mountain_layer(0.05, 3000.0, 0.6, 360.0, 6, false)
	var far := _layer(0.15, 2600.0)
	_hill_band(far, 2600.0, horizon_y - 260.0, 200.0, 7, _haze(_th.far_hills, 0.3))
	_commit(far)
	var mid := _layer(0.32, 2200.0)
	_hill_band(mid, 2200.0, horizon_y - 150.0, 150.0, 5, _haze(_th.near_hills, 0.12))
	for i in 9:
		_lollipop(mid, Vector2(_rng.randf_range(0, 2200), 0), _rng.randf_range(0.6, 1.0), 0.12)
	_commit(mid)
	var near := _layer(0.55, 1800.0)
	_hill_band(near, 1800.0, horizon_y - 70.0, 110.0, 3, _th.near_hills)
	for i in 6:
		_lollipop(near, Vector2(_rng.randf_range(0, 1800), 0), _rng.randf_range(1.0, 1.4), 0.0)
	_commit(near)


func _ice_scene() -> void:
	_mountain_layer(0.05, 3000.0, 0.55, 620.0, 4, true)
	_mountain_layer(0.12, 2600.0, 0.3, 420.0, 5, true)
	var mid := _layer(0.3, 2200.0)
	_hill_band(mid, 2200.0, horizon_y - 170.0, 130.0, 4, _haze(_th.near_hills, 0.12))
	_pine_row(mid, 2200.0, 14, 0.7, _haze(_th.foliage_dark, 0.15), true)
	_commit(mid)
	var near := _layer(0.55, 1800.0)
	_hill_band(near, 1800.0, horizon_y - 80.0, 100.0, 3, _th.near_hills)
	_pine_row(near, 1800.0, 7, 1.1, _th.foliage_dark, true)
	_commit(near)


func _jungle_scene(ruins: bool) -> void:
	# Misty green mountains with waterfalls far away.
	_mountain_layer(0.04, 3000.0, 0.62, 560.0, 5, false)
	var far := _layer(0.12, 2600.0)
	_hill_band(far, 2600.0, horizon_y - 300.0, 220.0, 4, _haze(_th.far_hills, 0.35))
	for i in 3:
		var x := (float(i) + _rng.randf_range(0.2, 0.8)) * 2600.0 / 3.0
		_waterfall(far, x, horizon_y - 820.0, _ground_at(far, x) + 20.0, 46.0, 0.5)
	if ruins:
		for i in 2:
			var x := (float(i) + _rng.randf_range(0.3, 0.7)) * 1300.0
			_temple(far, Vector2(x, _ground_at(far, x) + 30.0), 1.1, _haze(_th.ledge_dark, 0.45))
	_commit(far)
	# Giant rainforest trees and palms in the middle distance.
	var mid := _layer(0.26, 2200.0)
	_hill_band(mid, 2200.0, horizon_y - 150.0, 110.0, 3, _haze(_th.near_hills, 0.22))
	var bark := _th.ledge_dark.lerp(_th.near_hills, 0.35)
	var xs := _trunk_row(mid, 2200.0, 5, 120.0, _haze(bark, 0.35))
	for x in xs:
		_crown(mid, Vector2(x, horizon_y - _rng.randf_range(900, 1200)), _haze(_th.foliage_dark, 0.3))
	if ruins:
		var tx := _rng.randf_range(300, 1900)
		_temple(mid, Vector2(tx, _ground_at(mid, tx) + 20.0), 1.6, _haze(_th.ledge, 0.3))
	for i in 6:
		var x := _rng.randf_range(0, 2200)
		_palm(mid, Vector2(x, _ground_at(mid, x) + 10.0), _rng.randf_range(0.9, 1.3), _haze(_th.foliage, 0.25), _haze(bark, 0.25))
	_hanging_vines(mid, 2200.0, 16, horizon_y - 1250.0, _haze(_th.foliage_dark, 0.3))
	_commit(mid)
	# Big leaves and ferns up close.
	var near := _layer(0.5, 1800.0)
	_hill_band(near, 1800.0, horizon_y - 60.0, 70.0, 3, _th.near_hills.darkened(0.06))
	if ruins:
		for i in 4:
			var x := _rng.randf_range(0, 1800)
			var h := _rng.randf_range(160, 360)
			var b := Vector2(x, _ground_at(near, x) + 10.0)
			near.painter.draw_rect(Rect2(b + Vector2(-34, -h), Vector2(68, h)), _th.ledge.darkened(0.1))
			near.painter.draw_rect(Rect2(b + Vector2(-46, -h - 20), Vector2(92, 22)), _th.ledge.darkened(0.2))
			near.painter.draw_colored_polygon(Art.ellipse(b + Vector2(-10, -h - 18), 40, 12, 12), _th.top_dark)
	_big_leaves(near, 1800.0, 14, _th.foliage_dark)
	_ferns(near, 1800.0, 12, _th.foliage_dark.darkened(0.05))
	_commit(near)


func _waterfall(l: Layer, x: float, top: float, bottom: float, w: float, alpha: float) -> void:
	var water := Color(0.9, 0.97, 1.0, alpha)
	l.painter.draw_rect(Rect2(x - w * 0.5, top, w, bottom - top), water)
	for k in 4:
		var xx := x - w * 0.5 + (k + 0.5) * w / 4.0
		l.painter.draw_line(Vector2(xx, top), Vector2(xx, bottom), Color(1, 1, 1, alpha * 0.8), 2.0)
	l.painter.draw_colored_polygon(Art.ellipse(Vector2(x, bottom), w * 1.4, 18, 14), Color(1, 1, 1, alpha))


## A rounded rainforest crown (cluster of leafy blobs) on top of a trunk.
func _crown(l: Layer, c: Vector2, color: Color) -> void:
	for k in 7:
		var p := c + Vector2(_rng.randf_range(-170, 170), _rng.randf_range(-80, 60))
		l.painter.draw_colored_polygon(Art.ellipse(p, _rng.randf_range(90, 140), _rng.randf_range(60, 90), 16), color.lightened(k * 0.02))


func _palm(l: Layer, base: Vector2, s: float, leaf: Color, trunk: Color) -> void:
	var lean := _rng.randf_range(-0.3, 0.3)
	var top := base + Vector2(lean * 200.0, -320.0) * s
	var prev := base
	for i in 8:
		var t := float(i + 1) / 8.0
		var p := base + Vector2(lean * 200.0 * t * t, -320.0 * t) * s
		l.painter.draw_line(prev, p, trunk, lerpf(16.0, 10.0, t) * s)
		prev = p
	for k in 7:
		var ang := -PI * 0.5 + (float(k) - 3.0) * 0.55
		var tip := top + Vector2(cos(ang) * 150.0, sin(ang) * 50.0 + 60.0 + absf(float(k) - 3.0) * 14.0) * s
		var mid := top.lerp(tip, 0.5) + Vector2(0, -36.0) * s
		var n := (tip - top).normalized().orthogonal() * 18.0 * s
		l.painter.draw_colored_polygon(PackedVector2Array([top, mid + n, tip, mid - n * 0.4]), leaf)


func _hanging_vines(l: Layer, width: float, count: int, top: float, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var length := _rng.randf_range(300, 800)
		var pts := PackedVector2Array()
		for k in 12:
			var t := float(k) / 11.0
			pts.append(Vector2(x + sin(t * 5.0 + i) * 14.0, top + t * length))
		l.painter.draw_polyline(pts, color, 4.0)
		for k in range(2, 12, 2):
			l.painter.draw_colored_polygon(Art.ellipse(pts[k] + Vector2(8, 0), 9, 5, 8), color.lightened(0.08))


func _big_leaves(l: Layer, width: float, count: int, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 16.0)
		for k in 3:
			var ang := -PI * 0.5 + (float(k) - 1.0) * 0.6 + _rng.randf_range(-0.15, 0.15)
			var c := base + Vector2(cos(ang), sin(ang)) * _rng.randf_range(60, 100)
			l.painter.draw_line(base, c, color.darkened(0.1), 4.0)
			l.painter.draw_colored_polygon(Art.ellipse(c, 46, 28, 16), color.lightened(k * 0.04))


## A stepped jungle temple silhouette (bottom-centre at `at`).
func _temple(l: Layer, at: Vector2, s: float, color: Color) -> void:
	var w := 360.0
	for k in 5:
		var ww := (w - k * 60.0) * s
		var y := at.y - (k + 1) * 60.0 * s
		l.painter.draw_rect(Rect2(at.x - ww * 0.5, y, ww, 62.0 * s), color.lightened(k * 0.03))
	l.painter.draw_rect(Rect2(at.x - 40 * s, at.y - 360 * s, 80 * s, 60 * s), color.darkened(0.1))
	l.painter.draw_rect(Rect2(at.x - 18 * s, at.y - 345 * s, 36 * s, 45 * s), color.darkened(0.35))
	l.painter.draw_rect(Rect2(at.x - 26 * s, at.y - 60 * s, 52 * s, 60 * s), color.darkened(0.35))
	for k in 5:  # moss on the steps
		l.painter.draw_colored_polygon(Art.ellipse(Vector2(at.x + _rng.randf_range(-140, 140) * s, at.y - (k + 1) * 60.0 * s), 30 * s, 8 * s, 10), _th.top_dark.lerp(_th.sky_bottom, 0.3))


func _factory_scene() -> void:
	# Far: a skyline of factory halls and smokestacks with drifting smoke.
	var far := _layer(0.08, 2800.0)
	var wall := _haze(_th.ground.lerp(_th.far_hills, 0.5), 0.45)
	var x := 0.0
	while x < 2800.0:
		var w := _rng.randf_range(180, 360)
		var h := _rng.randf_range(260, 620)
		far.painter.draw_rect(Rect2(x, horizon_y - h, w - 20, h + DEPTH), wall)
		var teeth := int(w / 60.0)  # saw-tooth roof
		for k in teeth:
			var tx := x + k * 60.0
			far.painter.draw_colored_polygon(PackedVector2Array([Vector2(tx, horizon_y - h), Vector2(tx + 40, horizon_y - h - 40),
					Vector2(tx + 40, horizon_y - h)]), wall)
		if _rng.randf() < 0.6:  # a smokestack with smoke puffs
			var sx := x + _rng.randf_range(20, w - 60)
			var sh := _rng.randf_range(200, 380)
			far.painter.draw_rect(Rect2(sx, horizon_y - h - sh, 34, sh), wall.darkened(0.08))
			far.painter.draw_rect(Rect2(sx - 4, horizon_y - h - sh, 42, 14), wall.darkened(0.15))
			for k in 4:
				var p := Vector2(sx + 17 + k * 30.0, horizon_y - h - sh - 30.0 - k * 50.0)
				far.painter.draw_colored_polygon(Art.ellipse(p, 26.0 + k * 10.0, 18.0 + k * 6.0, 14), Color(_th.sky_bottom, 0.6 - k * 0.12))
		for k in int(h / 70.0):  # rows of glowing windows
			for m in int((w - 40) / 46.0):
				if _rng.randf() < 0.55:
					far.painter.draw_rect(Rect2(x + 14 + m * 46.0, horizon_y - h + 30 + k * 70.0, 22, 30), _haze(_th.accent, 0.5))
		x += w
	_commit(far)
	# Mid: giant gears and pipes.
	var mid := _layer(0.25, 2200.0)
	var metal := _haze(_th.top.lerp(_th.ground, 0.3), 0.3)
	for i in 5:
		var c := Vector2(_rng.randf_range(0, 2200), horizon_y - _rng.randf_range(250, 700))
		_gear_shape(mid, c, _rng.randf_range(120, 230), metal)
	for i in 6:  # vertical pipes with elbows
		var px := _rng.randf_range(0, 2200)
		var top := horizon_y - _rng.randf_range(500, 1100)
		mid.painter.draw_rect(Rect2(px, top, 36, horizon_y - top + DEPTH), _haze(_th.ledge, 0.3))
		mid.painter.draw_rect(Rect2(px - 6, top, 48, 16), _haze(_th.ledge_dark, 0.3))
		mid.painter.draw_rect(Rect2(px, top, 160, 36), _haze(_th.ledge, 0.3))
	_commit(mid)
	# Near: steel girders and a railing.
	var near := _layer(0.5, 1800.0)
	var steel := _haze(_th.ledge_dark, 0.4)
	near.painter.draw_rect(Rect2(0, horizon_y - 70, 1800, DEPTH + 70), _th.near_hills.darkened(0.1))
	for i in 9:
		var gx := i * 200.0 + 40.0
		near.painter.draw_rect(Rect2(gx, horizon_y - 420, 22, 360), steel)
		near.painter.draw_line(Vector2(gx + 11, horizon_y - 420), Vector2(gx + 211, horizon_y - 70), steel, 6.0)
	near.painter.draw_rect(Rect2(0, horizon_y - 430, 1800, 18), steel)
	_commit(near)


func _ocean_scene() -> void:
	# Far: the open sea on the horizon with little islands and glints.
	var far := _layer(0.04, 3000.0)
	var sea := _haze(SEA.lerp(_th.far_hills, 0.3), 0.3)
	far.painter.draw_rect(Rect2(0, horizon_y - 140, 3000, DEPTH + 140), sea)
	for i in 4:
		var c := Vector2(_rng.randf_range(0, 3000), horizon_y - 140)
		var w := _rng.randf_range(160, 320)
		far.painter.draw_colored_polygon(Art.ellipse(c, w, _rng.randf_range(40, 80), 24), _haze(_th.foliage_dark, 0.5))
		_palm(far, c + Vector2(_rng.randf_range(-40, 40), -30), 0.6, _haze(_th.foliage, 0.5), _haze(_th.ground_dark, 0.5))
	for i in 40:
		var g := Vector2(_rng.randf_range(0, 3000), horizon_y - 130 + _rng.randf_range(0, 120))
		far.painter.draw_line(g, g + Vector2(_rng.randf_range(10, 34), 0), Color(1, 1, 1, 0.35), 2.0)
	_commit(far)
	# Mid: sea stacks and a rock arch topped with greenery.
	var mid := _layer(0.18, 2400.0)
	var rock := _haze(_th.ground.lerp(_th.far_hills, 0.3), 0.35)
	for i in 4:
		var x := _rng.randf_range(0, 2400)
		var h := _rng.randf_range(260, 520)
		var w := _rng.randf_range(90, 160)
		mid.painter.draw_colored_polygon(PackedVector2Array([Vector2(x - w, horizon_y + 40), Vector2(x - w * 0.7, horizon_y - h),
				Vector2(x + w * 0.6, horizon_y - h - 20), Vector2(x + w, horizon_y + 40)]), rock)
		mid.painter.draw_colored_polygon(Art.ellipse(Vector2(x - w * 0.05, horizon_y - h - 6), w * 0.8, 26, 16), _haze(_th.foliage, 0.35))
	mid.painter.draw_rect(Rect2(0, horizon_y + 30, 2400, DEPTH), _haze(SEA.darkened(0.15), 0.25))
	_commit(mid)
	# Gulls drifting across (an autoscrolled layer).
	var gulls := _parallax(0.12, 2600.0, Vector2(-22, 0))
	var gp := MeshPainter.new()
	for i in 7:
		var c := Vector2(_rng.randf_range(0, 2600), horizon_y - _rng.randf_range(600, 1000))
		gp.draw_polyline(PackedVector2Array([c + Vector2(-16, -2), c + Vector2(-7, -9), c, c + Vector2(7, -9), c + Vector2(16, -2)]), Color(1, 1, 1, 0.85), 3.0)
	gulls.add_child(MeshArt.new(gp.build()))
	# Near: the reef under the waterline (seen while diving) with swaying kelp silhouettes.
	var near := _layer(0.45, 2000.0)
	var reef := _haze(_th.near_hills, 0.15)
	var x2 := 0.0
	while x2 < 2000.0:
		var r := _rng.randf_range(60, 140)
		near.painter.draw_colored_polygon(Art.ellipse(Vector2(x2, horizon_y + 260), r, r * 0.7, 18), reef)
		x2 += r * 1.2
	near.painter.draw_rect(Rect2(0, horizon_y + 260, 2000, DEPTH), reef)
	for i in 14:
		var kx := _rng.randf_range(0, 2000)
		var kh := _rng.randf_range(160, 320)
		var pts := PackedVector2Array()
		for k in 9:
			var t := float(k) / 8.0
			pts.append(Vector2(kx + sin(t * 6.0 + i) * 12.0, horizon_y + 240 - kh * t))
		near.painter.draw_polyline(pts, _haze(_th.foliage_dark, 0.25), 9.0)
	_commit(near)
	_fish_school(0.3, 0.4)


func _deep_scene() -> void:
	# Far: tall rock spires fading into the blue.
	var far := _layer(0.06, 2800.0)
	var spire := _haze(_th.ground.lerp(_th.far_hills, 0.6), 0.45)
	for i in 9:
		var x := _rng.randf_range(0, 2800)
		var h := _rng.randf_range(500, 1300)
		var w := _rng.randf_range(60, 140)
		far.painter.draw_colored_polygon(PackedVector2Array([Vector2(x - w, horizon_y + 200), Vector2(x - w * 0.3, horizon_y - h),
				Vector2(x + w * 0.2, horizon_y - h - 30), Vector2(x + w, horizon_y + 200)]), spire)
	far.painter.draw_rect(Rect2(0, horizon_y + 180, 2800, DEPTH), spire)
	_commit(far)
	# Mid: kelp forest silhouettes and arches.
	var mid := _layer(0.22, 2400.0)
	var kelp := _haze(_th.foliage_dark, 0.45)
	for i in 22:
		var kx := _rng.randf_range(0, 2400)
		var kh := _rng.randf_range(300, 760)
		var pts := PackedVector2Array()
		for k in 12:
			var t := float(k) / 11.0
			pts.append(Vector2(kx + sin(t * 7.0 + i) * 16.0, horizon_y + 120 - kh * t))
		mid.painter.draw_polyline(pts, kelp, 12.0)
	mid.painter.draw_rect(Rect2(0, horizon_y + 110, 2400, DEPTH), _haze(_th.near_hills, 0.4))
	_commit(mid)
	# Glowing jellies and plankton specks (drift slowly upward).
	var glow := _parallax(0.3, 2200.0, Vector2(-6, -4))
	var gp := MeshPainter.new()
	for i in 16:
		var c := Vector2(_rng.randf_range(0, 2200), horizon_y - _rng.randf_range(-200, 900))
		var col: Color = _th.flower_colors[i % _th.flower_colors.size()]
		gp.draw_circle(c, 26.0, Color(col, 0.12))
		gp.draw_colored_polygon(Art.ellipse(c, 14, 10, 14), Color(col, 0.55))
		for k in 3:
			gp.draw_line(c + Vector2(-8 + k * 8, 6), c + Vector2(-8 + k * 8 + 3, 30), Color(col, 0.35), 2.0)
	for i in 60:
		gp.draw_circle(Vector2(_rng.randf_range(0, 2200), horizon_y - _rng.randf_range(-300, 1100)), 1.6, Color(1, 1, 1, 0.3))
	glow.add_child(MeshArt.new(gp.build()))
	_fish_school(0.36, 0.25)
	_fish_school(0.5, 0.15)


## A school of little fish swimming across (one autoscrolled baked layer).
## Little life in the sky: drifting layers of birds (parrots in the jungle,
## gulls at sea), smoke over the factory, shooting stars in the nebula.
func _critters() -> void:
	match scenery:
		Scenery.HILLS, Scenery.FOREST, Scenery.RIVER, Scenery.CANOPY, Scenery.CASTLE, Scenery.CANDY:
			_flock(0.12, 0.45, [_th.outline.lerp(_th.sky_bottom, 0.55)], 34.0)
			_flock(0.22, 0.3, [_th.outline.lerp(_th.sky_bottom, 0.4)], 48.0)
		Scenery.JUNGLE, Scenery.RUINS:
			_flock(0.2, 0.2, [Color("ff4f5e"), Color("ffd23f"), Color("3bb3ff"), Color("4fd16a")], 52.0, true)
		Scenery.OCEAN:
			_flock(0.16, 0.35, [Color(1, 1, 1, 0.85)], 40.0)
		Scenery.ICE:
			_flock(0.14, 0.5, [_th.outline.lerp(_th.sky_bottom, 0.6)], 30.0)
		Scenery.FACTORY:
			_smoke(0.1)
			_smoke(0.2)
		Scenery.NEBULA:
			_shooting_stars()


## A drifting layer of birds (little flapping V's; colourful parrots when `parrots`).
func _flock(scale: float, haze: float, cols: Array, drift: float, parrots := false) -> void:
	var p := _parallax(scale, 3000.0, Vector2(-drift, 0))
	var mp := MeshPainter.new()
	for g in 3:
		var c := Vector2(_rng.randf_range(0, 3000), horizon_y - _rng.randf_range(350, 900))
		for i in _rng.randi_range(3, 6):
			var b := c + Vector2(i * 46.0 + _rng.randf_range(-10, 10), absf(i - 2.5) * 16.0 + _rng.randf_range(-6, 6))
			var col: Color = _haze(cols[(g + i) % cols.size()], haze)
			var s := _rng.randf_range(0.8, 1.2) * (1.4 if parrots else 1.3)
			if parrots:
				mp.draw_colored_polygon(Art.ellipse(b, 10 * s, 5 * s, 10), col)
				mp.draw_colored_polygon(PackedVector2Array([b + Vector2(-2, -2) * s, b + Vector2(-12, -14) * s, b + Vector2(6, -3) * s]), col.darkened(0.15))
				mp.draw_colored_polygon(PackedVector2Array([b + Vector2(-8, 0) * s, b + Vector2(-22, 6) * s, b + Vector2(-8, 4) * s]), col.lightened(0.2))
			else:
				mp.draw_polyline(PackedVector2Array([b + Vector2(-12, -5) * s, b + Vector2(-5, -6) * s, b,
						b + Vector2(5, -6) * s, b + Vector2(12, -5) * s]), col, 3.0)
	p.add_child(MeshArt.new(mp.build()))
	p.z_index = -95


## Slow drifting smoke puffs above the factory roofs.
func _smoke(scale: float) -> void:
	var p := _parallax(scale, 2600.0, Vector2(-14.0 - scale * 40.0, 0))
	var mp := MeshPainter.new()
	for i in 10:
		var c := Vector2(_rng.randf_range(0, 2600), horizon_y - _rng.randf_range(420, 760))
		for k in 3:
			mp.draw_colored_polygon(Art.ellipse(c + Vector2(k * 34, -k * 10), 40.0 - k * 6.0, 26.0 - k * 4.0, 14),
					Color(_haze(Color("e9e2e8"), 0.3), 0.35))
	p.add_child(MeshArt.new(mp.build()))
	p.z_index = -95


## Streaks of falling stars racing across the nebula.
func _shooting_stars() -> void:
	var p := _parallax(0.05, 4000.0, Vector2(-520, 0))
	var mp := MeshPainter.new()
	for i in 4:
		var a := Vector2(_rng.randf_range(0, 4000), horizon_y - _rng.randf_range(500, 1100))
		for k in 6:
			mp.draw_line(a + Vector2(k * 16, -k * 4), a + Vector2(k * 16 + 18, -k * 4 - 4), Color(1, 1, 1, 0.9 - k * 0.14), 4.0 - k * 0.5)
		mp.draw_circle(a, 4.0, Color(1, 1, 0.85))
	p.add_child(MeshArt.new(mp.build()))
	p.z_index = -95


func _fish_school(scale: float, haze: float) -> void:
	var p := _parallax(scale, 2600.0, Vector2(-40.0 * scale - 10.0, 0))
	var mp := MeshPainter.new()
	for g in 3:
		var c := Vector2(_rng.randf_range(0, 2600), horizon_y + _rng.randf_range(-200, 500))
		var col := _haze(_th.flower_colors[g % _th.flower_colors.size()], haze)
		for i in 9:
			var f := c + Vector2(_rng.randf_range(-120, 120), _rng.randf_range(-50, 50))
			mp.draw_colored_polygon(Art.ellipse(f, 12, 6, 10), col)
			mp.draw_colored_polygon(PackedVector2Array([f + Vector2(10, 0), f + Vector2(20, -6), f + Vector2(20, 6)]), col)
	p.add_child(MeshArt.new(mp.build()))
	p.z_index = -70


func _nebula_scene() -> void:
	# Far: soft nebula swirls.
	var far := _layer(0.03, 3000.0)
	for i in 12:
		var c := Vector2(_rng.randf_range(0, 3000), horizon_y - _rng.randf_range(200, 1100))
		var col: Color = _th.flower_colors[i % _th.flower_colors.size()]
		for k in 3:
			far.painter.draw_colored_polygon(Art.ellipse(c + Vector2(k * 60, k * -20), 300.0 - k * 70.0, 120.0 - k * 25.0, 24), Color(col, 0.06))
	_commit(far)
	# Mid: floating dream islands with crystals.
	var mid := _layer(0.16, 2600.0)
	var isle := _haze(_th.ground, 0.4)
	for i in 6:
		var c := Vector2(_rng.randf_range(0, 2600), horizon_y - _rng.randf_range(250, 800))
		var w := _rng.randf_range(90, 180)
		mid.painter.draw_colored_polygon(PackedVector2Array([c + Vector2(-w, 0), c + Vector2(w, 0), c + Vector2(w * 0.3, w * 0.9), c + Vector2(-w * 0.2, w * 0.7)]), isle)
		mid.painter.draw_colored_polygon(Art.ellipse(c, w, 16, 16), _haze(_th.top, 0.35))
		for k in 3:
			var cx := c.x + _rng.randf_range(-w * 0.6, w * 0.6)
			mid.painter.draw_colored_polygon(PackedVector2Array([Vector2(cx - 10, c.y), Vector2(cx, c.y - _rng.randf_range(40, 90)), Vector2(cx + 10, c.y)]), _haze(_th.accent, 0.3))
	_commit(mid)
	# Near: jagged crystal spires along the bottom.
	var near := _layer(0.4, 2000.0)
	var cry := _haze(_th.ground_dark, 0.2)
	var x := 0.0
	while x < 2000.0:
		var h := _rng.randf_range(120, 420)
		var w := _rng.randf_range(40, 90)
		near.painter.draw_colored_polygon(PackedVector2Array([Vector2(x, horizon_y + 80), Vector2(x + w * 0.5, horizon_y + 80 - h), Vector2(x + w, horizon_y + 80)]), cry)
		x += w * 0.8
	near.painter.draw_rect(Rect2(0, horizon_y + 78, 2000, DEPTH), cry)
	_commit(near)


func _gear_shape(l: Layer, c: Vector2, r: float, color: Color) -> void:
	var pts := PackedVector2Array()
	var n := int(r / 9.0) * 2
	for i in n * 3:
		var a := TAU * i / (n * 3.0)
		var rr := r if (i / 3) % 2 == 0 else r * 0.84
		pts.append(c + Vector2(cos(a), sin(a)) * rr)
	l.painter.draw_colored_polygon(pts, color)
	l.painter.draw_colored_polygon(Art.ellipse(c, r * 0.55, r * 0.55, 24), color.darkened(0.12))
	for k in 6:
		var a := TAU * k / 6.0
		l.painter.draw_colored_polygon(Art.ellipse(c + Vector2(cos(a), sin(a)) * r * 0.36, r * 0.1, r * 0.1, 10), color.darkened(0.3))
	l.painter.draw_colored_polygon(Art.ellipse(c, r * 0.14, r * 0.14, 12), color.lightened(0.2))


# --- Layer plumbing -------------------------------------------------------------------

## One parallax layer being painted: call _commit() when done.
class Layer:
	var parallax: Parallax2D
	var painter := MeshPainter.new()
	var width := 0.0
	var profile := PackedVector2Array()   ## top edge of the last hill band (for placing things)


## A baked mesh drawn as one canvas item.
class MeshArt extends Node2D:
	var mesh: ArrayMesh

	func _init(m: ArrayMesh) -> void:
		mesh = m

	func _draw() -> void:
		draw_mesh(mesh, null)


## Visible half-height (world px) at the camera's usual zoom: layers are
## anchored so they line up with the world when the camera centres on horizon_y.
const HALF_VIEW := 620.0


func _parallax(scale: float, repeat: float, autoscroll := Vector2.ZERO) -> Parallax2D:
	var p := Parallax2D.new()
	p.scroll_scale = Vector2(scale, scale * 0.9 + 0.1)
	p.scroll_offset.y = -(horizon_y - HALF_VIEW) * (1.0 - p.scroll_scale.y)
	p.repeat_size = Vector2(repeat, 0)
	p.repeat_times = 3
	p.autoscroll = autoscroll
	p.z_index = -100
	add_child(p, false, Node.INTERNAL_MODE_FRONT)
	return p


func _layer(scale: float, width: float) -> Layer:
	var l := Layer.new()
	l.parallax = _parallax(scale, width)
	l.width = width
	return l


func _commit(l: Layer) -> void:
	l.parallax.add_child(MeshArt.new(l.painter.build()))


## Colour pushed toward the sky colour: things far away fade into the air.
func _haze(c: Color, amount: float) -> Color:
	return c.lerp(_th.sky_bottom, amount)


## Height of the last hill band at x (wraps around the layer width).
func _ground_at(l: Layer, x: float) -> float:
	var pts := l.profile
	if pts.is_empty():
		return horizon_y
	x = fposmod(x, l.width)
	for i in pts.size() - 1:
		if x >= pts[i].x and x <= pts[i + 1].x:
			return lerpf(pts[i].y, pts[i + 1].y, (x - pts[i].x) / maxf(pts[i + 1].x - pts[i].x, 0.01))
	return pts[0].y


# --- Building blocks ------------------------------------------------------------------

## Rolling hills that loop seamlessly over `width`, with a lighter rim and
## a darker band lower down for depth.
func _hill_band(l: Layer, width: float, y: float, amp: float, bumps: int, color: Color) -> void:
	var phase := _rng.randf() * TAU
	var steps := 80
	var top := PackedVector2Array()
	for i in steps + 1:
		var t := TAU * float(i) / steps
		# Whole-number frequencies only, so the band loops seamlessly over `width`.
		var h := sin(t * bumps + phase) * 0.6 + sin(t * (bumps * 2 + 1) + phase * 2.0) * 0.25 + sin(t + phase) * 0.15
		top.append(Vector2(width * float(i) / steps, y - (h * 0.5 + 0.5) * amp))
	var poly := top.duplicate()
	poly.append(Vector2(width, y + DEPTH))
	poly.append(Vector2(0, y + DEPTH))
	l.painter.draw_colored_polygon(poly, color)
	# Shading band that follows the hill shape.
	var band := PackedVector2Array()
	for p in top:
		band.append(p + Vector2(0, amp * 0.55 + 40.0))
	var band_poly := band.duplicate()
	band_poly.append(Vector2(width, y + DEPTH))
	band_poly.append(Vector2(0, y + DEPTH))
	l.painter.draw_colored_polygon(band_poly, color.darkened(0.07))
	l.painter.draw_polyline(top, color.lightened(0.18), 6.0)
	l.profile = top


func _mountain_layer(scale: float, width: float, haze: float, height: float, peaks: int, snow: bool) -> void:
	var l := _layer(scale, width)
	var base_y := horizon_y - 200.0
	var col := _haze(_th.far_hills.darkened(0.08), haze)
	var phase := _rng.randf() * TAU
	var steps := 160
	var top := PackedVector2Array()
	for i in steps + 1:
		var t := TAU * float(i) / steps
		# 1 - |cos| = sharp ridges with rounded valleys; whole-number
		# frequencies keep it seamless over `width`.
		var ridge := 1.0 - absf(cos(t * peaks * 0.5 + phase))
		var ridge2 := 1.0 - absf(cos(t * (peaks + 2) * 0.5 + phase * 1.7))
		var h := ridge * 0.7 + ridge2 * 0.22 + sin(t * 9.0 + phase) * 0.04
		top.append(Vector2(width * float(i) / steps, base_y - h * height))
	var poly := top.duplicate()
	poly.append(Vector2(width, base_y + DEPTH))
	poly.append(Vector2(0, base_y + DEPTH))
	l.painter.draw_colored_polygon(poly, col)
	# Shadowed lower slopes.
	var band := PackedVector2Array()
	for p in top:
		band.append(p + Vector2(0, height * 0.35))
	band.append(Vector2(width, base_y + DEPTH))
	band.append(Vector2(0, base_y + DEPTH))
	l.painter.draw_colored_polygon(band, col.darkened(0.05))
	if snow:
		var snowline := base_y - height * 0.62
		var cap := Rect2(-10, snowline - height * 2.0, width + 20, height * 2.0)
		for piece in Geometry2D.intersect_polygons(poly, Art.rect(cap.position, cap.end)):
			l.painter.draw_colored_polygon(piece, _haze(Color.WHITE, haze * 0.5))
	_commit(l)


func _tree_row(l: Layer, width: float, count: int, s: float, color: Color, detailed: bool) -> void:
	for i in count:
		var x := (float(i) + _rng.randf_range(0.1, 0.9)) * width / count
		_round_tree(l, Vector2(x, _ground_at(l, x) + 8.0 * s), s * _rng.randf_range(0.8, 1.25), color, detailed)


func _round_tree(l: Layer, base: Vector2, s: float, color: Color, detailed: bool) -> void:
	var mp := l.painter
	var trunk := color.darkened(0.45).lerp(_th.ground, 0.3)
	mp.draw_colored_polygon(PackedVector2Array([base + Vector2(-9, 0) * s, base + Vector2(-5, -70) * s, base + Vector2(5, -70) * s, base + Vector2(9, 0) * s]), trunk)
	var blobs := [Vector3(0, -100, 40), Vector3(-30, -76, 28), Vector3(30, -78, 30), Vector3(-14, -122, 26), Vector3(18, -118, 24)]
	for b: Vector3 in blobs:
		mp.draw_colored_polygon(Art.ellipse(base + Vector2(b.x, b.y) * s, b.z * s, b.z * s * 0.9, 18), color.darkened(0.12))
	if detailed:
		for b: Vector3 in blobs:
			mp.draw_colored_polygon(Art.ellipse(base + Vector2(b.x - b.z * 0.18, b.y - b.z * 0.18) * s, b.z * s * 0.78, b.z * s * 0.7, 16), color)
		mp.draw_colored_polygon(Art.ellipse(base + Vector2(-12, -118) * s, 10 * s, 7 * s, 12), color.lightened(0.18))


func _pine_row(l: Layer, width: float, count: int, s: float, color: Color, snow: bool) -> void:
	for i in count:
		var x := (float(i) + _rng.randf_range(0.1, 0.9)) * width / count
		var base := Vector2(x, _ground_at(l, x) + 6.0)
		var ss := s * _rng.randf_range(0.8, 1.3)
		l.painter.draw_rect(Rect2(base + Vector2(-6, -24) * ss, Vector2(12, 24) * ss), color.darkened(0.4))
		for k in 3:
			var w := (58.0 - k * 14.0) * ss
			var y := base.y - (20.0 + k * 38.0) * ss
			l.painter.draw_colored_polygon(PackedVector2Array([Vector2(base.x - w, y), Vector2(base.x, y - 62 * ss), Vector2(base.x + w, y)]), color)
			if snow:
				l.painter.draw_colored_polygon(PackedVector2Array([Vector2(base.x - w * 0.35, y - 40 * ss), Vector2(base.x, y - 62 * ss), Vector2(base.x + w * 0.35, y - 40 * ss)]), _haze(Color.WHITE, 0.1))


func _bushes(l: Layer, width: float, count: int, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 10.0)
		for k in 3:
			l.painter.draw_colored_polygon(Art.ellipse(base + Vector2((k - 1) * 22, -14 - (k % 2) * 8), 24, 20, 14), color.lightened(k * 0.05))


func _windmill(l: Layer, at: Vector2, s: float, color: Color) -> void:
	var base := Vector2(at.x, _ground_at(l, at.x) + 10.0)
	var mp := l.painter
	mp.draw_colored_polygon(PackedVector2Array([base + Vector2(-34, 0) * s, base + Vector2(-20, -150) * s, base + Vector2(20, -150) * s, base + Vector2(34, 0) * s]), color)
	mp.draw_colored_polygon(PackedVector2Array([base + Vector2(-28, -150) * s, base + Vector2(0, -186) * s, base + Vector2(28, -150) * s]), color.darkened(0.3))
	mp.draw_rect(Rect2(base + Vector2(-8, -40) * s, Vector2(16, 40) * s), color.darkened(0.35))
	var hub := base + Vector2(0, -150) * s
	for k in 4:
		var a := k * PI * 0.5 + 0.35
		var d := Vector2(cos(a), sin(a))
		var n := d.orthogonal()
		mp.draw_colored_polygon(PackedVector2Array([hub + n * 3 * s, hub + d * 120 * s + n * 3 * s, hub + d * 120 * s + n * 22 * s, hub + d * 30 * s + n * 18 * s]), color.lightened(0.15))
		mp.draw_line(hub, hub + d * 122 * s, color.darkened(0.3), 4.0 * s)
	mp.draw_circle(hub, 8 * s, color.darkened(0.4))


func _trunk_row(l: Layer, width: float, count: int, w: float, color: Color) -> PackedFloat32Array:
	var xs := PackedFloat32Array()
	for i in count:
		var x := (float(i) + _rng.randf_range(0.2, 0.8)) * width / count
		xs.append(x)
		var ww := w * _rng.randf_range(0.8, 1.2)
		var top := horizon_y - 2400.0
		var bot := horizon_y + 400.0
		l.painter.draw_colored_polygon(PackedVector2Array([
			Vector2(x - ww * 0.5, top), Vector2(x + ww * 0.5, top), Vector2(x + ww * 0.55, bot - 120),
			Vector2(x + ww * 0.95, bot), Vector2(x - ww * 0.95, bot), Vector2(x - ww * 0.55, bot - 120)]), color)
		l.painter.draw_rect(Rect2(x - ww * 0.5, top, ww * 0.22, bot - top - 120), color.lightened(0.08))
		for k in 5:  # bark rings
			var y := _rng.randf_range(top + 400, bot - 200)
			l.painter.draw_line(Vector2(x - ww * 0.4, y), Vector2(x + ww * 0.3, y + 6), color.darkened(0.15), 3.0)
	return xs


func _canopy_band(l: Layer, width: float, y: float, color: Color) -> void:
	var n := int(width / 90.0)
	for i in n + 1:
		var x := width * float(i) / n
		var r := _rng.randf_range(80, 150)
		l.painter.draw_colored_polygon(Art.ellipse(Vector2(x, y + _rng.randf_range(-40, 60)), r, r * 0.7, 18), color)
	l.painter.draw_rect(Rect2(0, y - 2400.0, width, 2400.0), color)


func _ferns(l: Layer, width: float, count: int, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 12.0)
		for k in 5:
			var a := -PI * 0.5 + (k - 2) * 0.38
			var tip := base + Vector2(cos(a), sin(a)) * _rng.randf_range(50, 80)
			var n := (tip - base).normalized().orthogonal() * 7.0
			l.painter.draw_colored_polygon(PackedVector2Array([base - n, tip, base + n]), color.lightened(k * 0.03))


func _rock_band(l: Layer, width: float, y: float, amp: float, color: Color, arches: bool) -> void:
	_hill_band(l, width, y, amp, 5, color)
	# Ceiling: an inverted band hanging from above.
	var steps := 60
	var bottom := PackedVector2Array()
	var phase := _rng.randf() * TAU
	for i in steps + 1:
		var t := TAU * float(i) / steps
		var h := sin(t * 3.0 + phase) * 0.6 + sin(t * 7.0 + phase) * 0.4
		bottom.append(Vector2(width * float(i) / steps, y - 1500.0 + (h * 0.5 + 0.5) * amp))
	var poly := bottom.duplicate()
	poly.append(Vector2(width, y - 5000.0))
	poly.append(Vector2(0, y - 5000.0))
	l.painter.draw_colored_polygon(poly, color.darkened(0.1))
	if arches:
		for i in 3:
			var x := _rng.randf_range(0, width)
			l.painter.draw_colored_polygon(Art.ellipse(Vector2(x, y - 600), 160, 260, 24), color.darkened(0.2))


func _stalactites(l: Layer, width: float, count: int, ceiling_y: float, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var w := _rng.randf_range(20, 50)
		var h := _rng.randf_range(90, 260)
		l.painter.draw_colored_polygon(PackedVector2Array([Vector2(x - w, ceiling_y), Vector2(x + w, ceiling_y), Vector2(x + w * 0.2, ceiling_y + h), Vector2(x, ceiling_y + h + 20)]), color)


func _crystals(l: Layer, width: float, count: int, y: float, s: float) -> void:
	var cols := [Color("7ee0ff"), Color("c58bff"), Color("7dffb0")]
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 10.0) if not l.profile.is_empty() else Vector2(x, y)
		var c: Color = cols[_rng.randi() % cols.size()]
		l.painter.draw_circle(base + Vector2(0, -40) * s, 90 * s, Color(c, 0.1))
		l.painter.draw_circle(base + Vector2(0, -40) * s, 50 * s, Color(c, 0.12))
		for k in 3:
			var h := _rng.randf_range(50, 110) * s
			var ox := (k - 1) * 18.0 * s
			var lean := (k - 1) * 0.35
			var tip := base + Vector2(ox + lean * h, -h)
			l.painter.draw_colored_polygon(PackedVector2Array([base + Vector2(ox - 10 * s, 0), tip, base + Vector2(ox + 10 * s, 0)]), c.darkened(0.1))
			l.painter.draw_colored_polygon(PackedVector2Array([base + Vector2(ox - 3 * s, 0), tip, base + Vector2(ox + 6 * s, 0)]), c.lightened(0.3))


func _glow_mushrooms(l: Layer, width: float, count: int, s: float) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 10.0)
		var c := Color("ff8ad8") if i % 2 == 0 else Color("8affe0")
		var ss := s * _rng.randf_range(0.7, 1.3)
		l.painter.draw_circle(base + Vector2(0, -70) * ss, 110 * ss, Color(c, 0.08))
		l.painter.draw_rect(Rect2(base + Vector2(-8, -70) * ss, Vector2(16, 70) * ss), Color("e8e0d0").darkened(0.4))
		l.painter.draw_colored_polygon(Art.ellipse(base + Vector2(0, -74) * ss, 50 * ss, 26 * ss, 20), c.darkened(0.2))
		l.painter.draw_colored_polygon(Art.ellipse(base + Vector2(-8, -80) * ss, 34 * ss, 14 * ss, 16), c)
		for k in 3:
			l.painter.draw_circle(base + Vector2(-26 + k * 22, -82 + (k % 2) * 6) * ss, 4 * ss, Color(1, 1, 1, 0.8))


func _rope_bridge(l: Layer, a: Vector2, b: Vector2, color: Color) -> void:
	var sag := 60.0
	var pts := PackedVector2Array()
	for i in 21:
		var t := float(i) / 20.0
		pts.append(a.lerp(b, t) + Vector2(0, sin(t * PI) * sag))
	l.painter.draw_polyline(pts, color.darkened(0.3), 3.0)
	for i in range(1, 20):
		var p := pts[i]
		l.painter.draw_rect(Rect2(p + Vector2(-9, 0), Vector2(18, 6)), color)
	var rail := PackedVector2Array()
	for p in pts:
		rail.append(p + Vector2(0, -34))
	l.painter.draw_polyline(rail, color.darkened(0.3), 2.0)


func _hut(l: Layer, at: Vector2, s: float, wall: Color, roof: Color) -> void:
	var mp := l.painter
	mp.draw_rect(Rect2(at + Vector2(-130, 0) * s, Vector2(260, 16) * s), wall.darkened(0.25))  # platform
	mp.draw_rect(Rect2(at + Vector2(-60, -90) * s, Vector2(120, 90) * s), wall)
	mp.draw_colored_polygon(PackedVector2Array([at + Vector2(-85, -86) * s, at + Vector2(0, -160) * s, at + Vector2(85, -86) * s]), roof)
	mp.draw_rect(Rect2(at + Vector2(-16, -52) * s, Vector2(32, 52) * s), wall.darkened(0.4))
	mp.draw_circle(at + Vector2(34, -60) * s, 12 * s, Color(1.0, 0.85, 0.4, 0.8))  # warm window


func _leaf_clusters(l: Layer, width: float, count: int, y: float, color: Color) -> void:
	for i in count:
		var c := Vector2(_rng.randf_range(0, width), y + _rng.randf_range(-600, 300))
		for k in 6:
			var p := c + Vector2(_rng.randf_range(-90, 90), _rng.randf_range(-50, 50))
			l.painter.draw_colored_polygon(Art.ellipse(p, 60, 40, 14), color.lightened(k * 0.03))


func _mill(l: Layer, at: Vector2, s: float) -> void:
	var mp := l.painter
	var wall := _haze(Color("e8d5b0"), 0.15)
	var roof := _haze(Color("b5533c"), 0.15)
	mp.draw_rect(Rect2(at + Vector2(-90, -150) * s, Vector2(180, 150) * s), wall)
	mp.draw_colored_polygon(PackedVector2Array([at + Vector2(-110, -146) * s, at + Vector2(0, -230) * s, at + Vector2(110, -146) * s]), roof)
	mp.draw_rect(Rect2(at + Vector2(-20, -60) * s, Vector2(40, 60) * s), wall.darkened(0.4))
	var hub := at + Vector2(-110, -70) * s
	var wood := _haze(_th.ledge.darkened(0.2), 0.15)
	mp.draw_circle(hub, 80 * s, wood.darkened(0.2), false, 8.0)
	for k in 8:
		var a := k * TAU / 8.0
		mp.draw_line(hub, hub + Vector2(cos(a), sin(a)) * 80 * s, wood, 6.0)
		mp.draw_rect(Rect2(hub + Vector2(cos(a), sin(a)) * 80 * s - Vector2(10, 10) * s, Vector2(20, 20) * s), wood)
	mp.draw_circle(hub, 12 * s, wood.darkened(0.3))


func _castle(l: Layer, at: Vector2, s: float, color: Color, glow: Color) -> void:
	var mp := l.painter
	mp.draw_colored_polygon(PackedVector2Array([at + Vector2(-260, 300) * s, at + Vector2(-150, 40) * s, at + Vector2(160, 30) * s, at + Vector2(280, 300) * s]), color.darkened(0.1))
	for t: Vector3 in [Vector3(-110, 190, 48), Vector3(0, 280, 60), Vector3(120, 220, 46)]:
		var top := at + Vector2(t.x, 40 - t.y) * s
		mp.draw_rect(Rect2(top + Vector2(-t.z * 0.5, 0) * s, Vector2(t.z, t.y) * s), color)
		mp.draw_colored_polygon(PackedVector2Array([top + Vector2(-t.z * 0.65, 0) * s, top + Vector2(0, -t.z * 1.3) * s, top + Vector2(t.z * 0.65, 0) * s]), color.darkened(0.2))
		mp.draw_rect(Rect2(top + Vector2(-6, 30) * s, Vector2(12, 20) * s), glow)
	mp.draw_rect(Rect2(at + Vector2(-150, -20) * s, Vector2(300, 80) * s), color)
	for k in 8:
		mp.draw_rect(Rect2(at + Vector2(-150 + k * 40, -38) * s, Vector2(22, 20) * s), color)


func _thorns(l: Layer, width: float, count: int, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 10.0)
		for k in 3:
			var pts := PackedVector2Array()
			var p := base
			var a := -PI * 0.5 + (k - 1) * 0.5
			for j in 8:
				pts.append(p)
				a += _rng.randf_range(-0.5, 0.5)
				p += Vector2(cos(a), sin(a)) * 22.0
			l.painter.draw_polyline(pts, color, 7.0)
			for j in range(1, pts.size(), 2):
				var d := (pts[j] - pts[j - 1]).normalized().orthogonal() * 12.0
				l.painter.draw_colored_polygon(PackedVector2Array([pts[j] - d * 0.3, pts[j] + d, pts[j] + d * 0.1 + (pts[j] - pts[j - 1]) * 0.3]), color)


func _reeds(l: Layer, width: float, count: int, color: Color) -> void:
	for i in count:
		var x := _rng.randf_range(0, width)
		var base := Vector2(x, _ground_at(l, x) + 14.0)
		for k in 4:
			var tip := base + Vector2((k - 1.5) * 10 + _rng.randf_range(-6, 6), -_rng.randf_range(50, 90))
			l.painter.draw_line(base + Vector2((k - 1.5) * 4, 0), tip, color, 4.0)
			if k % 2 == 0:
				l.painter.draw_colored_polygon(Art.ellipse(tip + Vector2(0, 10), 5, 14, 10), color.darkened(0.3))


func _lollipop(l: Layer, at: Vector2, s: float, haze: float) -> void:
	var base := Vector2(at.x, _ground_at(l, at.x) + 10.0)
	var cols: Array = _th.flower_colors
	var c: Color = _haze(cols[_rng.randi() % cols.size()], haze)
	l.painter.draw_rect(Rect2(base + Vector2(-5, -120) * s, Vector2(10, 120) * s), _haze(Color.WHITE, haze))
	var top := base + Vector2(0, -150) * s
	l.painter.draw_circle(top, 44 * s, c)
	var pts := PackedVector2Array()
	for k in 40:
		var a := k * 0.45
		pts.append(top + Vector2(cos(a), sin(a)) * (4.0 + k) * s)
	l.painter.draw_polyline(pts, _haze(Color.WHITE, haze + 0.1), 5.0 * s)
