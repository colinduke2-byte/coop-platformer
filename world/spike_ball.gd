@tool
class_name SpikeBall
extends Node2D
## Spiked balls on chains orbiting this point. `count` balls, `radius` px
## out, `speed` degrees/second (negative = counter-clockwise). Touch = bubble.
## Set radius 0 + count 1 for a static spiky hazard.

@export var count := 1:
	set(v):
		count = maxi(v, 1)
		_rebuild()
@export var radius := 140.0:
	set(v):
		radius = v
		queue_redraw()
@export var speed := 90.0
@export var start_angle := 0.0

const BALL_R := 22.0

var _angle := 0.0
var _balls: Array[Area2D] = []


func _ready() -> void:
	_angle = deg_to_rad(start_angle)
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for b in _balls:
		b.queue_free()
	_balls.clear()
	for i in count:
		var a := Area2D.new()
		a.collision_layer = 32
		a.collision_mask = 2
		a.monitorable = false
		var shape := CircleShape2D.new()
		shape.radius = BALL_R
		var col := CollisionShape2D.new()
		col.shape = shape
		a.add_child(col)
		add_child(a, false, Node.INTERNAL_MODE_FRONT)
		_balls.append(a)
	_place()


func _place() -> void:
	for i in _balls.size():
		var a := _angle + TAU * float(i) / _balls.size()
		_balls[i].position = Vector2.from_angle(a) * radius


func _physics_process(delta: float) -> void:
	_angle += deg_to_rad(speed) * delta
	_place()
	queue_redraw()
	if Engine.is_editor_hint():
		return
	for a in _balls:
		for b in a.get_overlapping_bodies():
			if b is Player:
				(b as Player).hurt()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var metal := Color("8a93a6")
	for a in _balls:
		var p := a.position
		var links := int(radius / 18.0)
		for k in links:
			draw_circle(p * float(k) / maxf(links, 1), 5.0, metal.darkened(0.3))
		Art.shape(self, Art.star(p, BALL_R + 10.0, 10, 0.65, _angle * 2.0), Color("d9dde8"), o, 2.5)
		Art.shape(self, Art.ellipse(p, BALL_R, BALL_R, 20), metal, o, 3.0)
		draw_circle(p + Vector2(-7, -7), 6.0, Color(1, 1, 1, 0.4))
	Art.shape(self, Art.ellipse(Vector2.ZERO, 12, 12, 14), metal.darkened(0.2), o, 3.0)
