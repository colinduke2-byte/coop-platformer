@tool
class_name LeafPlatform
extends AnimatableBody2D
## A big floating leaf. Step on it and it sinks, gently swaying, under your
## weight (hop off in time!). Once it drops `sink_depth` it tumbles away and
## a fresh leaf floats back into place. Without riders it slowly rises back.
## Origin = top-centre of the leaf at rest.

@export var width := 150.0:
	set(v):
		width = v
		_rebuild()
@export var sink_speed := 90.0              ## px/s while ridden
@export var sink_depth := 360.0             ## px before it falls away (0 = never)
@export var rise_speed := 60.0
@export var respawn_time := 2.0
@export var tint := Color("7cc75a")

var _home := Vector2.ZERO
var _depth := 0.0
var _t := 0.0
var _gone := false
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = false
	_home = position
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width - 16.0, 14)
	_col.shape = shape
	_col.position = Vector2(0, 7)
	_col.one_way_collision = true
	queue_redraw()


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint() or _gone:
		return
	_t += delta
	var ridden := false
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_on_floor() and absf(p.global_position.y - global_position.y) < 6.0 and absf(p.global_position.x - global_position.x) < width * 0.5 + 6.0:
			ridden = true
			break
	if ridden:
		_depth += sink_speed * delta
	else:
		_depth = maxf(_depth - rise_speed * delta, 0.0)
	var sway := sin(_t * 2.2) * (4.0 + _depth * 0.03)
	position = _home + Vector2(sway, _depth + sin(_t * 1.7) * 3.0)
	rotation = sin(_t * 2.2 + 0.6) * 0.05 * (1.0 if ridden else 0.4)
	View.redraw(self)
	if sink_depth > 0.0 and _depth >= sink_depth:
		_fall()


func _fall() -> void:
	_gone = true
	_col.set_deferred(&"disabled", true)
	var tw := create_tween()
	tw.set_parallel()
	tw.tween_property(self, ^"position", position + Vector2(80, 400), 1.0).set_ease(Tween.EASE_IN)
	tw.tween_property(self, ^"rotation", 1.2, 1.0)
	tw.tween_property(self, ^"modulate:a", 0.0, 1.0)
	tw.chain().tween_interval(respawn_time)
	tw.chain().tween_callback(_respawn)


func _respawn() -> void:
	_gone = false
	_depth = 0.0
	position = _home + Vector2(0, -40)
	rotation = 0.0
	_col.disabled = false
	var tw := create_tween()
	tw.tween_property(self, ^"modulate:a", 1.0, 0.4)


func _draw() -> void:
	var o := Color("1d1726")
	var hw := width * 0.5
	var pts := PackedVector2Array()
	for i in 21:
		var t := float(i) / 20.0
		pts.append(Vector2(lerpf(-hw, hw, t), -sin(t * PI) * 6.0 + 2.0))
	for i in range(20, -1, -1):
		var t := float(i) / 20.0
		pts.append(Vector2(lerpf(-hw, hw, t), sin(t * PI) * 20.0 + 2.0))
	Art.shape(self, pts, tint, o, 2.5)
	draw_line(Vector2(-hw + 6, 6), Vector2(hw - 6, 6), tint.darkened(0.25), 2.5)
	for i in range(1, 6):
		var x := -hw + width * i / 6.0
		draw_line(Vector2(x, 6), Vector2(x + 14, 16 * sin(float(i) / 6.0 * PI)), tint.darkened(0.2), 2.0)
	draw_line(Vector2(hw - 4, 4), Vector2(hw + 14, -6), tint.darkened(0.35), 3.0)  # stalk
