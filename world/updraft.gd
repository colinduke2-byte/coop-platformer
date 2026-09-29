@tool
class_name Updraft
extends Area2D
## Column of rising wind. Gliding players inside it rise at `rise_speed`
## (see Glide state); everyone else just falls through. Origin = top-left
## corner, like Block. Streaks animate upward so you can read it at a glance.

const COLUMN := Color(1, 1, 1, 0.12)
const STREAK := Color(1, 1, 1, 0.5)
const STREAKS_PER_100PX := 1.2
const STREAK_SPEED := 520.0   ## px/s, visual only
const STREAK_LENGTH := 46.0

@export var size := Vector2(160, 900):
	set(value):
		size = value
		_rebuild()
@export var rise_speed := 380.0  ## px/s a gliding player climbs at

var _streaks: Array[Line2D] = []


func _ready() -> void:
	collision_layer = 32  # triggers
	collision_mask = 2    # players
	monitorable = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for c in get_children():
		remove_child(c)
		c.queue_free()
	_streaks.clear()
	var shape := RectangleShape2D.new()
	shape.size = size
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = size * 0.5
	add_child(col)
	var column := Polygon2D.new()
	column.polygon = PackedVector2Array([Vector2.ZERO, Vector2(size.x, 0), size, Vector2(0, size.y)])
	column.color = COLUMN
	add_child(column)
	var n := int(size.y / 100.0 * STREAKS_PER_100PX * size.x / 80.0)
	for i in maxi(n, 3):
		var s := Line2D.new()
		s.width = 3.0
		s.default_color = STREAK
		s.begin_cap_mode = Line2D.LINE_CAP_ROUND
		s.end_cap_mode = Line2D.LINE_CAP_ROUND
		s.points = PackedVector2Array([Vector2.ZERO, Vector2(0, STREAK_LENGTH)])
		s.position = Vector2(randf_range(8, size.x - 8), randf_range(0, size.y))
		add_child(s)
		_streaks.append(s)


func _process(delta: float) -> void:
	for s in _streaks:
		s.position.y -= STREAK_SPEED * delta
		if s.position.y < -STREAK_LENGTH:
			s.position = Vector2(randf_range(8, size.x - 8), size.y)
		s.modulate.a = clampf(minf(s.position.y, size.y - s.position.y) / 120.0, 0.0, 1.0)


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint():
		return
	for body in get_overlapping_bodies():
		if body is Player:
			(body as Player).apply_updraft(rise_speed)
