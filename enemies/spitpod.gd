class_name Spitpod
extends Enemy
## SPITPOD: rooted plant that turns to face players in range, swells up, and
## spits a seed at them. Punch the seed back to knock it out with its own shot!
## Stomp works too. Set `lob` to arc the seeds over walls.

@export var sight := 720.0
@export var fire_interval := 2.2
@export var windup := 0.45
@export var seed_speed := 400.0
@export var lob := false

const STEM := Color("3e9c3a")
const HEAD := Color("ff7eb6")
const HEAD_DARK := Color("d4508c")
const LEAF := Color("5cc94f")

var _cool := 1.0
var _wind := 0.0
var _aim := Vector2.LEFT


func _init() -> void:
	body_size = Vector2(40, 56)
	lum_drop = 2


func _behave(delta: float) -> void:
	velocity.x = 0.0
	var p := nearest_player(sight)
	if p == null:
		_wind = 0.0
		_cool = maxf(_cool, 0.5)
		return
	face(p)
	_aim = (p.global_position + Vector2(0, -30) - (global_position + Vector2(0, -44))).normalized()
	if _wind > 0.0:
		_wind -= delta
		if _wind <= 0.0:
			_spit(p)
		return
	_cool -= delta
	if _cool <= 0.0:
		_wind = windup


func _spit(p: Player) -> void:
	_cool = fire_interval
	squash(Vector2(1.25, 0.85))
	if lob:
		var dx := p.global_position.x - global_position.x
		shoot(Vector2(16, -44), Vector2(signf(dx) * 0.55, -1.0), clampf(absf(dx) * 1.3, 350.0, 700.0), 0.5)
	else:
		var local_aim := Vector2(absf(_aim.x), _aim.y)
		shoot(Vector2(16, -44) + local_aim * 10.0, _aim, seed_speed)


func _draw_body(ci: CanvasItem) -> void:
	var sway := sin(anim_time * 2.0) * 3.0
	var swell := 1.0 + (1.0 - _wind / windup) * 0.25 if _wind > 0.0 else 1.0
	ci.draw_line(Vector2(0, 0), Vector2(sway, -34), OUTLINE, 9.0)
	ci.draw_line(Vector2(0, 0), Vector2(sway, -34), STEM, 5.0)
	for s: float in [-1.0, 1.0]:
		Art.shape(ci, Art.ellipse(Vector2(s * 14.0, -8), 14, 6), LEAF, OUTLINE, 2.0)
	var head := Vector2(sway, -44)
	Art.shape(ci, Art.ellipse(head, 20 * swell, 17 * swell), HEAD, OUTLINE)
	for i in 5:
		var a := -PI * 0.5 + (float(i) - 2.0) * 0.5
		Art.shape(ci, Art.ellipse(head + Vector2.from_angle(a) * 20.0 * swell, 6, 5, 10), HEAD_DARK, OUTLINE, 1.5)
	# Mouth: round tube aimed forward.
	var look := Vector2(absf(_aim.x), _aim.y)
	Art.shape(ci, Art.ellipse(head + look * 16.0, 8, 8, 12), HEAD_DARK, OUTLINE, 2.0)
	ci.draw_circle(head + look * 18.0, 4.0, OUTLINE)
	Enemy.draw_eye(ci, head + Vector2(-2, -7), 5.0, look, 0.9)
