class_name Eelectra
extends Enemy
## EELECTRA: an eel hiding in a hole in the rock. When someone swims or walks
## close, it crackles (the tell), LUNGES out `reach` px toward them, waits a
## moment, then slides back in. It can only be hit while it's out. Place it at
## the hole's mouth and set `start_facing` toward the open side.

@export var reach := 220.0
@export var sight := 380.0
@export var out_time := 0.9
@export var rest := 1.4

enum St { HIDE, TELL, LUNGE, OUT, BACK }

const SKIN := Color("4fd6b0")
const BELLY := Color("e8ffb0")

var st := St.HIDE
var _home := Vector2.ZERO
var _timer := 0.0
var _ext := 0.0   ## 0 in the hole .. 1 fully out


func _init() -> void:
	body_size = Vector2(46, 30)
	uses_gravity = false
	health = 1
	lum_drop = 2


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	_timer -= delta
	match st:
		St.HIDE:
			var p := nearest_player(sight, 220.0)
			if p and signf(p.global_position.x - _home.x) == float(facing) and _timer <= 0.0:
				st = St.TELL
				_timer = 0.5
		St.TELL:
			if _timer <= 0.0:
				st = St.LUNGE
				Audio.play("punch_big", -10.0, 1.8)
		St.LUNGE:
			_ext = move_toward(_ext, 1.0, delta * 5.0)
			if _ext >= 1.0:
				st = St.OUT
				_timer = out_time
		St.OUT:
			if _timer <= 0.0:
				st = St.BACK
		St.BACK:
			_ext = move_toward(_ext, 0.0, delta * 2.5)
			if _ext <= 0.0:
				st = St.HIDE
				_timer = rest
	contact_hurts = _ext > 0.2
	var target := _home + Vector2(facing * reach * _ext, 0)
	velocity = (target - global_position) / maxf(delta, 0.001)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return _ext < 0.4   # tucked away in its hole


func _draw_body(ci: CanvasItem) -> void:
	if _ext <= 0.02 and st != St.TELL:
		Enemy.draw_eye(ci, Vector2(-6, -16), 4.0, Vector2(1, 0), 0.5, false)  # peeking out
		return
	# Body trails back into the hole (to the left in local space).
	var len := reach * _ext + 20.0
	var pts := PackedVector2Array()
	for i in 12:
		var t := float(i) / 11.0
		pts.append(Vector2(-len * t, -15 + sin(anim_time * 10.0 + t * 8.0) * 5.0 * t))
	ci.draw_polyline(pts, OUTLINE, 24.0)
	ci.draw_polyline(pts, SKIN, 18.0)
	ci.draw_polyline(pts, BELLY, 6.0)
	Art.shape(ci, Art.ellipse(Vector2(4, -15), 18, 13, 16), SKIN, OUTLINE, 3.0)
	Enemy.draw_eye(ci, Vector2(8, -21), 5.0, Vector2(1, 0), 0.8, is_stunned())
	ci.draw_line(Vector2(10, -8), Vector2(20, -10), OUTLINE, 2.0)
	if st == St.TELL or st == St.LUNGE:
		for k in 4:
			var a := anim_time * 20.0 + k * 1.6
			ci.draw_line(Vector2(0, -15) + Vector2(cos(a), sin(a)) * 12.0, Vector2(0, -15) + Vector2(cos(a), sin(a)) * 26.0, Color("aef6ff"), 2.0)
