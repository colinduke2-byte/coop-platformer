@tool
class_name Slope
extends StaticBody2D
## Triangular ramp. Origin = bottom-left corner; `size` = width x height.
## `rising_right` = the high side is on the right. Keep height <= width
## (45 degrees max) so players can walk up it. Belly slides speed up downhill!
## Line it up with Blocks: its bottom sits on the Block top it continues from.

const LIP := 14.0

@export var size := Vector2(256, 128):
	set(v):
		size = v
		_rebuild()
@export var rising_right := true:
	set(v):
		rising_right = v
		_rebuild()
@export var fill_below := 0.0:              ## extra solid depth under the ramp (px)
	set(v):
		fill_below = v
		_rebuild()

var _col: CollisionPolygon2D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	_rebuild()


func points() -> PackedVector2Array:
	var base := fill_below
	if rising_right:
		return PackedVector2Array([Vector2(0, base), Vector2(0, 0), Vector2(size.x, -size.y), Vector2(size.x, base)])
	return PackedVector2Array([Vector2(0, base), Vector2(0, -size.y), Vector2(size.x, 0), Vector2(size.x, base)])


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionPolygon2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var pts := points()
	if fill_below <= 0.0:
		pts = PackedVector2Array([Vector2(0, 0), Vector2(size.x, 0), Vector2(size.x, -size.y) if rising_right else Vector2(0, -size.y)])
	_col.polygon = pts
	queue_redraw()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var pts := points()
	if fill_below <= 0.0:
		pts = PackedVector2Array([Vector2(0, 0), Vector2(0, -size.y) if not rising_right else Vector2(0, 0), Vector2(size.x, -size.y) if rising_right else Vector2(size.x, 0), Vector2(size.x, 0)])
	draw_colored_polygon(pts, th.ground)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(global_position))
	for i in int(size.x * size.y / 5000.0):
		var x := rng.randf_range(10, size.x - 10)
		var top := -size.y * (x / size.x if rising_right else 1.0 - x / size.x)
		var y := rng.randf_range(top + 18.0, fill_below - 6.0) if top + 24.0 < fill_below - 6.0 else 99999.0
		if y < 9999.0 and Geometry2D.is_point_in_polygon(Vector2(x, y), pts):
			draw_colored_polygon(Art.ellipse(Vector2(x, y), rng.randf_range(4, 7) * 1.4, rng.randf_range(3, 5), 10), th.ground_dark)
	var closed := pts.duplicate()
	closed.append(pts[0])
	draw_polyline(closed, th.outline, 4.0)
	# Grass along the sloped edge.
	var a := Vector2(0, 0) if rising_right else Vector2(0, -size.y)
	var b := Vector2(size.x, -size.y) if rising_right else Vector2(size.x, 0)
	var n := (b - a).orthogonal().normalized()
	if n.y > 0.0:
		n = -n
	var lip := PackedVector2Array([a - n * 2.0, b - n * 2.0, b - n * LIP, a - n * LIP])
	Art.shape(self, lip, th.top, th.outline, 3.0)
