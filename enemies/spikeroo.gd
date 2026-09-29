class_name Spikeroo
extends Enemy
## SPIKEROO: a chestnut-burr critter with a back full of spikes. Stomping or
## ground-pounding it hurts YOU - punch it or slide into it instead.
## Shuffles along; when it sees someone it huffs and puffs its spikes up.

@export var walk_speed := 70.0
@export var sight := 220.0

const BODY := Color("8f5a2e")
const SPIKE := Color("f0d9a8")
const FACE := Color("f2c9a0")

var _puff := 0.0


func _init() -> void:
	body_size = Vector2(46, 34)
	stompable = false


func _behave(delta: float) -> void:
	patrol(walk_speed)
	var p := nearest_player(sight, 80.0)
	_puff = move_toward(_puff, 1.0 if p else 0.0, delta * 4.0)


func blocks_hit(by: Player, kind: HitKind) -> bool:
	if kind == HitKind.POUND and by:
		by.hurt()  # landing butt-first on spikes: ouch
		return true
	return false


func _draw_body(ci: CanvasItem) -> void:
	var step := sin(anim_time * 10.0) * 4.0 if absf(velocity.x) > 1.0 else 0.0
	Enemy.draw_foot(ci, Vector2(-10 + step, -3), BODY.darkened(0.4))
	Enemy.draw_foot(ci, Vector2(10 - step, -3), BODY.darkened(0.3))
	var len := 12.0 + 6.0 * _puff
	for i in 9:
		var a := PI + 0.25 + (PI - 0.5) * float(i) / 8.0
		var base := Vector2(cos(a) * 20.0, -18.0 + sin(a) * 16.0)
		var tip := Vector2(cos(a) * (20.0 + len), -18.0 + sin(a) * (16.0 + len))
		var side := Vector2(-sin(a), cos(a)) * 5.0
		Art.shape(ci, PackedVector2Array([base - side, tip, base + side]), SPIKE, OUTLINE, 2.0)
	Art.shape(ci, Art.ellipse(Vector2(0, -17), 24, 17), BODY, OUTLINE)
	Art.shape(ci, Art.ellipse(Vector2(14, -14), 12, 10), FACE, OUTLINE, 2.0)
	ci.draw_circle(Vector2(25, -15), 4.0, OUTLINE)
	Enemy.draw_eye(ci, Vector2(12, -20), 4.0, Vector2(1, 0), 0.8 * _puff)
