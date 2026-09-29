@tool
class_name Block
extends StaticBody2D
## Level geometry. Drop one in, set `size` in the Inspector.
## Origin is the TOP-LEFT corner. `one_way` = jump up through it (drawn as a
## wooden ledge). Colours come from the level's LevelTheme; `lip` draws the
## grass / snow / frosting edge on top.

const LIP_HEIGHT := 14.0
const OUTLINE_W := 4.0

@export var size := Vector2(256, 64):
	set(value):
		size = value
		_rebuild()
@export var one_way := false:
	set(value):
		one_way = value
		_rebuild()
@export var lip := true:                    ## grassy top edge
	set(value):
		lip = value
		queue_redraw()
@export var slippery := false:              ## ice: low grip (PlayerTuning.ice_friction)
	set(value):
		slippery = value
		queue_redraw()
@export var conveyor_speed := 0.0:          ## px/s: carries whatever stands on it (+ = right)
	set(value):
		conveyor_speed = value
		constant_linear_velocity = Vector2(value, 0)
		set_process(value != 0.0)
		queue_redraw()
@export var theme_override: LevelTheme:     ## use a different palette for just this block
	set(value):
		theme_override = value
		queue_redraw()


var _belt := 0.0


func _ready() -> void:
	_rebuild()
	constant_linear_velocity = Vector2(conveyor_speed, 0)
	set_process(conveyor_speed != 0.0)


func _process(delta: float) -> void:
	_belt = fmod(_belt + conveyor_speed * delta, 40.0)
	queue_redraw()


func _rebuild() -> void:
	if not is_node_ready():
		return
	var shape := RectangleShape2D.new()
	shape.size = size
	var col: CollisionShape2D = $CollisionShape2D
	col.shape = shape
	col.position = size / 2.0
	col.one_way_collision = one_way
	queue_redraw()


func _theme() -> LevelTheme:
	return theme_override if theme_override else LevelTheme.find(self)


func _draw() -> void:
	var th := _theme()
	if one_way:
		_draw_ledge(th)
	elif slippery:
		_draw_ice(th)
	else:
		_draw_solid(th)
	if conveyor_speed != 0.0:
		_draw_belt(th)


func _draw_solid(th: LevelTheme) -> void:
	draw_ground(self, size, th, lip, hash(Vector2i(global_position)) ^ hash(Vector2i(size)))


## Solid themed ground in a rect of `size` at the origin (Blocks, SecretArea fake walls).
static func draw_ground(ci: CanvasItem, size: Vector2, th: LevelTheme, lip := true, seed_value := 0) -> void:
	var r := Rect2(Vector2.ZERO, size)
	ci.draw_rect(r, th.ground)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var top := LIP_HEIGHT if lip else 0.0
	# Soft darker band along the bottom for depth.
	ci.draw_rect(Rect2(0, size.y - minf(18.0, size.y * 0.3), size.x, minf(18.0, size.y * 0.3)), th.ground_dark)
	match th.pattern:
		1:  # pebbles
			var n := int(size.x * size.y / 2600.0)
			for i in n:
				var p := Vector2(rng.randf_range(8, size.x - 8), rng.randf_range(top + 10, size.y - 8))
				var rr := rng.randf_range(3.0, 7.0)
				ci.draw_colored_polygon(Art.ellipse(p, rr * 1.4, rr, 10), th.ground_dark)
				ci.draw_colored_polygon(Art.ellipse(p + Vector2(-1, -1), rr * 0.6, rr * 0.4, 8), th.ground.lightened(0.15))
		2:  # bricks
			var bh := 26.0
			var row := 0
			var y := top + 4.0
			while y < size.y - 4.0:
				var bw := 52.0
				var x := -bw * 0.5 if row % 2 == 1 else 0.0
				while x < size.x:
					var a := Vector2(maxf(x + 3.0, 3.0), y + 2.0)
					var b := Vector2(minf(x + bw - 3.0, size.x - 3.0), minf(y + bh - 2.0, size.y - 3.0))
					if b.x - a.x > 6.0 and b.y - a.y > 6.0:
						ci.draw_rect(Rect2(a, b - a), th.ground_dark.lerp(th.ground, rng.randf_range(0.2, 0.6)))
					x += bw
				y += bh
				row += 1
		3:  # candy stripes
			var w := 34.0
			var x := -size.y
			var clip := Art.rect(Vector2(2, 2), size - Vector2(2, 2))
			while x < size.x:
				var pts := PackedVector2Array([Vector2(x, size.y), Vector2(x + w * 0.5, size.y), Vector2(x + w * 0.5 + size.y, 0), Vector2(x + size.y, 0)])
				for piece in Geometry2D.intersect_polygons(pts, clip):
					ci.draw_colored_polygon(piece, th.ground_dark)
				x += w
	ci.draw_rect(r, th.outline, false, OUTLINE_W)
	if lip:
		_draw_lip_on(ci, size, th, rng)


## Grass / snow / icing edge with a scalloped underside and tufts.
static func _draw_lip_on(ci: CanvasItem, size: Vector2, th: LevelTheme, rng: RandomNumberGenerator) -> void:
	var pts := PackedVector2Array([Vector2(-4, -2), Vector2(size.x + 4, -2)])
	var bumps := maxi(int(size.x / 22.0), 2)
	var w := (size.x + 8.0) / bumps
	for i in range(bumps, -1, -1):
		var x := -4.0 + i * w
		pts.append(Vector2(x, LIP_HEIGHT + (4.0 if i % 2 == 0 else -1.0)))
	Art.shape(ci, pts, th.top, th.outline, 3.0)
	ci.draw_rect(Rect2(-2, 2, size.x + 4, 4), th.top.lightened(0.2))
	# Tufts poking up.
	var n := int(size.x / 40.0)
	for i in n:
		var x := rng.randf_range(10, size.x - 10)
		var h := rng.randf_range(6, 12)
		ci.draw_colored_polygon(PackedVector2Array([Vector2(x - 5, 0), Vector2(x - 2, -h), Vector2(x, -2), Vector2(x + 3, -h * 0.8), Vector2(x + 5, 0)]), th.top_dark)


func _draw_ledge(th: LevelTheme) -> void:
	var h := size.y
	Art.shape(self, Art.rounded_rect(Vector2(0, 0), Vector2(size.x, h), 5.0), th.ledge, th.outline, 3.0)
	draw_rect(Rect2(3, 2, size.x - 6, minf(5.0, h * 0.3)), th.ledge.lightened(0.25))
	var planks := maxi(int(size.x / 56.0), 1)
	for i in range(1, planks):
		var x := i * size.x / planks
		draw_line(Vector2(x, 3), Vector2(x, h - 2), th.ledge_dark, 2.0)
	# Little support brackets underneath.
	for x: float in [14.0, size.x - 14.0]:
		Art.shape(self, PackedVector2Array([Vector2(x - 6, h), Vector2(x + 6, h), Vector2(x, h + 10)]), th.ledge_dark, th.outline, 2.0)


func _draw_ice(th: LevelTheme) -> void:
	var ice := Color("bfe9ff")
	draw_rect(Rect2(Vector2.ZERO, size), ice)
	draw_rect(Rect2(0, size.y * 0.55, size.x, size.y * 0.45), ice.darkened(0.1))
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(global_position))
	for i in int(size.x / 60.0) + 1:
		var x := rng.randf_range(10, maxf(size.x - 30, 11))
		draw_line(Vector2(x, 8), Vector2(x + 20, 8 + minf(26.0, size.y - 12)), Color(1, 1, 1, 0.7), 3.0)
	draw_rect(Rect2(3, 3, size.x - 6, 5), Color(1, 1, 1, 0.8))
	draw_rect(Rect2(Vector2.ZERO, size), th.outline, false, OUTLINE_W)


func _draw_belt(th: LevelTheme) -> void:
	# Rolling chevrons along the top show which way it carries you.
	var d := signf(conveyor_speed)
	draw_rect(Rect2(0, -2, size.x, 12), Color("3b3548"))
	var x := _belt - 40.0
	while x < size.x:
		if x > 4.0 and x < size.x - 12.0:
			draw_polyline(PackedVector2Array([Vector2(x, 0), Vector2(x + 8 * d, 4), Vector2(x, 8)]), Color("ffd23f"), 3.0)
		x += 40.0
	for cx: float in [8.0, size.x - 8.0]:
		draw_circle(Vector2(cx, 4), 6.0, th.outline)
