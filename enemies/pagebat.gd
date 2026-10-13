class_name Pagebat
extends Enemy
## PAGEBAT: a bat made of loose pages. It flaps in lazy circles; when a dreamer comes below it
## stiffens (the tell) and DIVES, then flutters back up to its perch. Stomp or punch it.
## Gravity-flip aware: it dives towards whichever side is "down".

enum St { HOVER, TELL, DIVE, RETURN }

@export var sight := 520.0
@export var dive_speed := 520.0
@export var hover_radius := 36.0

const PAPER := Color("fff0cc")
const PAPER_DARK := Color("d8c08a")
const INK := Color("2b2a5c")

var st := St.HOVER
var _home := Vector2.INF
var _t := 0.0
var _target := Vector2.ZERO
var _cool := 1.0


func _init() -> void:
	body_size = Vector2(38, 30)
	health = 1
	lum_drop = 2
	gravity = 0.0


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	if _home == Vector2.INF:
		_home = global_position
	_t += delta
	_cool = maxf(_cool - delta, 0.0)
	var vel_world := Vector2.ZERO
	match st:
		St.HOVER:
			var goal := _home + Vector2(cos(_t * 1.6), sin(_t * 2.4) * 0.6) * hover_radius
			vel_world = (goal - global_position) * 3.0
			var p := nearest_player(sight, 700.0)
			if p != null and _cool <= 0.0 and (p.global_position.y - global_position.y) * float(gdir) > 80.0:
				_target = p.global_position + Vector2(0, -20)
				face(p)
				st = St.TELL
				_t = 0.0
		St.TELL:
			vel_world = Vector2.ZERO
			if _t > 0.4:
				st = St.DIVE
				_t = 0.0
		St.DIVE:
			var d := _target - global_position
			vel_world = d.normalized() * dive_speed
			if d.length() < 30.0 or _t > 1.2 or is_on_floor() or is_on_wall():
				st = St.RETURN
				_t = 0.0
		St.RETURN:
			var d := _home - global_position
			vel_world = d.normalized() * 220.0
			if d.length() < 24.0:
				st = St.HOVER
				_cool = 1.6
	# velocity is logical (y+ towards the floor): convert the world-space plan.
	velocity = Vector2(vel_world.x, vel_world.y * float(gdir))
	if absf(vel_world.x) > 8.0:
		facing = 1 if vel_world.x > 0.0 else -1


func _draw_body(ci: CanvasItem) -> void:
	var flap := sin(anim_time * (22.0 if st == St.DIVE else 11.0))
	var stiff := st == St.TELL
	for side in [-1, 1]:
		var wing := PackedVector2Array([Vector2(0, -16), Vector2(side * 30.0, -24.0 - (0.0 if stiff else flap * 12.0)),
				Vector2(side * 38.0, -8.0 - (0.0 if stiff else flap * 8.0)), Vector2(side * 18.0, -2)])
		Art.shape(ci, wing, PAPER, OUTLINE, 2.5)
		ci.draw_line(wing[0].lerp(wing[1], 0.5), wing[3].lerp(wing[2], 0.5), Color(INK, 0.4), 1.5)
	Art.shape(ci, Art.ellipse(Vector2(0, -14), 13, 13, 14), PAPER_DARK, OUTLINE, 3.0)
	Art.shape(ci, PackedVector2Array([Vector2(-10, -24), Vector2(-7, -36), Vector2(-2, -25)]), PAPER_DARK, OUTLINE, 2.0)
	Art.shape(ci, PackedVector2Array([Vector2(10, -24), Vector2(7, -36), Vector2(2, -25)]), PAPER_DARK, OUTLINE, 2.0)
	Enemy.draw_eye(ci, Vector2(-4, -15), 3.6, Vector2(facing, 0), 0.0)
	Enemy.draw_eye(ci, Vector2(5, -15), 3.6, Vector2(facing, 0), 0.0)
