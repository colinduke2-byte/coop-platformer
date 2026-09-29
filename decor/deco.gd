@tool
class_name Deco
extends Node2D
## Non-colliding scenery. Pick a `kind`, place its origin on the ground.
## Colours follow the level theme. Put in front of the action (foreground)
## with `front = true` for a bit of depth - keep those sparse.

enum Kind { GRASS, FLOWERS, BUSH, TREE, PINE, MUSHROOMS, ROCK, FENCE, CRYSTALS, CANDY_CANE, LOLLIPOP, REEDS }

@export var kind := Kind.FLOWERS:
	set(v):
		kind = v
		queue_redraw()
@export var size := 1.0:
	set(v):
		size = v
		queue_redraw()
@export var seed_value := 0:
	set(v):
		seed_value = v
		queue_redraw()
@export var front := false:                 ## draw in front of players
	set(v):
		front = v
		z_index = 20 if v else -10
@export var sway := true                    ## gentle wind animation

var _t := 0.0


func _ready() -> void:
	z_index = 20 if front else -10
	_t = float(hash(global_position) % 1000) * 0.01


func _process(delta: float) -> void:
	if sway and kind in [Kind.GRASS, Kind.FLOWERS, Kind.REEDS, Kind.TREE, Kind.PINE, Kind.BUSH]:
		_t += delta
		queue_redraw()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value + hash(Vector2i(position))
	var s := size
	var wind := sin(_t * 1.7) * 0.06
	match kind:
		Kind.GRASS, Kind.REEDS:
			var tall := 2.2 if kind == Kind.REEDS else 1.0
			for i in 7:
				var x := (float(i) - 3.0) * 7.0 * s + rng.randf_range(-3, 3)
				var h := rng.randf_range(18, 34) * s * tall
				var tip := Vector2(x + h * (wind + rng.randf_range(-0.2, 0.2)), -h)
				draw_colored_polygon(PackedVector2Array([Vector2(x - 4 * s, 0), tip, Vector2(x + 4 * s, 0)]),
						th.foliage if i % 2 == 0 else th.foliage_dark)
				if kind == Kind.REEDS and i % 3 == 0:
					Art.shape(self, Art.ellipse(tip + Vector2(0, 8 * s), 4 * s, 10 * s, 10), th.ground_dark, o, 1.5)
		Kind.FLOWERS:
			for i in 5:
				var x := (float(i) - 2.0) * 14.0 * s + rng.randf_range(-4, 4)
				var h := rng.randf_range(20, 40) * s
				var tip := Vector2(x + h * wind * (1.0 + i * 0.2), -h)
				draw_line(Vector2(x, 0), tip, th.foliage_dark, 3.0 * s)
				Art.shape(self, Art.ellipse(Vector2(x + 6 * s, -h * 0.4), 6 * s, 3 * s, 8), th.foliage, o, 1.5)
				var c: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
				for k in 5:
					var a := TAU * k / 5.0
					Art.shape(self, Art.ellipse(tip + Vector2.from_angle(a) * 6.5 * s, 5 * s, 5 * s, 8), c, o, 1.5)
				draw_circle(tip, 4.0 * s, Color("ffd23f"))
		Kind.BUSH:
			var blobs := [Vector3(0, -28, 30), Vector3(-30, -18, 22), Vector3(30, -18, 24), Vector3(-12, -40, 20), Vector3(16, -42, 22)]
			for b: Vector3 in blobs:
				Art.shape(self, Art.ellipse(Vector2(b.x + wind * 30.0 * (-b.y / 40.0), b.y) * s, b.z * s, b.z * s * 0.85, 16), th.foliage, o, 3.0)
			for b: Vector3 in blobs:
				draw_colored_polygon(Art.ellipse(Vector2(b.x - 6, b.y - 6) * s, b.z * 0.5 * s, b.z * 0.35 * s, 12), th.foliage.lightened(0.15))
			for i in 3:
				var c: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
				draw_circle(Vector2(rng.randf_range(-30, 30), rng.randf_range(-45, -12)) * s, 4.0 * s, c)
		Kind.TREE:
			var lean := wind * 60.0
			Art.shape(self, PackedVector2Array([Vector2(-12, 0) * s, Vector2(-8, -110) * s, Vector2(8, -110) * s, Vector2(14, 0) * s]), th.ledge_dark, o, 3.0)
			for b: Vector3 in [Vector3(0, -150, 56), Vector3(-44, -118, 40), Vector3(46, -120, 42), Vector3(-18, -178, 36), Vector3(24, -176, 38)]:
				Art.shape(self, Art.ellipse(Vector2(b.x + lean * (-b.y / 150.0), b.y) * s, b.z * s, b.z * 0.85 * s, 18), th.foliage, o, 3.0)
			draw_colored_polygon(Art.ellipse(Vector2(-10 + lean, -165) * s, 26 * s, 16 * s, 14), th.foliage.lightened(0.15))
			for i in 4:
				var c: Color = th.flower_colors[rng.randi() % th.flower_colors.size()]
				draw_circle(Vector2(rng.randf_range(-60, 60) + lean, rng.randf_range(-190, -110)) * s, 5.0 * s, c)
		Kind.PINE:
			Art.shape(self, Art.rect(Vector2(-8, -30) * s, Vector2(8, 0) * s), th.ledge_dark, o, 3.0)
			for i in 3:
				var y := (-30.0 - i * 45.0) * s
				var w := (60.0 - i * 14.0) * s
				var tip := Vector2(wind * 40.0 * (i + 1), y - 70.0 * s)
				Art.shape(self, PackedVector2Array([Vector2(-w, y), tip, Vector2(w, y)]), th.foliage_dark, o, 3.0)
				draw_colored_polygon(PackedVector2Array([Vector2(-w * 0.6, y - 14 * s), tip + Vector2(0, 8 * s), Vector2(w * 0.3, y - 26 * s)]), th.top)
		Kind.MUSHROOMS:
			for i in 3:
				var x := (float(i) - 1.0) * 18.0 * s
				var h := (14.0 + i % 2 * 12.0) * s
				Art.shape(self, Art.rect(Vector2(x - 4 * s, -h), Vector2(x + 4 * s, 0)), Color("fff4e0"), o, 2.0)
				var cap := PackedVector2Array()
				for k in 11:
					var a := PI + PI * k / 10.0
					cap.append(Vector2(x + cos(a) * 13 * s, -h + sin(a) * 11 * s))
				Art.shape(self, cap, th.accent, o, 2.0)
				draw_circle(Vector2(x - 4 * s, -h - 5 * s), 2.5 * s, Color.WHITE)
		Kind.ROCK:
			var pts := PackedVector2Array()
			for k in 8:
				var a := PI + PI * k / 7.0
				pts.append(Vector2(cos(a) * 40 * s * rng.randf_range(0.8, 1.1), sin(a) * 30 * s * rng.randf_range(0.8, 1.1)))
			Art.shape(self, pts, th.ground.lerp(Color("a8a8b8"), 0.5), o, 3.0)
			draw_colored_polygon(Art.ellipse(Vector2(-10, -18) * s, 12 * s, 6 * s, 10), Color(1, 1, 1, 0.3))
		Kind.FENCE:
			for i in 4:
				var x := (float(i) - 1.5) * 34.0 * s
				Art.shape(self, PackedVector2Array([Vector2(x - 6 * s, 0), Vector2(x - 6 * s, -44 * s), Vector2(x, -52 * s), Vector2(x + 6 * s, -44 * s), Vector2(x + 6 * s, 0)]), th.ledge, o, 2.5)
			for y: float in [-36.0, -16.0]:
				Art.shape(self, Art.rect(Vector2(-62, y - 4) * s, Vector2(62, y + 4) * s), th.ledge_dark, o, 2.0)
		Kind.CRYSTALS:
			for i in 4:
				var x := (float(i) - 1.5) * 16.0 * s
				var h := rng.randf_range(30, 70) * s
				var a := rng.randf_range(-0.3, 0.3)
				var pts := PackedVector2Array([Vector2(-8, 0), Vector2(-8, -h * 0.8), Vector2(0, -h), Vector2(8, -h * 0.8), Vector2(8, 0)])
				for k in pts.size():
					pts[k] = pts[k].rotated(a) * Vector2(s, 1.0) + Vector2(x, 0)
				Art.shape(self, pts, th.accent.lightened(0.3), o, 2.5)
				draw_line(pts[1].lerp(pts[2], 0.3), pts[0].lerp(pts[1], 0.4), Color(1, 1, 1, 0.6), 2.0)
		Kind.CANDY_CANE:
			var pts := PackedVector2Array()
			for i in 12:
				pts.append(Vector2(0, -i * 10.0) * s)
			for i in 9:
				var a := PI - PI * i / 8.0
				pts.append((Vector2(18, -120) + Vector2(cos(a), -sin(a)) * 18.0) * s)
			draw_polyline(pts, o, 20.0 * s)
			draw_polyline(pts, Color.WHITE, 14.0 * s)
			for i in range(0, pts.size() - 1, 2):
				draw_line(pts[i], pts[i + 1], th.accent, 14.0 * s)
		Kind.LOLLIPOP:
			draw_line(Vector2.ZERO, Vector2(0, -90) * s, o, 9.0 * s)
			draw_line(Vector2.ZERO, Vector2(0, -90) * s, Color.WHITE, 5.0 * s)
			var c := Vector2(0, -120) * s
			Art.shape(self, Art.ellipse(c, 34 * s, 34 * s, 24), th.accent, o, 3.0)
			var sp := PackedVector2Array()
			for i in 40:
				var a := i * 0.5
				sp.append(c + Vector2.from_angle(a + _t) * (i * 0.8) * s)
			draw_polyline(sp, Color.WHITE, 5.0 * s)
