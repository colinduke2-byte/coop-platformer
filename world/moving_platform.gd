@tool
class_name MovingPlatform
extends AnimatableBody2D
## Platform that travels along waypoints and carries whatever stands on it.
## Origin = top-left of the platform at its first waypoint. Add waypoints as
## offsets from there in the Inspector (the editor draws the path).
## Can be switched on/off by switches (set_active), or wait for a rider.

enum Mode { PING_PONG, LOOP, ONCE }

@export var size := Vector2(192, 32):
	set(v):
		size = v
		_rebuild()
@export var waypoints: PackedVector2Array = [Vector2(400, 0)]:  ## offsets from the start
	set(v):
		waypoints = v
		queue_redraw()
@export var mode := Mode.PING_PONG
@export var speed := 170.0                  ## px/s
@export var wait_time := 0.5                ## s paused at each end / waypoint
@export_range(0.0, 1.0) var start_offset := 0.0  ## 0..1 along the path (desync neighbours)
@export var one_way := false:
	set(v):
		one_way = v
		_rebuild()
@export var active := true                  ## false = parked until a switch turns it on
@export var wait_for_rider := false         ## starts moving when a player stands on it

var _points: PackedVector2Array = []
var _lengths: Array[float] = []
var _total := 0.0
var _dist := 0.0
var _dir := 1.0
var _wait := 0.0
var _origin := Vector2.ZERO
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = true
	_origin = position
	_rebuild()
	_build_path()
	_dist = start_offset * _total
	if not Engine.is_editor_hint():
		add_to_group(&"net_sync")
		if wait_for_rider:
			active = false


func set_active(on: bool) -> void:
	active = on


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
	_col.one_way_collision = one_way
	queue_redraw()


func _build_path() -> void:
	_points = PackedVector2Array([Vector2.ZERO])
	_points.append_array(waypoints)
	if mode == Mode.LOOP and _points.size() > 1:
		_points.append(Vector2.ZERO)
	_lengths.clear()
	_total = 0.0
	for i in _points.size() - 1:
		var l := _points[i].distance_to(_points[i + 1])
		_lengths.append(l)
		_total += l


func _at(d: float) -> Vector2:
	for i in _lengths.size():
		if d <= _lengths[i] or i == _lengths.size() - 1:
			return _points[i].lerp(_points[i + 1], clampf(d / maxf(_lengths[i], 0.001), 0.0, 1.0))
		d -= _lengths[i]
	return Vector2.ZERO


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint() or _total <= 0.0:
		return
	if not active:
		if wait_for_rider and _has_rider():
			active = true
		else:
			return
	if _wait > 0.0:
		_wait -= delta
		return
	var prev := _dist
	_dist += _dir * speed * delta
	match mode:
		Mode.PING_PONG:
			if _dist >= _total or _dist <= 0.0:
				_dist = clampf(_dist, 0.0, _total)
				_dir = -_dir
				_wait = wait_time
		Mode.LOOP:
			if _dist >= _total:
				_dist = fmod(_dist, _total)
				_wait = wait_time
		Mode.ONCE:
			if _dist >= _total:
				_dist = _total
				active = false
	# Pause at intermediate waypoints too.
	var acc := 0.0
	for i in _lengths.size() - 1:
		acc += _lengths[i]
		if (prev - acc) * (_dist - acc) < 0.0:
			_wait = wait_time
	position = _origin + _at(_dist)


## Online: the host's platform steers everyone's (see Net).
func net_state() -> Array:
	return [snappedf(_dist, 0.1), _dir, snappedf(_wait, 0.01), 1 if active else 0]


func net_apply(s: Array) -> void:
	if s.size() < 4:
		return
	active = int(s[3]) == 1
	_dir = float(s[1])
	_wait = float(s[2])
	var d := float(s[0])
	if absf(d - _dist) > 6.0:
		_dist = lerpf(_dist, d, 0.5)  # ease: riders on it barely notice


func _has_rider() -> bool:
	for p in get_tree().get_nodes_in_group(&"players"):
		var pl := p as Player
		if pl.is_on_floor() and absf(pl.global_position.y - global_position.y) < 6.0 \
				and pl.global_position.x > global_position.x - 10.0 and pl.global_position.x < global_position.x + size.x + 10.0:
			return true
	return false


func _draw() -> void:
	var th := LevelTheme.find(self)
	PlatformArt.draw_plank(self, Rect2(Vector2.ZERO, size), th)
	if Engine.is_editor_hint():
		var pts := PackedVector2Array([size * 0.5])
		for w in waypoints:
			pts.append(w + size * 0.5)
		if mode == Mode.LOOP:
			pts.append(size * 0.5)
		Art.dotted(self, pts, Color(1, 1, 1, 0.8), 18.0, 4.0)
		for w in waypoints:
			draw_rect(Rect2(w, size), Color(1, 1, 1, 0.25), false, 2.0)
