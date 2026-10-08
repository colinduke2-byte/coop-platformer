@tool
class_name BubbleColumn
extends Area2D
## A column of rising bubbles under water: anyone swimming inside is carried up
## at `rise` px/s. Origin = top-left, like Water. Put it inside a Water area
## (it does nothing in the air). Bubbles stream up so you can read it at a glance.

@export var size := Vector2(120, 600):
	set(v):
		size = v
		_rebuild()
@export var rise := 420.0

var _t := 0.0
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	z_index = 14
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
	queue_redraw()


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw_rect(self, Rect2(global_position, size))
	if Engine.is_editor_hint():
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p and p.state_machine.current_name() == &"Swim":
			p.wind_push.y -= rise


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(1, 1, 1, 0.06))
	var n := int(size.x * size.y / 6000.0) + 6
	for i in n:
		var x := fposmod(i * 37.3, size.x - 16.0) + 8.0 + sin(_t * 3.0 + i) * 5.0
		var y := size.y - fposmod(_t * rise * 0.5 + i * 53.0, size.y)
		var r := 3.0 + float(i % 4) * 1.5
		var a := clampf(minf(y, size.y - y) / 60.0, 0.0, 1.0)
		draw_arc(Vector2(x, y), r, 0, TAU, 10, Color(1, 1, 1, 0.65 * a), 1.5)
		draw_circle(Vector2(x - r * 0.35, y - r * 0.35), r * 0.25, Color(1, 1, 1, 0.8 * a))
