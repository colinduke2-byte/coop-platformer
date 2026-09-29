@tool
class_name RisingHazard
extends Node2D
## Lava (or poison goo) that rises while active - a chase! Start it with a
## ZoneTrigger (set_active). Touching the surface bubbles players. Rises from
## its start position up to `rise_distance`, and resets when everyone
## respawns at a checkpoint. Origin = left end of the surface at the start.

@export var width := 1600.0:
	set(v):
		width = v
		queue_redraw()
@export var rise_distance := 1200.0
@export var speed := 90.0                   ## px/s
@export var active := false
@export var color := Color("ff6b35")
@export var depth := 2000.0                 ## how far down the fill is drawn

var _start := Vector2.ZERO
var _risen := 0.0
var _t := 0.0
var _auto_active := false


func _ready() -> void:
	z_index = -1  # behind blocks: it can start hidden under the floor
	_start = position
	_auto_active = active
	if not Engine.is_editor_hint():
		EventBus.level_reset.connect(_reset)


func set_active(on: bool) -> void:
	active = on


func _reset() -> void:
	_risen = 0.0
	position = _start
	active = _auto_active


func surface_y() -> float:
	return global_position.y


func _physics_process(delta: float) -> void:
	_t += delta
	queue_redraw()
	if Engine.is_editor_hint():
		return
	if active and _risen < rise_distance:
		_risen = minf(_risen + speed * delta, rise_distance)
		position.y = _start.y - _risen
	for p in get_tree().get_nodes_in_group(&"players"):
		var pl := p as Player
		var x := pl.global_position.x - global_position.x
		if x >= 0.0 and x <= width and pl.global_position.y > global_position.y + 10.0:
			pl.hurt()


func _draw() -> void:
	var pts := PackedVector2Array()
	var n := maxi(int(width / 30.0), 2)
	for i in n + 1:
		var x := width * i / n
		pts.append(Vector2(x, sin(x * 0.02 + _t * 3.0) * 6.0 + sin(x * 0.05 - _t * 2.0) * 3.0))
	var body := pts.duplicate()
	body.append(Vector2(width, depth))
	body.append(Vector2(0, depth))
	draw_colored_polygon(body, color)
	draw_rect(Rect2(0, 40, width, depth - 40), color.darkened(0.25))
	draw_polyline(pts, color.lightened(0.45), 6.0)
	for i in int(width / 90.0):
		var bx := fmod(i * 131.0 + _t * 20.0, width)
		var r := 5.0 + 4.0 * sin(_t * 4.0 + i)
		draw_circle(Vector2(bx, 12.0 + fmod(i * 17.0, 30.0)), maxf(r, 1.0), color.lightened(0.3))
	if Engine.is_editor_hint():
		Art.dotted(self, PackedVector2Array([Vector2(width * 0.5, 0), Vector2(width * 0.5, -rise_distance)]), Color(1, 0.5, 0.2, 0.8), 18.0, 4.0)
		draw_line(Vector2(0, -rise_distance), Vector2(width, -rise_distance), Color(1, 0.5, 0.2, 0.6), 2.0)
