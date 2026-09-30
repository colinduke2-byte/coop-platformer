@tool
class_name Deco
extends Node2D
## Non-colliding scenery. Pick a `kind`, place its origin on the ground
## (HANGING_VINES / ROOTS: on a ceiling). Colours follow the level theme. Put in
## front of the action (foreground) with `front = true` for depth - sparingly.
## Drawn ONCE into a mesh; the breeze is a shear (skew), so hundreds are cheap.

enum Kind { GRASS, FLOWERS, BUSH, TREE, PINE, MUSHROOMS, ROCK, FENCE, CRYSTALS, CANDY_CANE, LOLLIPOP, REEDS,
		FERN, LOG, STUMP, GIANT_MUSHROOM, HANGING_VINES, LILYPADS, BIG_FLOWER, ROOTS }

const SWAYERS := [Kind.GRASS, Kind.FLOWERS, Kind.REEDS, Kind.TREE, Kind.PINE, Kind.BUSH, Kind.FERN,
		Kind.HANGING_VINES, Kind.BIG_FLOWER]

@export var kind := Kind.FLOWERS:
	set(v):
		kind = v
		_invalidate()
@export var size := 1.0:
	set(v):
		size = v
		_invalidate()
@export var seed_value := 0:
	set(v):
		seed_value = v
		_invalidate()
@export var front := false:                 ## draw in front of players
	set(v):
		front = v
		z_index = 20 if v else -10
@export var sway := true                    ## gentle wind animation

var _t := 0.0
var _mesh: ArrayMesh
var _glow := false   ## GIANT_MUSHROOM: pulsing glow drawn live


func _ready() -> void:
	z_index = 20 if front else -10
	_t = float(hash(global_position) % 1000) * 0.01


func _invalidate() -> void:
	_mesh = null
	queue_redraw()


func _process(delta: float) -> void:
	_t += delta
	if sway and kind in SWAYERS and View.sees(global_position, 300.0):
		var amount := 0.05 if kind in [Kind.TREE, Kind.PINE, Kind.BUSH] else 0.12
		if kind == Kind.HANGING_VINES:
			amount = -0.08  # hangs down: shear the other way
		skew = sin(_t * 1.7) * amount
	if kind == Kind.GIANT_MUSHROOM:
		View.redraw(self)


func _draw() -> void:
	if _mesh == null:
		var mp := MeshPainter.new()
		_paint(mp)
		_mesh = mp.build()
	if kind == Kind.GIANT_MUSHROOM:
		var th := LevelTheme.find(self)
		var pulse := 0.5 + 0.5 * sin(_t * 2.0)
		draw_circle(Vector2(0, -130) * size, (150.0 + pulse * 20.0) * size, Color(th.accent, 0.07 + pulse * 0.03))
		draw_circle(Vector2(0, -130) * size, 90.0 * size, Color(th.accent, 0.06))
	draw_mesh(_mesh, null)


func _paint(mp: MeshPainter) -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value + hash(Vector2i(position))
	var s := size
	var wind := 0.0
	match kind:
		Kind.GRASS, Kind.REEDS:
			var tall := 2.2 if kind == Kind.REEDS else 1.0
			for i in 7:
				var x := (float(i) - 3.0) * 7.0 * s + rng.randf_range(-3, 3)
				var h := rng.randf_range(18, 34) * s * tall
				var tip := Vector2(x + h * (wind + rng.randf_range(-0.2, 0.2)), -h)
				mp.draw_colored_polygon(PackedVector2Array([Vector2(x - 4 * s, 0), tip, Vector2(x + 4 * s, 0)]),
						th.foliage if i % 2 == 0 else th.foliage_dark)
				if kind == Kind.REEDS and i % 3 == 0:
					Art.shape(mp, Art.ellipse(tip + Vector2(0, 8 * s), 4 * s, 10 * s, 10), th.ground_dark, o, 1.5)
		Kind.FLOWERS:
			for i in 5:
				var x := (float(i) - 2.0) * 14.0 * s + rng.randf_range(-4, 4)
				var h := rng.randf_range(20, 40) * s
				var tip := Vector2(x + h * wind * (1.0 + i * 0.2), -h)
				mp.draw_line(Vector2(x, 0), tip, th.foliage_dark, 3.0 * s)
				Art.shape(mp, Art.ellipse(Vector2(x + 6 * s, -h * 0.4), 6 * s, 3 * s, 8), th.foliage, o, 1.5)
				var c: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
				for k in 5:
					var a := TAU * k / 5.0
					Art.shape(mp, Art.ellipse(tip + Vector2.from_angle(a) * 6.5 * s, 5 * s, 5 * s, 8), c, o, 1.5)
				mp.draw_circle(tip, 4.0 * s, Color("ffd23f"))
		Kind.BUSH:
			var blobs := [Vector3(0, -28, 30), Vector3(-30, -18, 22), Vector3(30, -18, 24), Vector3(-12, -40, 20), Vector3(16, -42, 22)]
			for b: Vector3 in blobs:
				Art.shape(mp, Art.ellipse(Vector2(b.x + wind * 30.0 * (-b.y / 40.0), b.y) * s, b.z * s, b.z * s * 0.85, 16), th.foliage, o, 3.0)
			for b: Vector3 in blobs:
				mp.draw_colored_polygon(Art.ellipse(Vector2(b.x - 6, b.y - 6) * s, b.z * 0.5 * s, b.z * 0.35 * s, 12), th.foliage.lightened(0.15))
			for i in 3:
				var c: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
				mp.draw_circle(Vector2(rng.randf_range(-30, 30), rng.randf_range(-45, -12)) * s, 4.0 * s, c)
		Kind.TREE:
			var lean := wind * 60.0
			Art.shape(mp, PackedVector2Array([Vector2(-12, 0) * s, Vector2(-8, -110) * s, Vector2(8, -110) * s, Vector2(14, 0) * s]), th.ledge_dark, o, 3.0)
			for b: Vector3 in [Vector3(0, -150, 56), Vector3(-44, -118, 40), Vector3(46, -120, 42), Vector3(-18, -178, 36), Vector3(24, -176, 38)]:
				Art.shape(mp, Art.ellipse(Vector2(b.x + lean * (-b.y / 150.0), b.y) * s, b.z * s, b.z * 0.85 * s, 18), th.foliage, o, 3.0)
			mp.draw_colored_polygon(Art.ellipse(Vector2(-10 + lean, -165) * s, 26 * s, 16 * s, 14), th.foliage.lightened(0.15))
			for i in 4:
				var c: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
				mp.draw_circle(Vector2(rng.randf_range(-60, 60) + lean, rng.randf_range(-190, -110)) * s, 5.0 * s, c)
		Kind.PINE:
			Art.shape(mp, Art.rect(Vector2(-8, -30) * s, Vector2(8, 0) * s), th.ledge_dark, o, 3.0)
			for i in 3:
				var y := (-30.0 - i * 45.0) * s
				var w := (60.0 - i * 14.0) * s
				var tip := Vector2(wind * 40.0 * (i + 1), y - 70.0 * s)
				Art.shape(mp, PackedVector2Array([Vector2(-w, y), tip, Vector2(w, y)]), th.foliage_dark, o, 3.0)
				mp.draw_colored_polygon(PackedVector2Array([Vector2(-w * 0.6, y - 14 * s), tip + Vector2(0, 8 * s), Vector2(w * 0.3, y - 26 * s)]), th.top)
		Kind.MUSHROOMS:
			for i in 3:
				var x := (float(i) - 1.0) * 18.0 * s
				var h := (14.0 + i % 2 * 12.0) * s
				Art.shape(mp, Art.rect(Vector2(x - 4 * s, -h), Vector2(x + 4 * s, 0)), Color("fff4e0"), o, 2.0)
				var cap := PackedVector2Array()
				for k in 11:
					var a := PI + PI * k / 10.0
					cap.append(Vector2(x + cos(a) * 13 * s, -h + sin(a) * 11 * s))
				Art.shape(mp, cap, th.accent, o, 2.0)
				mp.draw_circle(Vector2(x - 4 * s, -h - 5 * s), 2.5 * s, Color.WHITE)
		Kind.ROCK:
			var pts := PackedVector2Array()
			for k in 8:
				var a := PI + PI * k / 7.0
				pts.append(Vector2(cos(a) * 40 * s * rng.randf_range(0.8, 1.1), sin(a) * 30 * s * rng.randf_range(0.8, 1.1)))
			Art.shape(mp, pts, th.ground.lerp(Color("a8a8b8"), 0.5), o, 3.0)
			mp.draw_colored_polygon(Art.ellipse(Vector2(-10, -18) * s, 12 * s, 6 * s, 10), Color(1, 1, 1, 0.3))
		Kind.FENCE:
			for i in 4:
				var x := (float(i) - 1.5) * 34.0 * s
				Art.shape(mp, PackedVector2Array([Vector2(x - 6 * s, 0), Vector2(x - 6 * s, -44 * s), Vector2(x, -52 * s), Vector2(x + 6 * s, -44 * s), Vector2(x + 6 * s, 0)]), th.ledge, o, 2.5)
			for y: float in [-36.0, -16.0]:
				Art.shape(mp, Art.rect(Vector2(-62, y - 4) * s, Vector2(62, y + 4) * s), th.ledge_dark, o, 2.0)
		Kind.CRYSTALS:
			for i in 4:
				var x := (float(i) - 1.5) * 16.0 * s
				var h := rng.randf_range(30, 70) * s
				var a := rng.randf_range(-0.3, 0.3)
				var pts := PackedVector2Array([Vector2(-8, 0), Vector2(-8, -h * 0.8), Vector2(0, -h), Vector2(8, -h * 0.8), Vector2(8, 0)])
				for k in pts.size():
					pts[k] = pts[k].rotated(a) * Vector2(s, 1.0) + Vector2(x, 0)
				Art.shape(mp, pts, th.accent.lightened(0.3), o, 2.5)
				mp.draw_line(pts[1].lerp(pts[2], 0.3), pts[0].lerp(pts[1], 0.4), Color(1, 1, 1, 0.6), 2.0)
		Kind.CANDY_CANE:
			var pts := PackedVector2Array()
			for i in 12:
				pts.append(Vector2(0, -i * 10.0) * s)
			for i in 9:
				var a := PI - PI * i / 8.0
				pts.append((Vector2(18, -120) + Vector2(cos(a), -sin(a)) * 18.0) * s)
			mp.draw_polyline(pts, o, 20.0 * s)
			mp.draw_polyline(pts, Color.WHITE, 14.0 * s)
			for i in range(0, pts.size() - 1, 2):
				mp.draw_line(pts[i], pts[i + 1], th.accent, 14.0 * s)
		Kind.LOLLIPOP:
			mp.draw_line(Vector2.ZERO, Vector2(0, -90) * s, o, 9.0 * s)
			mp.draw_line(Vector2.ZERO, Vector2(0, -90) * s, Color.WHITE, 5.0 * s)
			var cc := Vector2(0, -120) * s
			Art.shape(mp, Art.ellipse(cc, 34 * s, 34 * s, 24), th.accent, o, 3.0)
			var sp := PackedVector2Array()
			for i in 40:
				var a := i * 0.5
				sp.append(cc + Vector2.from_angle(a) * (i * 0.8) * s)
			mp.draw_polyline(sp, Color.WHITE, 5.0 * s)
		Kind.FERN:
			for i in 7:
				var a := -PI * 0.5 + (float(i) - 3.0) * 0.32
				var l := rng.randf_range(40, 62) * s
				var tip := Vector2.from_angle(a) * l
				var mid := tip * 0.5 + Vector2.from_angle(a).orthogonal() * 6.0 * s
				var pts := PackedVector2Array()
				for k in 9:
					var t := float(k) / 8.0
					pts.append(Vector2.ZERO.lerp(mid, t).lerp(mid.lerp(tip, t), t))
				mp.draw_polyline(pts, th.foliage_dark, 3.0 * s)
				for k in range(1, 8):
					var p := pts[k]
					var d := (pts[k + 1] - pts[k]).normalized().orthogonal() * (9.0 - k) * s
					mp.draw_colored_polygon(PackedVector2Array([p, p + d + (pts[k + 1] - p) * 0.5, pts[k + 1]]), th.foliage if i % 2 else th.foliage.darkened(0.08))
					mp.draw_colored_polygon(PackedVector2Array([p, p - d + (pts[k + 1] - p) * 0.5, pts[k + 1]]), th.foliage.darkened(0.12))
		Kind.LOG:
			var w := 150.0 * s
			var bark := th.ledge_dark.darkened(0.15)
			Art.shape(mp, Art.rounded_rect(Vector2(-w * 0.5, -40 * s), Vector2(w * 0.5, 0), 20.0 * s), bark, o, 3.0)
			mp.draw_line(Vector2(-w * 0.4, -26 * s), Vector2(w * 0.3, -26 * s), bark.darkened(0.2), 3.0)
			mp.draw_line(Vector2(-w * 0.2, -12 * s), Vector2(w * 0.4, -12 * s), bark.darkened(0.2), 3.0)
			Art.shape(mp, Art.ellipse(Vector2(w * 0.5 - 8 * s, -20 * s), 14 * s, 20 * s, 16), th.ledge.lightened(0.2), o, 2.5)
			for r in [12.0, 7.0, 3.0]:
				mp.draw_arc(Vector2(w * 0.5 - 8 * s, -20 * s), r * s, 0, TAU, 12, th.ledge_dark, 1.5)
			for i in 4:  # moss + a mushroom
				mp.draw_circle(Vector2(rng.randf_range(-w * 0.4, w * 0.3), -38 * s), rng.randf_range(6, 10) * s, th.top)
			Art.shape(mp, Art.ellipse(Vector2(-w * 0.2, -46 * s), 10 * s, 6 * s, 10), th.accent, o, 1.5)
		Kind.STUMP:
			var bark := th.ledge_dark.darkened(0.1)
			Art.shape(mp, PackedVector2Array([Vector2(-40, 0) * s, Vector2(-30, -10) * s, Vector2(-26, -60) * s, Vector2(26, -60) * s, Vector2(30, -10) * s, Vector2(42, 0) * s]), bark, o, 3.0)
			Art.shape(mp, Art.ellipse(Vector2(0, -60) * s, 26 * s, 9 * s, 16), th.ledge.lightened(0.2), o, 2.5)
			for r in [18.0, 11.0, 5.0]:
				mp.draw_arc(Vector2(0, -60) * s, r * s, 0, TAU, 14, th.ledge_dark, 1.5)
			mp.draw_line(Vector2(-14, -50) * s, Vector2(-16, -12) * s, bark.darkened(0.25), 2.5)
			mp.draw_line(Vector2(10, -48) * s, Vector2(14, -8) * s, bark.darkened(0.25), 2.5)
		Kind.GIANT_MUSHROOM:
			var stem := Color("f1e4c8")
			Art.shape(mp, PackedVector2Array([Vector2(-18, 0) * s, Vector2(-12, -120) * s, Vector2(12, -120) * s, Vector2(20, 0) * s]), stem, o, 3.0)
			mp.draw_rect(Rect2(Vector2(-10, -118) * s, Vector2(6, 110) * s), Color(1, 1, 1, 0.3))
			var cap := PackedVector2Array()
			for k in 25:
				var a := PI + PI * k / 24.0
				cap.append(Vector2(cos(a) * 90 * s, -120 * s + sin(a) * 70 * s))
			cap.append(Vector2(70, -110) * s)
			cap.append(Vector2(-70, -110) * s)
			Art.shape(mp, cap, th.accent, o, 3.5)
			mp.draw_colored_polygon(Art.ellipse(Vector2(-30, -160) * s, 30 * s, 14 * s, 14), Color(1, 1, 1, 0.25))
			for sp: Vector3 in [Vector3(-40, -140, 12), Vector3(10, -170, 14), Vector3(50, -135, 10), Vector3(-5, -135, 7)]:
				mp.draw_circle(Vector2(sp.x, sp.y) * s, sp.z * s, Color(1, 1, 1, 0.85))
			for k in 7:  # gills
				mp.draw_line(Vector2(-60 + k * 20, -112) * s, Vector2(-10 + k * 3, -122) * s, th.accent.darkened(0.35), 2.0)
		Kind.HANGING_VINES:
			for i in 5:
				var x := (float(i) - 2.0) * 16.0 * s + rng.randf_range(-5, 5)
				var l := rng.randf_range(60, 150) * s
				var pts := PackedVector2Array()
				for k in 10:
					var t := float(k) / 9.0
					pts.append(Vector2(x + sin(t * 5.0 + i) * 5.0 * s, t * l))
				mp.draw_polyline(pts, th.foliage_dark, 3.5 * s)
				for k in range(1, 10, 2):
					var p := pts[k]
					var side := 1.0 if k % 4 == 1 else -1.0
					Art.shape(mp, PackedVector2Array([p, p + Vector2(side * 12, 4) * s, p + Vector2(side * 4, 10) * s]), th.foliage, o, 1.0)
				if i % 2 == 0:
					mp.draw_circle(pts[9] + Vector2(0, 4 * s), 5.0 * s, th.flower_colors[i % th.flower_colors.size()])
		Kind.LILYPADS:
			for i in 3:
				var cx := (float(i) - 1.0) * 46.0 * s + rng.randf_range(-8, 8)
				var pad := PackedVector2Array()
				for k in 17:
					var a := 0.35 + (TAU - 0.7) * k / 16.0
					pad.append(Vector2(cx, 0) + Vector2(cos(a) * 24 * s, sin(a) * 8 * s))
				pad.append(Vector2(cx, 0))
				Art.shape(mp, pad, th.foliage, o, 2.0)
				if i == 1:
					for k in 6:
						var a := TAU * k / 6.0
						mp.draw_colored_polygon(Art.ellipse(Vector2(cx, -8 * s) + Vector2.from_angle(a) * 6.0 * s, 6 * s, 3 * s, 8), Color("ffc2dc"))
					mp.draw_circle(Vector2(cx, -8 * s), 3.0 * s, Color("ffd23f"))
		Kind.BIG_FLOWER:
			var col: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
			mp.draw_line(Vector2.ZERO, Vector2(6, -110) * s, o, 9.0 * s)
			mp.draw_line(Vector2.ZERO, Vector2(6, -110) * s, th.foliage_dark, 6.0 * s)
			for side: float in [-1.0, 1.0]:
				Art.shape(mp, PackedVector2Array([Vector2(3, -40) * s, Vector2(side * 36, -60) * s, Vector2(side * 30, -44) * s]), th.foliage, o, 2.0)
			var head := Vector2(6, -118) * s
			for k in 8:
				var a := TAU * k / 8.0
				Art.shape(mp, Art.ellipse(head + Vector2.from_angle(a) * 20.0 * s, 13 * s, 13 * s, 12), col, o, 2.0)
			Art.shape(mp, Art.ellipse(head, 14 * s, 14 * s, 14), Color("ffd23f"), o, 2.0)
			for k in 5:
				mp.draw_circle(head + Vector2(rng.randf_range(-7, 7), rng.randf_range(-7, 7)) * s, 1.8 * s, Color("c98a1a"))
		Kind.ROOTS:
			for i in 4:
				var pts := PackedVector2Array()
				var p := Vector2((float(i) - 1.5) * 26.0 * s, 0)
				var a := PI * 0.5 + rng.randf_range(-0.4, 0.4)
				for k in 7:
					pts.append(p)
					a += rng.randf_range(-0.35, 0.35)
					p += Vector2.from_angle(a) * 14.0 * s
				mp.draw_polyline(pts, o, 7.0 * s)
				mp.draw_polyline(pts, th.ledge_dark, 4.5 * s)
