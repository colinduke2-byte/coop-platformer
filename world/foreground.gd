class_name Foreground
extends CanvasLayer
## Dark, soft silhouettes (leaves, icicles, pipes, kelp, crystals...) framing the top and
## bottom edges of the screen and sliding FASTER than the world (parallax > 1), so the
## play area feels like it sits inside a diorama. Style follows the level's Backdrop
## scenery. Kept to thin edge strips so it never hides the action.
##   Low: none   Medium: one layer   High: two layers
## Added to every Level automatically (level.gd), below the colour grade.

const TILE := 2400.0
const VIEW := Vector2(1920, 1080)

enum Style { LEAVES, ICICLES, PIPES, KELP, CRYSTALS, STALACTITES }

var _layers: Array[Dictionary] = []   ## {"node": Node2D, "speed": float}


func _init() -> void:
	layer = 1
	name = "Foreground"


func setup(theme: LevelTheme, scenery: int) -> void:
	if not Gfx.at_least(Gfx.Level.MEDIUM):
		return
	var style := _style_for(scenery)
	if style == Style.LEAVES:
		return   # leafy worlds (meadow, forest, jungle...) keep the screen clear: no dark leaves
	var base := theme.ground_dark.darkened(0.55)
	base = base.lerp(theme.sky_top.darkened(0.8), 0.35)
	_add_layer(style, base, 1.32, 0.94, 11)
	if Gfx.at_least(Gfx.Level.HIGH):
		_add_layer(style, base.lightened(0.12), 1.12, 0.55, 29)


static func _style_for(scenery: int) -> int:
	match scenery:
		Backdrop.Scenery.ICE: return Style.ICICLES
		Backdrop.Scenery.FACTORY: return Style.PIPES
		Backdrop.Scenery.OCEAN, Backdrop.Scenery.DEEP: return Style.KELP
		Backdrop.Scenery.NEBULA: return Style.CRYSTALS
		Backdrop.Scenery.CAVE: return Style.STALACTITES
		_: return Style.LEAVES


func _add_layer(style: int, color: Color, speed: float, alpha: float, seed_value: int) -> void:
	var mp := MeshPainter.new()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var c := Color(color, alpha)
	_top(mp, rng, style, c)
	_bottom(mp, rng, style, c)
	var holder := Node2D.new()
	for i in 2:
		var art := Backdrop.MeshArt.new(mp.build() if i == 0 else holder.get_child(0).mesh)
		art.position.x = i * TILE
		holder.add_child(art)
	add_child(holder)
	_layers.append({"node": holder, "speed": speed})


func _leaf(mp: MeshPainter, at: Vector2, ang: float, len: float, wid: float, c: Color) -> void:
	var dir := Vector2.from_angle(ang)
	var side := dir.orthogonal()
	var pts := PackedVector2Array()
	for i in 9:
		var t := float(i) / 8.0
		pts.append(at + dir * len * t + side * sin(t * PI) * wid * 0.5)
	for i in range(8, -1, -1):
		var t := float(i) / 8.0
		pts.append(at + dir * len * t - side * sin(t * PI) * wid * 0.5)
	mp.draw_colored_polygon(pts, c)


func _top(mp: MeshPainter, rng: RandomNumberGenerator, style: int, c: Color) -> void:
	var x := rng.randf_range(0, 200)
	while x < TILE:
		match style:
			Style.LEAVES:
				var n := rng.randi_range(3, 5)
				var len := rng.randf_range(55, 110)
				mp.draw_line(Vector2(x, -10), Vector2(x + rng.randf_range(-20, 20), len * 0.7), c, 5.0)
				for k in n:
					_leaf(mp, Vector2(x, -12), PI * 0.5 + rng.randf_range(-0.9, 0.9), len * rng.randf_range(0.6, 1.0), rng.randf_range(28, 46), c)
				x += rng.randf_range(420, 820)
			Style.ICICLES:
				var h := rng.randf_range(50, 150)
				var w := rng.randf_range(14, 30)
				mp.draw_colored_polygon(PackedVector2Array([Vector2(x - w, -4), Vector2(x + w, -4), Vector2(x + rng.randf_range(-5, 5), h)]), c)
				x += rng.randf_range(40, 150)
			Style.PIPES:
				var h2 := rng.randf_range(60, 150)
				var w2 := rng.randf_range(12, 26)
				mp.draw_rect(Rect2(x - w2 * 0.5, -4, w2, h2), c)
				mp.draw_rect(Rect2(x - w2 * 0.8, h2 * 0.5, w2 * 1.6, 8), c)
				x += rng.randf_range(160, 420)
			Style.KELP:
				var len3 := rng.randf_range(80, 170)
				var pts := PackedVector2Array()
				for i in 8:
					var t := float(i) / 7.0
					pts.append(Vector2(x + sin(t * 4.0 + x) * 14.0, -6 + t * len3))
				mp.draw_polyline(pts, c, rng.randf_range(8, 14))
				x += rng.randf_range(200, 480)
			Style.CRYSTALS, Style.STALACTITES:
				var h4 := rng.randf_range(60, 170)
				var w4 := rng.randf_range(16, 34)
				mp.draw_colored_polygon(PackedVector2Array([Vector2(x - w4, -4), Vector2(x + w4, -4), Vector2(x + rng.randf_range(-8, 8), h4)]), c)
				x += rng.randf_range(90, 300)


func _bottom(mp: MeshPainter, rng: RandomNumberGenerator, style: int, c: Color) -> void:
	var y0 := VIEW.y + 6.0
	var x := rng.randf_range(0, 120)
	while x < TILE:
		match style:
			Style.LEAVES:
				for k in rng.randi_range(4, 8):  # a tuft of grass blades / leaves
					var ang := -PI * 0.5 + rng.randf_range(-0.55, 0.55)
					_leaf(mp, Vector2(x + k * 7.0, y0), ang, rng.randf_range(40, 110), rng.randf_range(8, 18), c)
				x += rng.randf_range(120, 340)
			Style.ICICLES:
				var r := rng.randf_range(40, 90)
				mp.draw_colored_polygon(Art.ellipse(Vector2(x, y0 + 6), r * 1.8, r * 0.7, 18), c)
				x += rng.randf_range(260, 520)
			Style.PIPES:
				var r2 := rng.randf_range(34, 74)  # half a gear sunk into the floor
				var gear := PackedVector2Array()
				for k in 25:
					var a := PI + PI * float(k) / 24.0
					var rr := r2 * (1.0 if (k / 2) % 2 == 0 else 0.82)
					gear.append(Vector2(x + cos(a) * rr, y0 + sin(a) * rr))
				mp.draw_colored_polygon(gear, c)
				x += rng.randf_range(240, 560)
			Style.KELP:
				var len3 := rng.randf_range(90, 170)
				var pts := PackedVector2Array()
				for i in 9:
					var t := float(i) / 8.0
					pts.append(Vector2(x + sin(t * 3.5 + x * 0.1) * 18.0, y0 - t * len3))
				mp.draw_polyline(pts, c, rng.randf_range(9, 15))
				x += rng.randf_range(100, 300)
			Style.CRYSTALS, Style.STALACTITES:
				var h4 := rng.randf_range(40, 110)
				var w4 := rng.randf_range(16, 38)
				mp.draw_colored_polygon(PackedVector2Array([Vector2(x - w4, y0), Vector2(x + w4, y0), Vector2(x + rng.randf_range(-8, 8), y0 - h4)]), c)
				x += rng.randf_range(90, 280)


func _process(_delta: float) -> void:
	if not View.active:
		return
	var cam_x := View.rect.position.x + View.rect.size.x * 0.5
	for l in _layers:
		(l["node"] as Node2D).position.x = -fposmod(cam_x * float(l["speed"]), TILE)
