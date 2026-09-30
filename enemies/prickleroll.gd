class_name Prickleroll
extends Enemy
## PRICKLEROLL: a hedgehog. Waddles about; when it spots a player ahead it
## curls into a spiky ball (the tell) and rolls at them. A rolling ball can't
## be stomped or punched - jump over it! If it rolls into a wall it's dizzy
## for a while: that's your chance. Punch or stomp it while walking or dizzy.

enum St { WALK, CURL, ROLL, DIZZY }

@export var walk_speed := 70.0
@export var roll_speed := 540.0
@export var sight := 340.0
@export var curl_time := 0.4
@export var max_roll_time := 3.0
@export var dizzy_time := 1.8

const SPINES := Color("7b5334")
const SPINES_DARK := Color("563620")
const FACE := Color("f1d2a8")

var st := St.WALK
var _timer := 0.0
var _angle := 0.0


func _init() -> void:
	body_size = Vector2(44, 32)
	lum_drop = 2


func _behave(delta: float) -> void:
	_timer -= delta
	match st:
		St.WALK:
			stompable = true
			contact_hurts = true
			patrol(walk_speed)
			var p := nearest_player(sight, 70.0)
			if p and is_on_floor() and signf(p.global_position.x - global_position.x) == facing:
				st = St.CURL
				_timer = curl_time
				velocity = Vector2(0, -220)
		St.CURL:
			stompable = false
			velocity.x = 0.0
			_angle += delta * 6.0 * facing
			if _timer <= 0.0:
				st = St.ROLL
				_timer = max_roll_time
		St.ROLL:
			stompable = false
			_angle += delta * roll_speed / 16.0 * facing
			velocity.x = facing * roll_speed
			if is_on_wall():
				st = St.DIZZY
				_timer = dizzy_time
				stun_timer = dizzy_time  # the base shows stars and lets hits land
				velocity = Vector2(-facing * 180.0, -300.0)
				squash(Vector2(0.6, 1.3))
				EventBus.screen_shake.emit(0.2)
			elif _timer <= 0.0:
				st = St.WALK
		St.DIZZY:
			stompable = true
			if stun_timer <= 0.0:
				st = St.WALK


func _physics_process(delta: float) -> void:
	# While dizzy the base "stun" skips _behave; keep our state in sync.
	if st == St.DIZZY and stun_timer <= 0.0 and not dead:
		st = St.WALK
	super(delta)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return st in [St.CURL, St.ROLL]


func _draw_body(ci: CanvasItem) -> void:
	if st in [St.CURL, St.ROLL]:
		var c := Vector2(0, -18)
		var n := 12
		var pts := PackedVector2Array()
		for i in n * 2:
			var a := _angle + PI * float(i) / n
			var r := 22.0 if i % 2 == 0 else 14.0
			pts.append(c + Vector2(cos(a), sin(a)) * r)
		Art.shape(ci, pts, SPINES, OUTLINE, 2.5)
		Art.shape(ci, Art.ellipse(c, 12, 12, 16), SPINES_DARK, OUTLINE, 0.0)
		ci.draw_arc(c, 8.0, _angle, _angle + 2.5, 8, FACE, 3.0)
		if st == St.ROLL:
			for k in 3:
				ci.draw_line(Vector2(-30 - k * 7, -10 - k * 8), Vector2(-48 - k * 7, -10 - k * 8), Color(1, 1, 1, 0.6), 2.5)
		return
	var step := sin(anim_time * 10.0) * 3.0 if absf(velocity.x) > 1.0 else 0.0
	Enemy.draw_foot(ci, Vector2(-8 + step, -3), SPINES_DARK)
	Enemy.draw_foot(ci, Vector2(10 - step, -3), SPINES_DARK)
	# Spiky back.
	var back := PackedVector2Array()
	for i in 13:
		var a := PI + PI * float(i) / 12.0
		var r := 26.0 if i % 2 == 0 else 18.0
		back.append(Vector2(-4, -8) + Vector2(cos(a) * r, sin(a) * r * 0.9))
	back.append(Vector2(18, -8))
	Art.shape(ci, back, SPINES, OUTLINE, 2.5)
	# Face / snout.
	var face := PackedVector2Array([Vector2(8, -6), Vector2(10, -22), Vector2(20, -20), Vector2(30, -12), Vector2(26, -5)])
	Art.shape(ci, face, FACE, OUTLINE, 2.5)
	ci.draw_circle(Vector2(30, -12), 3.5, OUTLINE)
	var dizzy := st == St.DIZZY
	if dizzy:
		ci.draw_arc(Vector2(16, -15), 3.5, 0, TAU * 0.8, 8, OUTLINE, 1.5)
	else:
		Enemy.draw_eye(ci, Vector2(16, -15), 3.6, Vector2(1, 0), 0.3)
