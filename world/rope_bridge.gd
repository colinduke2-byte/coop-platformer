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

var _deck: AnimatableBody2D
var _runs: Array = []                        ## lists of plank indices without gaps
var _polys: Array[CollisionPolygon2D] = []
var _pos := PackedVector2Array()             ## plank centres (top surface)
var _rot := PackedFloat32Array()
var _dip: PackedFloat32Array = []       ## current extra sag per plank
var _dip_vel: PackedFloat32Array = []
var _t := 0.0


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _deck and is_instance_valid(_deck):
		_deck.queue_free()
	_polys.clear()
	_dip.resize(plank_count)
	_dip_vel.resize(plank_count)
	_dip.fill(0.0)
	_dip_vel.fill(0.0)
	_pos.resize(plank_count)
	_rot.resize(plank_count)
	for i in plank_count:
		_pos[i] = _rest(i)
		_rot[i] = atan2(span.y, span.x)
	# One body; each unbroken run of planks is one smooth one-way polygon that
	# is reshaped every frame to follow the sag (no steps between planks).
	_deck = AnimatableBody2D.new()
	_deck.collision_layer = 1
	_deck.collision_mask = 0
	_deck.sync_to_physics = false
	add_child(_deck, false, Node.INTERNAL_MODE_FRONT)
	_runs.clear()
	var run: Array[int] = []
	for i in plank_count:
		if i in broken_planks:
			if run.size() > 0:
				_runs.append(run)
			run = []
		else:
			run.append(i)
	if run.size() > 0:
		_runs.append(run)
	for r in _runs:
		var cp := CollisionPolygon2D.new()
		cp.build_mode = CollisionPolygon2D.BUILD_SOLIDS
		cp.one_way_collision = true
		_deck.add_child(cp)
		_polys.append(cp)
	_update_collision()
	queue_redraw()


## Rebuild each run's deck polygon from the current plank positions.
func _update_collision() -> void:
	var hw := _plank_width() * 0.5
	for k in _runs.size():
		var r: Array = _runs[k]
		var top := PackedVector2Array()
		var first: int = r[0]
		var last: int = r[r.size() - 1]
		# At the anchored ends the deck ramps up to the post (and a little past it) so walking
		# off the bridge onto the ledge it hangs from never meets a lip.
		if first == 0:
			top.append(Vector2(-6.0, 0.0))
		else:
			top.append(_pos[first] + Vector2(-hw + 2.0, 0).rotated(_rot[first]))
		for i: int in r:
			top.append(_pos[i])
		if last == plank_count - 1:
			top.append(span + Vector2(6.0, 0.0))
		else:
			top.append(_pos[last] + Vector2(hw - 2.0, 0).rotated(_rot[last]))
		var poly := top.duplicate()
		for j in range(top.size() - 1, -1, -1):
			poly.append(top[j] + Vector2(0, 12))
		_polys[k].polygon = poly


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
			var near := 1.0 - clampf(absf(t - r) * 1.6, 0.0, 1.0)
			target += max_dip * sin(r * PI) * (0.35 + 0.65 * near * near)
		target = minf(target, max_dip * 1.6)
		_dip_vel[i] += (target - _dip[i]) * 90.0 * delta
		_dip_vel[i] *= exp(-7.0 * delta)
		_dip[i] += _dip_vel[i] * delta
		_pos[i] = _rest(i) + Vector2(0, _dip[i])
		var ang := 0.0
		if i > 0 and i < plank_count - 1:
			ang = (_dip[i + 1] - _dip[i - 1]) / (_plank_width() * 2.0) * 0.8
		_rot[i] = ang + atan2(span.y, span.x)
	_update_collision()
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
		var p := _pos[i] if i < _pos.size() else _rest(i)
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
		var p := _pos[i] if i < _pos.size() else _rest(i)
		var r := _rot[i] if i < _rot.size() else 0.0
		draw_set_transform(p, r)
		Art.shape(self, Art.rounded_rect(Vector2(-w * 0.5 + 2, 0), Vector2(w * 0.5 - 2, 12), 3.0), PLANK.darkened(0.05 * (i % 2)), o, 2.0)
		draw_set_transform(Vector2.ZERO, 0.0)
		draw_line(p + Vector2(0, -44), p + Vector2(0, 2), ROPE, 2.0)
	draw_polyline(rope, o, 5.0)
	draw_polyline(rope, ROPE, 3.0)
