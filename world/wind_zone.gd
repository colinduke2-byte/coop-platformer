@tool
class_name WindZone
extends Area2D
## Blows everyone inside along `wind` (px/s). Gliders get pushed harder.
## Sideways gusts, headwinds, downdrafts... (for lifting gliders straight up,
## Updraft is still the one). `gust_period` > 0 makes it blow on and off.
## Origin = top-left.

@export var size := Vector2(600, 300):
	set(v):
		size = v
		_rebuild()
@export var wind := Vector2(260, 0):
	set(v):
		wind = v
		_rebuild()
@export var gust_period := 0.0              ## s per on/off cycle (0 = always on)
@export_range(0.0, 1.0) var gust_on_fraction := 0.6

var _t := 0.0
var _streaks: Array[Vector2] = []
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	z_index = 12
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
	_streaks.clear()
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	for i in int(size.x * size.y / 14000.0) + 3:
		_streaks.append(Vector2(rng.randf() * size.x, rng.randf() * size.y))
	queue_redraw()


func blowing() -> bool:
	return gust_period <= 0.0 or fmod(_t, gust_period) < gust_period * gust_on_fraction


func _physics_process(delta: float) -> void:
	_t += delta
	var on := blowing()
	if on:
		var d := wind * delta * 1.6
		for i in _streaks.size():
			var s := _streaks[i] + d
			if s.x > size.x: s.x -= size.x
			if s.x < 0.0: s.x += size.x
			if s.y > size.y: s.y -= size.y
			if s.y < 0.0: s.y += size.y
			_streaks[i] = s
	View.redraw_rect(self, Rect2(global_position, size))
	if Engine.is_editor_hint() or not on:
		return
	for b in get_overlapping_bodies():
		if b is Player and not b.is_bubbled():
			(b as Player).wind_push += wind


func _draw() -> void:
	var on := blowing() or Engine.is_editor_hint()
	var a := 0.5 if on else 0.12
	var dir := wind.normalized()
	for s in _streaks:
		var tail := s - dir * 40.0
		draw_line(tail, s, Color(1, 1, 1, a), 3.0)
		draw_line(s - dir * 8.0 + dir.orthogonal() * 5.0, s, Color(1, 1, 1, a), 2.0)
	if Engine.is_editor_hint():
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.7, 0.9, 1.0, 0.15))
