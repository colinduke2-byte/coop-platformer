@tool
class_name Deco
extends Node2D
## Non-colliding scenery. Pick a `kind`, place its origin on the ground
## (HANGING_VINES / ROOTS: on a ceiling). Colours follow the level theme. Put in
## front of the action (foreground) with `front = true` for depth - sparingly.
## Drawn ONCE into a mesh; the breeze is a shear (skew), so hundreds are cheap.

enum Kind { GRASS, FLOWERS, BUSH, TREE, PINE, MUSHROOMS, ROCK, FENCE, CRYSTALS, CANDY_CANE, LOLLIPOP, REEDS,
		FERN, LOG, STUMP, GIANT_MUSHROOM, HANGING_VINES, LILYPADS, BIG_FLOWER, ROOTS, HUT, LANTERN,
		SNOWMAN, ICICLES, IGLOO, SKIS, PALM, BIG_LEAF, TOTEM, BROMELIAD, GEAR, PIPES, CLOCK, TOYBLOCKS,
		CORAL, SEAWEED, SHELL, ANCHOR, STARFISH, CHEST }

const SWAYERS := [Kind.GRASS, Kind.FLOWERS, Kind.REEDS, Kind.TREE, Kind.PINE, Kind.BUSH, Kind.FERN,
		Kind.HANGING_VINES, Kind.BIG_FLOWER, Kind.PALM, Kind.BIG_LEAF, Kind.BROMELIAD, Kind.SEAWEED]

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
		var amount := 0.05 if kind in [Kind.TREE, Kind.PINE, Kind.BUSH, Kind.PALM] else 0.12
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
		Kind.HUT:
			var wall := th.ledge.lightened(0.15)
			var roof := th.accent
			Art.shape(mp, Art.rect(Vector2(-60, -100) * s, Vector2(60, 0)), wall, o, 3.0)
			for i in 5:  # plank lines
				mp.draw_line(Vector2(-58, -18 - i * 18) * s, Vector2(58, -18 - i * 18) * s, th.ledge_dark, 1.5)
			Art.shape(mp, PackedVector2Array([Vector2(-80, -94) * s, Vector2(0, -170) * s, Vector2(80, -94) * s]), roof, o, 3.0)
			mp.draw_line(Vector2(-70, -100) * s, Vector2(0, -164) * s, roof.lightened(0.25), 3.0)
			Art.shape(mp, Art.rounded_rect(Vector2(-16, -60) * s, Vector2(16, 0), 12.0 * s), th.ledge_dark.darkened(0.3), o, 2.5)
			mp.draw_circle(Vector2(8, -30) * s, 3.0 * s, th.accent)
			Art.shape(mp, Art.rect(Vector2(26, -76) * s, Vector2(48, -54) * s), Color(1.0, 0.88, 0.5), o, 2.0)
			mp.draw_line(Vector2(37, -76) * s, Vector2(37, -54) * s, o, 2.0)
			mp.draw_line(Vector2(26, -65) * s, Vector2(48, -65) * s, o, 2.0)
			Art.shape(mp, Art.rect(Vector2(20, -150) * s, Vector2(34, -120) * s), th.ground.lightened(0.1), o, 2.0)  # chimney
		Kind.LANTERN:
			mp.draw_line(Vector2.ZERO, Vector2(0, -90) * s, o, 5.0 * s)
			mp.draw_line(Vector2(0, -90) * s, Vector2(18, -90) * s, o, 4.0 * s)
			mp.draw_line(Vector2(18, -90) * s, Vector2(18, -78) * s, o, 2.0)
			mp.draw_circle(Vector2(18, -64) * s, 26.0 * s, Color(1.0, 0.85, 0.4, 0.18))
			Art.shape(mp, Art.rounded_rect(Vector2(8, -78) * s, Vector2(28, -52) * s, 5.0 * s), Color(1.0, 0.86, 0.45), o, 2.0)
			mp.draw_rect(Rect2(Vector2(6, -80) * s, Vector2(24, 4) * s), th.ledge_dark)
		Kind.SNOWMAN:
			var snow := Color("f4fbff")
			var shade := Color("c7dcef")
			for b: Vector3 in [Vector3(0, -34, 36), Vector3(0, -92, 27), Vector3(0, -136, 20)]:
				Art.shape(mp, Art.ellipse(Vector2(b.x, b.y) * s, b.z * s, b.z * 0.95 * s, 18), snow, o, 3.0)
				mp.draw_colored_polygon(Art.ellipse(Vector2(b.z * 0.25, b.y + b.z * 0.25) * s, b.z * 0.6 * s, b.z * 0.5 * s, 14), shade)
			# Coal eyes and buttons, carrot nose, stick arms, a scarf and a bucket hat.
			for e: Vector2 in [Vector2(-7, -142), Vector2(7, -142), Vector2(0, -98), Vector2(0, -84), Vector2(0, -44)]:
				mp.draw_circle(e * s, 3.0 * s, o)
			Art.shape(mp, PackedVector2Array([Vector2(0, -136) * s, Vector2(26, -132) * s, Vector2(0, -130) * s]), Color("ff8f3f"), o, 1.5)
			for d: float in [-1.0, 1.0]:
				mp.draw_polyline(PackedVector2Array([Vector2(d * 22, -100) * s, Vector2(d * 50, -118) * s, Vector2(d * 60, -130) * s]),
						th.ledge_dark.darkened(0.2), 4.0 * s)
			Art.shape(mp, Art.rounded_rect(Vector2(-24, -122) * s, Vector2(24, -112) * s, 4.0 * s), th.accent, o, 2.0)
			Art.shape(mp, Art.rect(Vector2(10, -118) * s, Vector2(22, -92) * s), th.accent, o, 2.0)
			Art.shape(mp, PackedVector2Array([Vector2(-16, -152) * s, Vector2(16, -152) * s, Vector2(12, -176) * s, Vector2(-12, -176) * s]),
					Color("5d6b82"), o, 2.5)
		Kind.ICICLES:
			# Hangs from a ceiling (origin on the ceiling).
			var ice := Color("bfe9ff")
			for i in 6:
				var x := (float(i) - 2.5) * 16.0 * s + rng.randf_range(-3, 3)
				var h := rng.randf_range(24, 70) * s
				Art.shape(mp, PackedVector2Array([Vector2(x - 7 * s, 0), Vector2(x + 7 * s, 0), Vector2(x, h)]), ice, o, 2.0)
				mp.draw_line(Vector2(x - 2 * s, 4 * s), Vector2(x - 1 * s, h * 0.6), Color(1, 1, 1, 0.8), 2.0)
		Kind.IGLOO:
			var snow := Color("f4fbff")
			var dome := PackedVector2Array()
			for i in 25:
				var a := PI + i * PI / 24.0
				dome.append(Vector2(cos(a) * 110.0, sin(a) * 90.0) * s)
			Art.shape(mp, dome, snow, o, 3.0)
			for r in 3:  # block rows
				var y := -22.0 - r * 26.0
				var half := sqrt(maxf(1.0 - pow(y / 90.0, 2.0), 0.0)) * 110.0
				mp.draw_line(Vector2(-half, y) * s, Vector2(half, y) * s, Color("c7dcef"), 2.5)
				var k := -half + (18.0 if r % 2 == 1 else 0.0)
				while k < half:
					mp.draw_line(Vector2(k, y) * s, Vector2(k, y + 26.0) * s, Color("c7dcef"), 2.0)
					k += 36.0
			var door := PackedVector2Array()
			for i in 13:
				var a := PI + i * PI / 12.0
				door.append(Vector2(-10 + cos(a) * 32.0, sin(a) * 44.0) * s)
			Art.shape(mp, door, Color("24324d"), o, 3.0)
		Kind.SKIS:
			for d: float in [-1.0, 1.0]:
				var base := Vector2(d * 10, 0) * s
				Art.shape(mp, PackedVector2Array([base + Vector2(-5, 0) * s, base + Vector2(5, 0) * s, base + Vector2(8 + d * 6, -120) * s,
						base + Vector2(-2 + d * 6, -126) * s]), th.accent if d < 0 else Color("5bc8ff"), o, 2.5)
			mp.draw_line(Vector2(-26, -10) * s, Vector2(-40, -100) * s, o, 3.0 * s)
			mp.draw_line(Vector2(30, -10) * s, Vector2(42, -96) * s, o, 3.0 * s)

		Kind.PALM:
			# A leaning palm: segmented trunk, a crown of drooping fronds, coconuts.
			var lean := rng.randf_range(-0.25, 0.25)
			var top := Vector2(lean * 160.0, -230.0) * s
			var seg := 9
			for i in seg:
				var a := Vector2(lean * 160.0 * pow(float(i) / seg, 1.6), -230.0 * i / seg) * s
				var b := Vector2(lean * 160.0 * pow(float(i + 1) / seg, 1.6), -230.0 * (i + 1) / seg) * s
				var w := lerpf(15.0, 9.0, float(i) / seg) * s
				var n := (b - a).normalized().orthogonal() * w
				Art.shape(mp, PackedVector2Array([a - n, a + n, b + n * 0.9, b - n * 0.9]), th.ledge if i % 2 == 0 else th.ledge_dark, o, 2.0)
			for k in 7:
				var ang := -PI * 0.5 + (float(k) - 3.0) * 0.55
				var tip := top + Vector2(cos(ang) * 120.0, sin(ang) * 40.0 + 46.0 + absf(float(k) - 3.0) * 12.0) * s
				var mid := top.lerp(tip, 0.5) + Vector2(0, -30.0) * s
				var nrm := (tip - top).normalized().orthogonal() * 16.0 * s
				Art.shape(mp, PackedVector2Array([top, mid + nrm, tip, mid - nrm * 0.4]), th.foliage if k % 2 == 0 else th.foliage_dark, o, 2.0)
			for k in 3:
				Art.shape(mp, Art.ellipse(top + Vector2(-12 + k * 12, 12) * s, 8 * s, 9 * s, 10), th.ground_dark, o, 1.5)
		Kind.BIG_LEAF:
			# Monstera-style giant leaves on stems, fanning out from the ground.
			for k in 4:
				var ang := -PI * 0.5 + (float(k) - 1.5) * 0.5 + rng.randf_range(-0.1, 0.1)
				var ln := rng.randf_range(70, 110) * s
				var tip := Vector2(cos(ang), sin(ang)) * ln
				mp.draw_line(Vector2.ZERO, tip * 0.55, th.foliage_dark, 4.0 * s)
				var c := tip * 0.8
				var leaf := Art.ellipse(c, 38 * s, 26 * s, 18)
				var rot := PackedVector2Array()
				for p in leaf:
					rot.append(c + (p - c).rotated(ang + PI * 0.5))
				Art.shape(mp, rot, th.foliage if k % 2 == 0 else th.foliage.darkened(0.08), o, 2.0)
				mp.draw_line(tip * 0.55, tip * 1.05, th.foliage_dark, 2.0)
				for h in 2:  # the monstera's holes
					var hp := c + Vector2(cos(ang + PI * 0.5), sin(ang + PI * 0.5)) * (10.0 - h * 20.0) * s
					mp.draw_colored_polygon(Art.ellipse(hp, 4 * s, 7 * s, 8), th.foliage_dark)
		Kind.TOTEM:
			# A mossy carved stone head from the old jungle temple.
			var stone := th.ledge.lerp(Color("8c8a7a"), 0.5)
			Art.shape(mp, Art.rounded_rect(Vector2(-34, -120) * s, Vector2(34, 0), 10.0 * s), stone, o, 3.0)
			Art.shape(mp, Art.rect(Vector2(-42, -132) * s, Vector2(42, -112) * s), stone.darkened(0.1), o, 3.0)
			for d: float in [-1.0, 1.0]:
				Art.shape(mp, Art.rect(Vector2(d * 18 - 9, -92) * s, Vector2(d * 18 + 9, -80) * s), th.outline, o, 1.5)
			Art.shape(mp, Art.rect(Vector2(-6, -78) * s, Vector2(6, -54) * s), stone.darkened(0.12), o, 2.0)
			Art.shape(mp, Art.rect(Vector2(-20, -44) * s, Vector2(20, -32) * s), th.outline, o, 1.5)
			mp.draw_colored_polygon(Art.ellipse(Vector2(-14, -128) * s, 26 * s, 9 * s, 12), th.top)
			mp.draw_colored_polygon(Art.ellipse(Vector2(20, -10) * s, 20 * s, 8 * s, 12), th.top_dark)
			mp.draw_circle(Vector2(18, -86) * s, 3.0 * s, th.accent)
		Kind.BROMELIAD:
			# A spiky rosette with a bright flower spike in the middle.
			for k in 7:
				var ang := -PI * 0.5 + (float(k) - 3.0) * 0.42
				var tip := Vector2(cos(ang), sin(ang)) * rng.randf_range(30, 46) * s
				var n := tip.normalized().orthogonal() * 6.0 * s
				Art.shape(mp, PackedVector2Array([-n, tip, n]), th.foliage if k % 2 == 0 else th.foliage_dark, o, 1.5)
			var fc: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
			Art.shape(mp, PackedVector2Array([Vector2(-8, -10) * s, Vector2(0, -52) * s, Vector2(8, -10) * s]), fc, o, 2.0)
			mp.draw_circle(Vector2(0, -50) * s, 4.0 * s, Color("ffd23f"))
		Kind.CORAL:
			# A branching coral fan in the theme's flower colours.
			var cc: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
			var branches := [[Vector2(0, 0), Vector2(0, -70)], [Vector2(0, -30), Vector2(-30, -78)], [Vector2(0, -42), Vector2(28, -92)],
					[Vector2(-16, -56), Vector2(-40, -60)], [Vector2(14, -66), Vector2(36, -64)], [Vector2(0, -70), Vector2(-8, -104)]]
			for b in branches:
				mp.draw_line(b[0] * s, b[1] * s, o, 13.0 * s)
			for b in branches:
				mp.draw_line(b[0] * s, b[1] * s, cc, 9.0 * s)
				mp.draw_circle(b[1] * s, 6.0 * s, cc.lightened(0.2))
			for k in 6:
				mp.draw_circle(Vector2(rng.randf_range(-30, 30), rng.randf_range(-90, -20)) * s, 2.0 * s, cc.lightened(0.45))
		Kind.SEAWEED:
			# Tall wavy fronds (they sway).
			for k in 3:
				var x0 := (float(k) - 1.0) * 14.0 * s
				var h := rng.randf_range(90, 150) * s
				var pts := PackedVector2Array()
				for i in 10:
					var t := float(i) / 9.0
					pts.append(Vector2(x0 + sin(t * 7.0 + k) * 8.0 * s, -h * t))
				mp.draw_polyline(pts, o, 10.0 * s)
				mp.draw_polyline(pts, th.foliage if k % 2 == 0 else th.foliage_dark, 7.0 * s)
		Kind.SHELL:
			# A scallop shell lying in the sand.
			var sc: Color = th.flower_colors[rng.randi() % th.flower_colors.size()].lerp(Color.WHITE, 0.4)
			var fan := PackedVector2Array([Vector2(0, -4) * s])
			for i in 13:
				var a := PI + PI * float(i) / 12.0
				var r := (26.0 if i % 2 == 0 else 23.0) * s
				fan.append(Vector2(cos(a) * r, -6 * s + sin(a) * r * 0.9))
			Art.shape(mp, fan, sc, o, 2.5)
			for i in 5:
				var a := PI + PI * (float(i) + 1.0) / 6.0
				mp.draw_line(Vector2(0, -4) * s, Vector2(cos(a), sin(a) * 0.9) * 20.0 * s + Vector2(0, -6) * s, sc.darkened(0.2), 1.5)
			Art.shape(mp, Art.rect(Vector2(-7, -6) * s, Vector2(7, 0)), sc.darkened(0.15), o, 2.0)
		Kind.ANCHOR:
			# An old anchor half buried, with a bit of chain.
			var iron := th.ground_dark.lerp(Color("5a6070"), 0.6)
			mp.draw_line(Vector2(0, -6) * s, Vector2(0, -110) * s, o, 14.0 * s)
			mp.draw_line(Vector2(0, -6) * s, Vector2(0, -110) * s, iron, 9.0 * s)
			mp.draw_line(Vector2(-26, -92) * s, Vector2(26, -92) * s, o, 12.0 * s)
			mp.draw_line(Vector2(-26, -92) * s, Vector2(26, -92) * s, iron, 7.0 * s)
			mp.draw_arc(Vector2(0, -36) * s, 36.0 * s, 0.15, PI - 0.15, 16, o, 14.0 * s)
			mp.draw_arc(Vector2(0, -36) * s, 36.0 * s, 0.15, PI - 0.15, 16, iron, 9.0 * s)
			mp.draw_arc(Vector2(0, -122) * s, 11.0 * s, 0, TAU, 14, o, 8.0 * s)
			mp.draw_arc(Vector2(0, -122) * s, 11.0 * s, 0, TAU, 14, iron, 4.0 * s)
			mp.draw_colored_polygon(Art.ellipse(Vector2(0, -2) * s, 40 * s, 8 * s, 14), th.top)
		Kind.STARFISH:
			var sf: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
			var star := PackedVector2Array()
			for i in 10:
				var a := -PI * 0.5 + TAU * float(i) / 10.0
				var r := (20.0 if i % 2 == 0 else 8.0) * s
				star.append(Vector2(cos(a), sin(a)) * r + Vector2(0, -14) * s)
			Art.shape(mp, star, sf, o, 2.0)
			for i in 5:
				var a := -PI * 0.5 + TAU * float(i) / 5.0
				mp.draw_circle(Vector2(cos(a), sin(a)) * 9.0 * s + Vector2(0, -14) * s, 1.8 * s, sf.lightened(0.4))
		Kind.CHEST:
			# A treasure chest spilling Lum-gold coins.
			var wood := th.ledge
			Art.shape(mp, Art.rounded_rect(Vector2(-36, -44) * s, Vector2(36, 0), 4.0 * s), wood, o, 3.0)
			Art.shape(mp, Art.rounded_rect(Vector2(-38, -64) * s, Vector2(38, -40) * s, 10.0 * s), wood.darkened(0.12), o, 3.0)
			for x: float in [-24.0, 24.0]:
				Art.shape(mp, Art.rect(Vector2(x - 4, -64) * s, Vector2(x + 4, 0)), Color("e8c04a"), o, 1.5)
			Art.shape(mp, Art.rect(Vector2(-7, -48) * s, Vector2(7, -34) * s), Color("e8c04a"), o, 2.0)
			for k in 7:
				mp.draw_circle(Vector2(rng.randf_range(-44, 44), rng.randf_range(-6, 0)) * s, 5.0 * s, Color("ffd23f"))
		Kind.GEAR:
			# A big brass cog half-sunk in the ground (scenery).
			var c := Vector2(0, -40) * s
			var brass := th.top
			var teeth := PackedVector2Array()
			for i in 48:
				var a := TAU * i / 48.0
				var r := (52.0 if (i / 3) % 2 == 0 else 42.0) * s
				teeth.append(c + Vector2(cos(a), sin(a)) * r)
			Art.shape(mp, teeth, brass, o, 3.0)
			Art.shape(mp, Art.ellipse(c, 30 * s, 30 * s, 20), brass.darkened(0.15), o, 2.5)
			for k in 4:
				var a := TAU * k / 4.0 + 0.4
				mp.draw_colored_polygon(Art.ellipse(c + Vector2(cos(a), sin(a)) * 18.0 * s, 6 * s, 6 * s, 10), brass.darkened(0.3))
			Art.shape(mp, Art.ellipse(c, 9 * s, 9 * s, 12), th.ledge_dark, o, 2.0)
		Kind.PIPES:
			# Two copper pipes with a valve wheel and a pressure gauge.
			var copper := th.ledge
			for k in 2:
				var x := (-14.0 + k * 28.0) * s
				var h := (110.0 + k * 40.0) * s
				Art.shape(mp, Art.rect(Vector2(x - 9 * s, -h), Vector2(x + 9 * s, 0)), copper.darkened(k * 0.08), o, 2.5)
				Art.shape(mp, Art.rect(Vector2(x - 12 * s, -h - 8 * s), Vector2(x + 12 * s, -h + 4 * s)), copper.darkened(0.2), o, 2.0)
				mp.draw_line(Vector2(x - 4 * s, -h + 8 * s), Vector2(x - 4 * s, -6 * s), copper.lightened(0.25), 2.0)
			var v := Vector2(-14, -70) * s
			mp.draw_arc(v, 13.0 * s, 0, TAU, 16, th.accent, 3.0)
			for k in 3:
				var a := TAU * k / 3.0
				mp.draw_line(v, v + Vector2(cos(a), sin(a)) * 13.0 * s, th.accent, 2.5)
			Art.shape(mp, Art.ellipse(Vector2(14, -120) * s, 12 * s, 12 * s, 14), Color("fff8ec"), o, 2.0)
			mp.draw_line(Vector2(14, -120) * s, Vector2(20, -127) * s, Color("e8452e"), 2.0)
		Kind.CLOCK:
			# A clock on a post (its hands are painted at ten to two).
			mp.draw_line(Vector2.ZERO, Vector2(0, -90) * s, o, 6.0 * s)
			mp.draw_line(Vector2.ZERO, Vector2(0, -90) * s, th.ledge_dark, 4.0 * s)
			var c := Vector2(0, -116) * s
			Art.shape(mp, Art.ellipse(c, 30 * s, 30 * s, 24), th.top, o, 3.0)
			Art.shape(mp, Art.ellipse(c, 24 * s, 24 * s, 24), Color("fff8ec"), o, 2.0)
			for k in 12:
				var a := TAU * k / 12.0
				mp.draw_line(c + Vector2(cos(a), sin(a)) * 19.0 * s, c + Vector2(cos(a), sin(a)) * 22.0 * s, o, 2.0)
			mp.draw_line(c, c + Vector2(-10, -9) * s, o, 3.0)
			mp.draw_line(c, c + Vector2(13, -10) * s, o, 2.0)
		Kind.TOYBLOCKS:
			# A wobbly stack of lettered toy blocks.
			var cols := [Color("ff5d8f"), Color("ffd23f"), Color("5bc8ff"), Color("7ee05a")]
			var pos := [Vector2(-24, -28), Vector2(8, -28), Vector2(-8, -60)]
			for k in 3:
				var p: Vector2 = pos[k] * s
				var col: Color = cols[(k + rng.randi()) % 4]
				Art.shape(mp, Art.rounded_rect(p + Vector2(-15, -14) * s, p + Vector2(15, 16) * s, 4.0 * s), col, o, 2.5)
				Art.shape(mp, Art.rounded_rect(p + Vector2(-8, -7) * s, p + Vector2(8, 9) * s, 3.0 * s), col.lightened(0.3), o, 1.5)
