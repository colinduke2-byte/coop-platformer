@tool
class_name Pendulum
extends Node2D
## A log hanging from two ropes, swinging back and forth.
##   spiked = false: a swinging platform you ride (it carries you).
##   spiked = true : a spiky log that bubbles anyone it touches - time your run!
## Origin = the pivot (rope anchor). Set `phase` to desync neighbours.

@export var rope_length := 260.0:
	set(v):
		rope_length = v
		queue_redraw()
@export var log_width := 170.0:
	set(v):
		log_width = v
		_rebuild()
@export var amplitude := 0.9                ## rad either side of straight down
@export var period := 3.2                   ## s for a full swing there and back
@export var phase := 0.0                    ## 0..1
@export var spiked := false:
	set(v):
		spiked = v
		_rebuild()

const LOG := Color("8a5a36")
const LOG_END := Color("d8b27a")
const ROPE := Color("8a6a45")
const SPIKE := Color("d9d4e8")

var _t := 0.0
var _body: AnimatableBody2D
var _hurt: Area2D


func _ready() -> void:
	_t = phase * period
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for n in [_body, _hurt]:
		if is_instance_valid(n):
			n.queue_free()
	_body = null
	_hurt = null
	var shape := RectangleShape2D.new()
	shape.size = Vector2(log_width, 30)
	if spiked:
		_hurt = Area2D.new()
		_hurt.collision_layer = 0
		_hurt.collision_mask = 2
		_hurt.monitorable = false
		var c := CollisionShape2D.new()
		var s2 := RectangleShape2D.new()
		s2.size = Vector2(log_width + 20, 50)
		c.shape = s2
		_hurt.add_child(c)
		add_child(_hurt, false, Node.INTERNAL_MODE_FRONT)
	else:
		_body = AnimatableBody2D.new()
		_body.collision_layer = 1
		_body.collision_mask = 0
		_body.sync_to_physics = false
		var c := CollisionShape2D.new()
		c.shape = shape
		c.one_way_collision = true
		c.position = Vector2(0, -8)
		_body.add_child(c)
		add_child(_body, false, Node.INTERNAL_MODE_FRONT)
	_place()


func angle() -> float:
	return sin(_t / period * TAU) * amplitude


func log_position() -> Vector2:
	return Vector2(0, rope_length).rotated(angle())


func _place() -> void:
	var p := log_position()
	if _body:
		_body.position = p
	if _hurt:
		_hurt.position = p


func _physics_process(delta: float) -> void:
	if not Engine.is_editor_hint():
		_t += delta
	_place()
	if _hurt and not Engine.is_editor_hint():
		for b in _hurt.get_overlapping_bodies():
			var pl := b as Player
			if pl and not pl.is_bubbled():
				pl.hurt()
	View.redraw(self, rope_length + log_width)


func _draw() -> void:
	var o := Color("1d1726")
	var p := log_position()
	draw_circle(Vector2.ZERO, 10.0, Color("6b6b7a"))
	draw_circle(Vector2.ZERO, 5.0, o)
	for s: float in [-1.0, 1.0]:
		var end := p + Vector2(s * log_width * 0.3, -10)
		draw_line(Vector2.ZERO, end, o, 5.0)
		draw_line(Vector2.ZERO, end, ROPE, 3.0)
	var hw := log_width * 0.5
	if spiked:
		for i in 7:
			var x := -hw + log_width * (i + 0.5) / 7.0
			for s: float in [-1.0, 1.0]:
				Art.shape(self, PackedVector2Array([p + Vector2(x - 9, s * 12), p + Vector2(x, s * 30), p + Vector2(x + 9, s * 12)]), SPIKE, o, 2.0)
	Art.shape(self, Art.rounded_rect(p + Vector2(-hw, -15), p + Vector2(hw, 15), 14.0), LOG, o, 3.0)
	draw_line(p + Vector2(-hw + 16, -4), p + Vector2(hw - 30, -4), LOG.darkened(0.2), 3.0)
	draw_line(p + Vector2(-hw + 40, 6), p + Vector2(hw - 16, 6), LOG.darkened(0.2), 3.0)
	for s: float in [-1.0, 1.0]:
		Art.shape(self, Art.ellipse(p + Vector2(s * (hw - 4), 0), 7, 14, 12), LOG_END, o, 2.0)
