@tool
class_name SawBlade
extends Node2D
## Spinning saw that runs back and forth along a rail (waypoints, relative).
## Touch = bubble. Leave waypoints empty for a saw that just spins in place.

@export var radius := 34.0:
	set(v):
		radius = v
		queue_redraw()
@export var waypoints: PackedVector2Array = [Vector2(400, 0)]:
	set(v):
		waypoints = v
		queue_redraw()
@export var speed := 220.0
@export var loop := false                   ## true = run the path as a loop instead of ping-pong
@export var show_rail := true

var _origin := Vector2.ZERO
var _dist := 0.0
var _dir := 1.0
var _spin := 0.0
var _area: Area2D
var _pts := PackedVector2Array()


func _ready() -> void:
	_origin = position
	_area = Area2D.new()
	_area.collision_layer = 32
	_area.collision_mask = 2
	_area.monitorable = false
	var col := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = radius - 4.0
	col.shape = shape
	_area.add_child(col)
	add_child(_area, false, Node.INTERNAL_MODE_FRONT)
	_pts = PackedVector2Array([Vector2.ZERO])
	_pts.append_array(waypoints)
	if loop and _pts.size() > 1:
		_pts.append(Vector2.ZERO)


func _total() -> float:
	var t := 0.0
	for i in _pts.size() - 1:
		t += _pts[i].distance_to(_pts[i + 1])
	return t


func _at(d: float) -> Vector2:
	for i in _pts.size() - 1:
		var l := _pts[i].distance_to(_pts[i + 1])
		if d <= l or i == _pts.size() - 2:
			return _pts[i].lerp(_pts[i + 1], clampf(d / maxf(l, 0.001), 0.0, 1.0))
		d -= l
	return Vector2.ZERO


func _physics_process(delta: float) -> void:
	_spin += delta * 14.0
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	var total := _total()
	if total > 0.0:
		_dist += _dir * speed * delta
		if loop:
			_dist = fposmod(_dist, total)
		elif _dist > total or _dist < 0.0:
			_dist = clampf(_dist, 0.0, total)
			_dir = -_dir
	_area.position = _at(_dist)
	for b in _area.get_overlapping_bodies():
		if b is Player:
			(b as Player).hurt()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	if show_rail and _pts.size() > 1 or (Engine.is_editor_hint() and waypoints.size() > 0):
		var rail := PackedVector2Array([Vector2.ZERO])
		rail.append_array(waypoints)
		draw_polyline(rail, o, 8.0)
		draw_polyline(rail, Color("8a93a6"), 4.0)
	var c := _area.position if _area else Vector2.ZERO
	Art.shape(self, Art.star(c, radius, 12, 0.78, _spin), Color("d9dde8"), o, 3.0)
	Art.shape(self, Art.ellipse(c, radius * 0.45, radius * 0.45, 14), Color("8a93a6"), o, 2.5)
	draw_circle(c, 5.0, o)
