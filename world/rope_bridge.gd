@tool
class_name RopeBridge
extends Node2D
## A wobbly rope bridge of planks between two posts. It sags under whoever
## walks on it and springs back (with a little bounce) when they leave.
## Planks are one-way: jump up through from below. `broken_planks` lists
## plank indices that are missing (gaps to hop). Origin = left post top,
## the bridge runs to `span`.

@export var span := Vector2(640, 0):        ## right end, relative to the left end
	set(v):
		span = v
		_rebuild()
@export var plank_count := 14:
	set(v):
		plank_count = maxi(v, 2)
		_rebuild()
@export var slack := 26.0                   ## resting sag in the middle (px)
@export var max_dip := 46.0                 ## extra sag under a rider
@export var broken_planks: PackedInt32Array = []:
	set(v):
		broken_planks = v
		_rebuild()

const PLANK := Color("c98a4b")
const ROPE := Color("8a6a45")
const POST := Color("7a4e2d")

var _planks: Array[AnimatableBody2D] = []
var _dip: PackedFloat32Array = []       ## current extra sag per plank
var _dip_vel: PackedFloat32Array = []
var _t := 0.0


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for p in _planks:
		if is_instance_valid(p):
			p.queue_free()
	_planks.clear()
	_dip.resize(plank_count)
	_dip_vel.resize(plank_count)
	_dip.fill(0.0)
	_dip_vel.fill(0.0)
	var w := _plank_width()
	for i in plank_count:
		var b := AnimatableBody2D.new()
		b.collision_layer = 1
		b.collision_mask = 0
		b.sync_to_physics = false
		var col := CollisionShape2D.new()
		var shape := RectangleShape2D.new()
		shape.size = Vector2(w - 4.0, 12.0)
		col.shape = shape
		col.position = Vector2(0, 6)
		col.one_way_collision = true
		col.disabled = i in broken_planks
		b.add_child(col)
		b.position = _rest(i)
		add_child(b, false, Node.INTERNAL_MODE_FRONT)
		_planks.append(b)
	queue_redraw()


func _plank_width() -> float:
	return span.length() / plank_count


func _t_of(i: int) -> float:
	return (float(i) + 0.5) / plank_count


func _rest(i: int) -> Vector2:
	var t := _t_of(i)
	return span * t + Vector2(0, sin(t * PI) * slack)


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	_t += delta
	# Where are the riders along the bridge (0..1)?
	var riders: Array[float] = []
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if not p.is_on_floor():
			continue
		var local := p.global_position - global_position
		var t := local.x / maxf(span.x, 1.0)
		if t > -0.02 and t < 1.02 and absf(local.y - (span.y * t + sin(clampf(t, 0.0, 1.0) * PI) * slack + _dip_at(t))) < 20.0:
			riders.append(clampf(t, 0.0, 1.0))
	for i in plank_count:
		var t := _t_of(i)
		var target := 0.0
		for r in riders:
			# A rider pulls the whole bridge down, most right under their feet.
			var near := 1.0 - clampf(absf(t - r) * 2.2, 0.0, 1.0)
			target += max_dip * sin(r * PI) * (0.35 + 0.65 * near * near)
		target = minf(target, max_dip * 1.6)
		_dip_vel[i] += (target - _dip[i]) * 90.0 * delta
		_dip_vel[i] *= exp(-7.0 * delta)
		_dip[i] += _dip_vel[i] * delta
		var b := _planks[i]
		b.position = _rest(i) + Vector2(0, _dip[i])
		var ang := 0.0
		if i > 0 and i < plank_count - 1:
			ang = (_dip[i + 1] - _dip[i - 1]) / (_plank_width() * 2.0) * 0.8
		b.rotation = ang + atan2(span.y, span.x)
	View.redraw_rect(self, Rect2(global_position - Vector2(0, 50), span.abs() + Vector2(0, 150)))


func _dip_at(t: float) -> float:
	var i := clampi(int(t * plank_count), 0, plank_count - 1)
	return _dip[i] if _dip.size() > i else 0.0


func _draw() -> void:
	var o := Color("1d1726")
	# Posts.
	for end: Vector2 in [Vector2.ZERO, span]:
		Art.shape(self, Art.rect(end + Vector2(-8, -60), end + Vector2(8, 40)), POST, o, 2.5)
		draw_circle(end + Vector2(0, -60), 9.0, POST.darkened(0.2))
	# Hand ropes (sag with the planks).
	var rope := PackedVector2Array([Vector2(0, -54)])
	var under := PackedVector2Array([Vector2(0, 4)])
	for i in plank_count:
		var p := _planks[i].position if i < _planks.size() else _rest(i)
		rope.append(p + Vector2(0, -44))
		under.append(p + Vector2(0, 8))
	rope.append(span + Vector2(0, -54))
	under.append(span + Vector2(0, 4))
	draw_polyline(under, o, 5.0)
	draw_polyline(under, ROPE, 3.0)
	# Planks.
	var w := _plank_width()
	for i in plank_count:
		if i in broken_planks:
			continue
		var p := _planks[i].position if i < _planks.size() else _rest(i)
		var r := _planks[i].rotation if i < _planks.size() else 0.0
		draw_set_transform(p, r)
		Art.shape(self, Art.rounded_rect(Vector2(-w * 0.5 + 2, 0), Vector2(w * 0.5 - 2, 12), 3.0), PLANK.darkened(0.05 * (i % 2)), o, 2.0)
		draw_set_transform(Vector2.ZERO, 0.0)
		draw_line(p + Vector2(0, -44), p + Vector2(0, 2), ROPE, 2.0)
	draw_polyline(rope, o, 5.0)
	draw_polyline(rope, ROPE, 3.0)
