@tool
class_name Climbable
extends Area2D
## Vine (climb up/down) or net (climb any direction). Grab by jumping into it
## or pressing UP; see the Climb state. Origin = top-left. A vine is just a
## narrow Climbable (width <= 60).

@export var size := Vector2(40, 360):
	set(v):
		size = v
		_rebuild()
@export var auto_grab := true               ## grab on touch while airborne (else need UP)

var _t := 0.0
var _mesh: ArrayMesh
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	z_index = -2
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size
	_col.shape = shape
	_col.position = size * 0.5
	_mesh = null
	queue_redraw()


func is_vine() -> bool:
	return size.x <= 60.0


func center_x() -> float:
	return global_position.x + size.x * 0.5


func top_y() -> float:
	return global_position.y


func _physics_process(delta: float) -> void:
	_t += delta
	if Engine.is_editor_hint():
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p and not p.is_bubbled():
			# Hands must be on it, not just the feet.
			if p.global_position.y + Player.GRIP_OFFSET.y > global_position.y - 10.0:
				p.touch_climbable(self)


## Baked into one mesh (vines and nets are static): one draw call.
func _draw() -> void:
	if _mesh == null:
		var mp := MeshPainter.new()
		_paint(mp)
		_mesh = mp.build()
	draw_mesh(_mesh, null)


func _paint(c: MeshPainter) -> void:
	var th := LevelTheme.find(self)
	if is_vine():
		var x := size.x * 0.5
		var pts := PackedVector2Array()
		for i in int(size.y / 12.0) + 1:
			var y := i * 12.0
			pts.append(Vector2(x + sin(y * 0.05) * 5.0, y))
		c.draw_polyline(pts, th.outline, 12.0)
		c.draw_polyline(pts, th.foliage_dark, 8.0)
		for i in int(size.y / 40.0):
			var y := 20.0 + i * 40.0
			var s := 1.0 if i % 2 == 0 else -1.0
			Art.shape(c, Art.ellipse(Vector2(x + s * 12.0, y), 10, 5, 10), th.foliage, th.outline, 2.0)
	else:
		var rope := Color("c9a06b")
		c.draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.08))
		var step := 36.0
		var x := 0.0
		while x <= size.x:
			c.draw_line(Vector2(x, 0), Vector2(x, size.y), th.outline, 6.0)
			c.draw_line(Vector2(x, 0), Vector2(x, size.y), rope, 3.0)
			x += step
		var y := 0.0
		while y <= size.y:
			c.draw_line(Vector2(0, y), Vector2(size.x, y), th.outline, 6.0)
			c.draw_line(Vector2(0, y), Vector2(size.x, y), rope, 3.0)
			y += step
