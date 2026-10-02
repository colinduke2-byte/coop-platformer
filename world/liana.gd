@tool
class_name Liana
extends Node2D
## A long jungle vine hanging from a branch. It sways gently; jump into its
## lower half to grab it (you hang where you caught it), then swing like a SwingRing (pump LEFT / RIGHT, JUMP
## to let go with a boost). Long vines swing slow and far - chain them over
## pits. Origin = where it hangs from (the branch); `length` = vine length.

@export var length := 300.0:
	set(v):
		length = v
		queue_redraw()
@export var sway := 0.22            ## rad of idle sway
@export var phase := 0.0            ## s offset of the idle sway

const GRAB_RADIUS := 60.0

var rope_length := 300.0            ## read by the Swing state
var _t := 0.0
var _grab: Area2D


func _ready() -> void:
	rope_length = length
	_t = phase
	if Engine.is_editor_hint():
		return
	_grab = Area2D.new()
	_grab.collision_layer = 32
	_grab.collision_mask = 2
	_grab.monitorable = false
	# The lower half of the vine is grabbable: a capsule along it.
	var shape := CapsuleShape2D.new()
	shape.radius = GRAB_RADIUS
	shape.height = length * 0.5 + GRAB_RADIUS * 2.0
	var col := CollisionShape2D.new()
	col.shape = shape
	_grab.add_child(col)
	add_child(_grab)
	_place_grab()


func _idle_angle() -> float:
	return sin(_t * sqrt(2600.0 / maxf(length, 60.0))) * sway


func _place_grab() -> void:
	var a := _idle_angle()
	_grab.position = Vector2(sin(a), cos(a)) * length * 0.75
	_grab.rotation = -a


func _end() -> Vector2:
	var a := _idle_angle()
	return Vector2(sin(a), cos(a)) * length


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	_place_grab()
	for body in _grab.get_overlapping_bodies():
		var p := body as Player
		if p and not p.is_bubbled() and p.can_grab_swing():
			# Hang where you caught it (but never from the very top).
			var grip := to_local(p.global_position + Player.GRIP_OFFSET)
			rope_length = clampf(grip.length(), length * 0.55, length)
			p.grab_swing(self)


## Where the vine's end is right now (a swinger's hands, or its idle sway).
func _tip() -> Vector2:
	if not Engine.is_editor_hint():
		for n in get_tree().get_nodes_in_group(&"players"):
			var pl := n as Player
			if pl.swing_anchor == self and pl.state_machine.current_name() == &"Swing":
				return to_local(pl.global_position + Player.GRIP_OFFSET)
	return _end()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var tip := _tip()
	# A gently curving vine (quadratic bend) with leaves along it.
	var bend := tip.orthogonal().normalized() * 18.0 * sin(_t * 1.3)
	var pts := PackedVector2Array()
	for i in 17:
		var t := float(i) / 16.0
		pts.append(tip * t + bend * sin(t * PI))
	draw_polyline(pts, th.outline, 8.0)
	draw_polyline(pts, th.foliage_dark, 5.0)
	for i in range(2, 16, 2):
		var p := pts[i]
		var side := 1.0 if i % 4 == 0 else -1.0
		var leaf := Art.ellipse(p + Vector2(side * 9.0, 0), 9.0, 5.0, 8)
		Art.shape(self, leaf, th.foliage, th.outline, 1.5)
	# Branch knot at the top and a leafy grab-tuft at the end.
	Art.shape(self, Art.ellipse(Vector2.ZERO, 14.0, 9.0, 10), th.ledge_dark, th.outline, 2.0)
	for k in 5:
		var a := -PI * 0.5 + (float(k) - 2.0) * 0.7 + PI
		Art.shape(self, Art.ellipse(tip + Vector2.from_angle(a) * 12.0, 11.0, 6.0, 8), th.foliage if k % 2 == 0 else th.foliage_dark, th.outline, 1.5)
	if Engine.is_editor_hint():
		draw_arc(Vector2.ZERO, length, PI * 0.5 - 1.45, PI * 0.5 + 1.45, 24, Color(1, 1, 1, 0.3), 2.0)
