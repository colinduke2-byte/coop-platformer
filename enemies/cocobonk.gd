class_name Cocobonk
extends Enemy
## COCOBONK: a cheeky monkey who sits on branches and ledges and LOBS coconuts
## in high arcs at the nearest player (it raises the coconut over its head
## first - the tell, with an "Ooh!"). Coconuts can be punched back! Takes two
## hits - stomp it, uppercut it, or knock its own coconut into it.

@export var sight := 900.0
@export var reload := 2.2
@export var windup := 0.55

const FUR := Color("8a5a36")
const FUR_DARK := Color("6a4228")
const FACE := Color("f0c79a")
const COCO := Color("6b4a2e")

var _cool := 1.0
var _wind := 0.0


func _init() -> void:
	body_size = Vector2(46, 50)
	health = 2
	lum_drop = 3


func _behave(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, 800.0 * delta)
	var p := nearest_player(sight, 700.0)
	if p == null:
		return
	face(p)
	if _wind > 0.0:
		_wind -= delta
		if _wind <= 0.0:
			_throw(p)
		return
	_cool -= delta
	if _cool <= 0.0 and is_on_floor():
		_wind = windup


func _throw(p: Player) -> void:
	_cool = reload
	squash(Vector2(1.2, 0.85))
	var from := global_position + Vector2(facing * 10.0, -70.0)
	var to := p.global_position + Vector2(p.velocity.x * 0.3, -30.0)
	var d := to - from
	var t := clampf(absf(d.x) / 500.0, 0.6, 1.3)
	var g := 2400.0 * 0.5
	var v := Vector2(d.x / t, (d.y - 0.5 * g * t * t) / t)
	var shot := shoot(Vector2(10, -70), Vector2(v.x * facing, v.y), v.length(), 0.5)
	shot.velocity = v
	shot.color = COCO


func _draw_body(ci: CanvasItem) -> void:
	var bob := sin(anim_time * 4.0) * 2.0
	# Curly tail behind.
	var tail := PackedVector2Array()
	for i in 12:
		var t := float(i) / 11.0
		tail.append(Vector2(-18 - t * 22.0, -14 - t * 30.0) + Vector2(cos(t * 7.0), sin(t * 7.0)) * 8.0 * t)
	ci.draw_polyline(tail, OUTLINE, 7.0)
	ci.draw_polyline(tail, FUR, 4.0)
	Enemy.draw_foot(ci, Vector2(-10, -3), FACE)
	Enemy.draw_foot(ci, Vector2(12, -3), FACE)
	# Body and head.
	Art.shape(ci, Art.ellipse(Vector2(0, -22 + bob), 20, 20, 18), FUR, OUTLINE, 2.5)
	ci.draw_colored_polygon(Art.ellipse(Vector2(4, -18 + bob), 11, 12, 12), FACE)
	var head := Vector2(4, -50 + bob)
	for d: float in [-1.0, 1.0]:  # ears
		Art.shape(ci, Art.ellipse(head + Vector2(d * 18.0, -2), 7, 8, 10), FACE, OUTLINE, 2.0)
	Art.shape(ci, Art.ellipse(head, 17, 16, 18), FUR, OUTLINE, 2.5)
	Art.shape(ci, Art.ellipse(head + Vector2(5, 4), 12, 10, 14), FACE, OUTLINE, 1.5)
	var squint := is_stunned()
	Enemy.draw_eye(ci, head + Vector2(0, -2), 3.5, Vector2(1, 0), 0.0, squint)
	Enemy.draw_eye(ci, head + Vector2(10, -2), 3.5, Vector2(1, 0), 0.0, squint)
	if _wind > 0.0:
		ci.draw_circle(head + Vector2(8, 9), 4.0, OUTLINE)  # "Ooh!"
	else:
		ci.draw_arc(head + Vector2(7, 6), 5.0, 0.2, PI - 0.2, 8, OUTLINE, 2.0)
	# Arms: both up holding a coconut during the tell.
	var up := _wind > 0.0
	for d: float in [-1.0, 1.0]:
		var sh := Vector2(d * 14.0, -30 + bob)
		var hand := sh + (Vector2(d * 4.0, -42.0) if up else Vector2(d * 10.0, 16.0))
		ci.draw_line(sh, hand, OUTLINE, 8.0)
		ci.draw_line(sh, hand, FUR, 5.0)
	if up:
		Art.shape(ci, Art.ellipse(Vector2(0, -78 + bob), 12, 11, 14), COCO, OUTLINE, 2.0)
		ci.draw_circle(Vector2(-3, -81 + bob), 2.0, FUR_DARK)
