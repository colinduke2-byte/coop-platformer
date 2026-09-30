@tool
class_name Seesaw
extends AnimatableBody2D
## A plank balanced on a log. It tips toward whoever stands on it. Land on the
## raised end hard (a fall or a ground pound) and it SLAMS down, catapulting
## anyone on the other end sky-high. Great for co-op, fun alone (a slam also
## flings you if you jump off the high end and land back on the low one).
## Origin = the pivot (top of the fulcrum).

@export var length := 320.0:
	set(v):
		length = v
		_rebuild()
@export var max_angle := 0.38               ## rad the plank tips
@export var slam_speed := 700.0             ## landing this fast (px/s) on the high end = slam
@export var fling_speed := 1400.0           ## upward speed given to riders on the rising end

const PLANK := Color("c98a4b")
const PLANK_DARK := Color("9a6533")
const LOG := Color("7a4e2d")

var angle := 0.0          ## + = right end down
var _vel := 0.0
var _col: CollisionShape2D
var _prev_fall := {}      ## Player -> fall speed last frame (to catch landings)


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = Vector2(length, 20)
	_col.shape = shape
	_col.position = Vector2(0, -10)
	queue_redraw()


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var weight := 0.0
	var slammed := 0  # side slammed: +1 right, -1 left
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		var local := _to_plank(p.global_position)
		var on := p.is_on_floor() and absf(local.x) < length * 0.5 + 8.0 and absf(local.y) < 8.0
		var fall: float = _prev_fall.get(p, 0.0)
		_prev_fall[p] = p.velocity.y
		if not on:
			continue
		weight += clampf(local.x / (length * 0.5), -1.0, 1.0)
		var side := int(signf(local.x))
		var high := side == -int(signf(angle)) or absf(angle) < 0.05
		if fall >= slam_speed and high and absf(local.x) > length * 0.2:
			slammed = side
	var target := clampf(weight, -1.0, 1.0) * max_angle
	if slammed != 0:
		_slam(slammed)
		target = slammed * max_angle
		_vel = slammed * 8.0
	# Spring toward the target angle.
	_vel += (target - angle) * 60.0 * delta
	_vel *= exp(-8.0 * delta)
	angle = clampf(angle + _vel * delta, -max_angle, max_angle)
	rotation = angle
	View.redraw(self, length)


## Catapult everyone standing on the rising end.
func _slam(side: int) -> void:
	EventBus.screen_shake.emit(0.3)
	Vfx.puff(global_position + Vector2(side * length * 0.45, 0).rotated(rotation), 8, Color(0.9, 0.85, 0.7), Vector2.UP, PI, Vector2(60, 160))
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		var local := _to_plank(p.global_position)
		if int(signf(local.x)) == -side and absf(local.x) < length * 0.5 + 12.0 and absf(local.y) < 30.0 and not p.is_bubbled():
			p.launch(Vector2(p.velocity.x, -fling_speed))
	# Enemies on the rising end go flying too.
	for n in get_tree().get_nodes_in_group(&"enemies"):
		var e := n as Enemy
		if e.dead:
			continue
		var local := _to_plank(e.global_position)
		if int(signf(local.x)) == -side and absf(local.x) < length * 0.5 + 12.0 and absf(local.y) < 30.0:
			e.damage(null, Enemy.HitKind.HAZARD, Vector2(0, -fling_speed))


func _to_plank(p: Vector2) -> Vector2:
	return (p - global_position).rotated(-rotation) + Vector2(0, 20)


func _draw() -> void:
	var o := Color("1d1726")
	var h := length * 0.5
	Art.shape(self, Art.rounded_rect(Vector2(-h, -20), Vector2(h, 0), 5.0), PLANK, o, 3.0)
	draw_rect(Rect2(-h + 4, -17, length - 8, 4), PLANK.lightened(0.2))
	for i in range(1, 5):
		var x := -h + length * i / 5.0
		draw_line(Vector2(x, -18), Vector2(x, -2), PLANK_DARK, 2.0)
	for s: float in [-1.0, 1.0]:  # end stoppers
		draw_rect(Rect2(s * h - (8 if s > 0 else 0), -28, 8, 10), PLANK_DARK)
	# The fulcrum log doesn't tip: counter-rotate it.
	draw_set_transform(Vector2.ZERO, -rotation)
	Art.shape(self, PackedVector2Array([Vector2(-30, 44), Vector2(0, 0), Vector2(30, 44)]), LOG, o, 3.0)
	draw_circle(Vector2(0, 0), 8.0, LOG.darkened(0.3))
	draw_set_transform(Vector2.ZERO, 0.0)
