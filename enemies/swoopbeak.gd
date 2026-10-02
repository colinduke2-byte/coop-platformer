class_name Swoopbeak
extends Enemy
## SWOOPBEAK: a big-billed toucan that flaps back and forth high up. When it
## spots someone below it SQUAWKS (the tell - wings up, beak open) and dives
## at them in a swooping arc, then flaps back up to where it was. Stomp it,
## or punch it as it swoops past.

@export var patrol_offset := Vector2(320, 0)
@export var fly_speed := 120.0
@export var dive_speed := 640.0
@export var sight := 520.0
@export var tell_time := 0.45
@export var reload := 1.4

enum St { PATROL, TELL, DIVE, SWOOP, RETURN }

const BODY := Color("26232e")
const CHEST := Color("fff2c8")
const BEAK := Color("ff9a2f")
const BEAK_TIP := Color("e8452e")
const BEAK_TOP := Color("ffd23f")

var st := St.PATROL
var _home := Vector2.ZERO
var _perch := Vector2.ZERO
var _dir := 1.0
var _t := 0.0
var _timer := 0.0
var _dive_dir := Vector2.ZERO
var _aim := Vector2.ZERO
var _cool := 0.6


func _init() -> void:
	body_size = Vector2(54, 40)
	uses_gravity = false
	lum_drop = 2


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	_t += delta
	_cool -= delta
	match st:
		St.PATROL:
			var target := _home + (patrol_offset if _dir > 0.0 else Vector2.ZERO)
			var to := target - global_position
			if to.length() < 12.0:
				_dir = -_dir
			velocity = to.normalized() * fly_speed + Vector2(0, sin(_t * 3.0) * 30.0)
			if absf(to.x) > 2.0:
				facing = 1 if to.x > 0.0 else -1
			var p := nearest_player(sight)
			if _cool <= 0.0 and p and p.global_position.y > global_position.y + 80.0:
				st = St.TELL
				_timer = tell_time
				face(p)
				squash(Vector2(1.2, 1.2))
		St.TELL:
			velocity = velocity.lerp(Vector2(0, -40), 0.2)
			_timer -= delta
			if _timer <= 0.0:
				var p := nearest_player(sight * 1.4)
				_aim = (p.global_position + Vector2(0, -40)) if p else global_position + Vector2(facing * 200.0, 300.0)
				_perch = global_position
				st = St.DIVE
				_timer = 1.2
		St.DIVE:
			# Straight at where you were standing...
			_timer -= delta
			var to := _aim - global_position
			_dive_dir = to.normalized()
			velocity = _dive_dir * dive_speed
			facing = 1 if velocity.x >= 0.0 else -1
			if to.length() < 24.0 or _timer <= 0.0 or is_on_floor() or is_on_wall():
				st = St.SWOOP
				_timer = 0.6
		St.SWOOP:
			# ...then curve back up and onward.
			_timer -= delta
			_dive_dir = _dive_dir.lerp(Vector2(facing, -0.8).normalized(), 5.0 * delta)
			velocity = _dive_dir * dive_speed * 0.8
			if _timer <= 0.0 or is_on_wall():
				st = St.RETURN
		St.RETURN:
			var to := _perch - global_position
			velocity = to.normalized() * fly_speed * 1.6
			if absf(to.x) > 2.0:
				facing = 1 if to.x > 0.0 else -1
			if to.length() < 16.0:
				st = St.PATROL
				_cool = reload


func _draw_body(ci: CanvasItem) -> void:
	var diving := st == St.DIVE or st == St.SWOOP
	var flap := sin(anim_time * (10.0 if not diving else 2.0))
	var tilt := 0.5 if diving and velocity.y > 0.0 else (-0.3 if diving else 0.0)
	ci.draw_set_transform(Vector2(0, -20), tilt, Vector2.ONE)
	# Tail and far wing.
	Art.shape(ci, PackedVector2Array([Vector2(-22, -2), Vector2(-46, 4), Vector2(-44, 12), Vector2(-20, 8)]), BODY, OUTLINE, 2.0)
	var wing_up := -24.0 if st == St.TELL else flap * 18.0
	if diving:
		wing_up = -6.0
	Art.shape(ci, PackedVector2Array([Vector2(-10, -6), Vector2(-28, -10 + wing_up), Vector2(8, -4)]), BODY.lightened(0.1), OUTLINE, 2.0)
	# Body with a creamy chest.
	Art.shape(ci, Art.ellipse(Vector2(0, 0), 24, 18, 18), BODY, OUTLINE, 2.5)
	ci.draw_colored_polygon(Art.ellipse(Vector2(12, 2), 10, 12, 12), CHEST)
	# The huge beak (open during the tell).
	var open := 6.0 if st == St.TELL else 0.0
	Art.shape(ci, PackedVector2Array([Vector2(16, -10), Vector2(56, -6 - open * 0.3), Vector2(48, -1), Vector2(16, -2)]), BEAK, OUTLINE, 2.0)
	ci.draw_line(Vector2(18, -9), Vector2(50, -6 - open * 0.3), BEAK_TOP, 3.0)
	Art.shape(ci, PackedVector2Array([Vector2(16, -1 + open), Vector2(48, 1 + open), Vector2(16, 5 + open)]), BEAK_TIP, OUTLINE, 2.0)
	Enemy.draw_eye(ci, Vector2(10, -8), 4.0, Vector2(1, 0), 0.6 if st != St.PATROL else 0.0, is_stunned())
	# Near wing.
	Art.shape(ci, PackedVector2Array([Vector2(-6, 0), Vector2(-26, -4 + wing_up * 1.1), Vector2(10, 4)]), BODY, OUTLINE, 2.0)
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
