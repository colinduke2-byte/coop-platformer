class_name Pufferfin
extends Enemy
## PUFFERFIN: a round little fish swimming back and forth along `travel`.
## Every few seconds it gulps water and PUFFS UP into a spiky ball (the tell: it
## shivers first). Puffed, it's all spikes - don't touch it! Small, a punch or a
## stomp pops it.

@export var travel := Vector2(300, 0)
@export var speed := 90.0
@export var phase := 0.0
@export var puff_every := 2.6
@export var puff_time := 1.5

const SKIN := Color("ffcf5a")
const BELLY := Color("fff2c0")
const SPIKE := Color("e8a23a")

var _home := Vector2.ZERO
var _t := 0.0
var _puff := 0.0     ## 0 small .. 1 puffed (animated)


func _init() -> void:
	body_size = Vector2(44, 40)
	uses_gravity = false
	lum_drop = 2


func _setup() -> void:
	_home = global_position
	_t = phase * (puff_every + puff_time)


func is_puffed() -> bool:
	return fposmod(_t, puff_every + puff_time) >= puff_every


func _behave(delta: float) -> void:
	_t += delta
	var period := 2.0 * travel.length() / maxf(speed, 1.0)
	var f := fposmod(_t, period) / period if period > 0.0 else 0.0
	var k := f * 2.0 if f < 0.5 else 2.0 - f * 2.0
	var target := _home + travel * (0.5 - 0.5 * cos(k * PI)) + Vector2(0, sin(_t * 2.0) * 8.0)
	var slow := 0.35 if is_puffed() else 1.0
	velocity = (target - global_position) / maxf(delta, 0.001) * slow
	if absf(velocity.x) > 1.0:
		facing = 1 if velocity.x > 0.0 else -1
	_puff = move_toward(_puff, 1.0 if is_puffed() else 0.0, delta * 6.0)
	stompable = _puff < 0.5


func blocks_hit(_by: Player, kind: HitKind) -> bool:
	return _puff >= 0.5 and kind != HitKind.PROJECTILE  # all spikes


func _draw_body(ci: CanvasItem) -> void:
	var r := lerpf(18.0, 34.0, _puff)
	var c := Vector2(0, -20)
	var shiver := 0.0
	var cyc := fposmod(_t, puff_every + puff_time)
	if cyc > puff_every - 0.4 and cyc < puff_every:
		shiver = sin(anim_time * 70.0) * 2.0
	c.x += shiver
	if _puff > 0.05:
		for i in 12:
			var a := TAU * i / 12.0
			var d := Vector2(cos(a), sin(a))
			Art.shape(ci, PackedVector2Array([c + d.orthogonal() * 5.0 + d * r * 0.9, c + d * (r + 12.0 * _puff), c - d.orthogonal() * 5.0 + d * r * 0.9]), SPIKE, OUTLINE, 1.5)
	Art.shape(ci, Art.ellipse(c, r, r * lerpf(0.82, 1.0, _puff), 20), SKIN, OUTLINE, 3.0)
	Art.shape(ci, Art.ellipse(c + Vector2(2, r * 0.35), r * 0.7, r * 0.45, 16), BELLY, OUTLINE, 0.0)
	# Tail fin and a little side fin.
	Art.shape(ci, PackedVector2Array([c + Vector2(-r + 2, 0), c + Vector2(-r - 14, -10), c + Vector2(-r - 14, 10)]), SPIKE, OUTLINE, 2.0)
	Art.shape(ci, Art.ellipse(c + Vector2(-2, 4), 7, 4, 10), SPIKE, OUTLINE, 1.5)
	Enemy.draw_eye(ci, c + Vector2(r * 0.45, -r * 0.3), 5.0 + _puff * 2.0, Vector2(1, 0), -0.5 * _puff, is_stunned())
	ci.draw_arc(c + Vector2(r * 0.85, r * 0.1), 4.0, 0.3, 2.6, 8, OUTLINE, 2.0)
