class_name Yetling
extends Enemy
## YETLING: a fluffy little yeti kid with a runny nose. Keeps its distance and
## LOBS snowballs in high arcs at the nearest player (it winds up its arm
## first - the tell). Snowballs can be punched back! Takes two hits (punch,
## stomp, slide) - it's well padded.

@export var sight := 820.0
@export var reload := 2.0
@export var windup := 0.5
@export var keep_away := 300.0          ## backs off if you get closer than this
@export var walk_speed := 80.0

const FUR := Color("eef4fb")
const FUR_DARK := Color("b9cbe0")
const FACE := Color("8fb7e8")
const MOUTH := Color("3a2a4a")

var _cool := 1.2
var _wind := 0.0


func _init() -> void:
	body_size = Vector2(46, 52)
	health = 2
	lum_drop = 3


func _behave(delta: float) -> void:
	var p := nearest_player(sight, 500.0)
	if p == null:
		velocity.x = move_toward(velocity.x, 0.0, 600.0 * delta)
		return
	face(p)
	var dx := p.global_position.x - global_position.x
	if _wind > 0.0:
		velocity.x = 0.0
		_wind -= delta
		if _wind <= 0.0:
			_throw(p)
		return
	# Shuffle away if you crowd it (but never off a ledge).
	if absf(dx) < keep_away and floor_ahead(-facing) and not wall_ahead(-facing):
		velocity.x = -facing * walk_speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, 600.0 * delta)
	_cool -= delta
	if _cool <= 0.0 and is_on_floor():
		_wind = windup


func _throw(p: Player) -> void:
	_cool = reload
	squash(Vector2(1.2, 0.85))
	var from := global_position + Vector2(facing * 18.0, -60.0)
	var to := p.global_position + Vector2(p.velocity.x * 0.3, -30.0)
	var d := to - from
	var t := clampf(absf(d.x) / 520.0, 0.6, 1.3)
	var g := 2400.0 * 0.5
	var v := Vector2(d.x / t, (d.y - 0.5 * g * t * t) / t)
	var shot := shoot(Vector2(18, -60), Vector2(v.x * facing, v.y), v.length(), 0.5)
	shot.velocity = v
	shot.color = Color("f4fbff")


func _draw_body(ci: CanvasItem) -> void:
	var step := sin(anim_time * 10.0) * 3.0 if absf(velocity.x) > 1.0 else 0.0
	Enemy.draw_foot(ci, Vector2(-10 + step, -3), FACE)
	Enemy.draw_foot(ci, Vector2(10 - step, -3), FACE)
	# Shaggy round body.
	var pts := PackedVector2Array()
	for i in 24:
		var a := TAU * i / 24.0
		var r := 27.0 + (4.0 if i % 2 == 0 else 0.0)
		pts.append(Vector2(0, -30) + Vector2(cos(a) * r, sin(a) * r * 1.05))
	Art.shape(ci, pts, FUR, OUTLINE, 2.5)
	ci.draw_colored_polygon(Art.ellipse(Vector2(6, -18), 16, 10, 12), FUR_DARK)
	# Face patch, eyes, grin with two teeth, runny nose.
	Art.shape(ci, Art.ellipse(Vector2(8, -36), 15, 12, 16), FACE, OUTLINE, 2.0)
	var squint := is_stunned()
	Enemy.draw_eye(ci, Vector2(3, -40), 3.5, Vector2(1, 0), 0.2, squint)
	Enemy.draw_eye(ci, Vector2(14, -40), 3.5, Vector2(1, 0), 0.2, squint)
	ci.draw_arc(Vector2(9, -32), 6.0, 0.2, PI - 0.2, 10, MOUTH, 3.0)
	ci.draw_rect(Rect2(6, -30, 3, 3), Color.WHITE)
	ci.draw_rect(Rect2(11, -30, 3, 3), Color.WHITE)
	ci.draw_circle(Vector2(12, -34), 2.0, Color("7fd0ff"))
	# Throwing arm: winds back during the tell, holding a snowball.
	var wind_f := 1.0 - _wind / windup if _wind > 0.0 else 0.0
	var ang := lerpf(1.0, -2.2, wind_f)
	var sh := Vector2(20, -22)
	var hand := sh + Vector2(cos(ang), sin(ang)) * 24.0
	ci.draw_line(sh, hand, OUTLINE, 11.0)
	ci.draw_line(sh, hand, FUR, 7.0)
	if _wind > 0.0:
		Art.shape(ci, Art.ellipse(hand, 9.0, 9.0, 12), Color("f4fbff"), OUTLINE, 2.0)
	# Horns / tuft.
	Art.shape(ci, PackedVector2Array([Vector2(-10, -58), Vector2(-4, -70), Vector2(2, -58)]), FUR_DARK, OUTLINE, 2.0)
