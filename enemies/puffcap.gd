class_name Puffcap
extends Enemy
## PUFFCAP: a sleepy mushroom rooted to the spot. Every few seconds it swells
## up (the tell) and puffs out a ring of spores that bubbles anyone inside.
## Punch or stomp it between puffs. Offset `phase` to make a row of them
## puff in sequence.

enum St { IDLE, SWELL, PUFF }

@export var idle_time := 1.8
@export var swell_time := 0.6
@export var puff_time := 0.7
@export var puff_radius := 120.0
@export var phase := 0.0                    ## s offset into the cycle

const CAP := Color("b064d8")
const CAP_DARK := Color("7e3ea8")
const SPOT := Color("f7e8ff")
const STEM := Color("f1e4c8")
const SPORE := Color(0.7, 0.95, 0.4, 0.55)

var st := St.IDLE
var _timer := 0.0
var _hit_cd := {}


func _init() -> void:
	body_size = Vector2(46, 44)
	lum_drop = 2
	knockback_scale = 0.0


func _setup() -> void:
	_timer = idle_time - fposmod(phase, idle_time + swell_time + puff_time)


func _behave(delta: float) -> void:
	velocity.x = 0.0
	_timer -= delta
	for p in _hit_cd.keys():
		_hit_cd[p] -= delta
		if _hit_cd[p] <= 0.0:
			_hit_cd.erase(p)
	match st:
		St.IDLE:
			stompable = true
			if _timer <= 0.0:
				st = St.SWELL
				_timer = swell_time
		St.SWELL:
			if _timer <= 0.0:
				st = St.PUFF
				_timer = puff_time
				squash(Vector2(1.35, 0.7))
				EventBus.enemy_shot.emit(self)
		St.PUFF:
			stompable = false
			var r := _cloud_radius()
			var c := global_position + Vector2(0, -24)
			for n in get_tree().get_nodes_in_group(&"players"):
				var pl := n as Player
				if pl.is_bubbled() or _hit_cd.has(pl):
					continue
				if (pl.global_position + Vector2(0, -30)).distance_to(c) < r:
					_hit_cd[pl] = 1.0
					pl.hurt()
			if _timer <= 0.0:
				st = St.IDLE
				_timer = idle_time


func _cloud_radius() -> float:
	var t := 1.0 - _timer / puff_time
	return puff_radius * clampf(t * 1.6, 0.2, 1.0)


func _draw_body(ci: CanvasItem) -> void:
	var swell := 0.0
	if st == St.SWELL:
		swell = 1.0 - _timer / swell_time
	var wob := sin(anim_time * 40.0) * 1.5 * swell
	# Stem.
	Art.shape(ci, PackedVector2Array([Vector2(-10, 0), Vector2(-8, -24), Vector2(8, -24), Vector2(10, 0)]), STEM, OUTLINE, 2.5)
	# Sleepy face on the stem.
	var sleepy := st == St.IDLE
	Enemy.draw_eye(ci, Vector2(-2, -13), 3.0, Vector2(1, 0), 0.0, sleepy)
	Enemy.draw_eye(ci, Vector2(6, -13), 3.0, Vector2(1, 0), 0.0, sleepy)
	if st == St.SWELL:
		Art.shape(ci, Art.ellipse(Vector2(2, -6), 3, 3.5, 10), OUTLINE, OUTLINE, 0.0)
	# Cap (swells before a puff).
	var s := 1.0 + swell * 0.3
	var cap := PackedVector2Array()
	for i in 17:
		var a := PI + PI * float(i) / 16.0
		cap.append(Vector2(wob + cos(a) * 30.0 * s, -24 + sin(a) * 24.0 * s))
	Art.shape(ci, cap, CAP, OUTLINE, 3.0)
	ci.draw_line(Vector2(-30 * s, -24), Vector2(30 * s, -24), CAP_DARK, 4.0)
	for sp: Vector3 in [Vector3(-14, -36, 6), Vector3(6, -42, 5), Vector3(18, -30, 4), Vector3(-2, -30, 3)]:
		ci.draw_circle(Vector2(sp.x * s + wob, sp.y * s + (1.0 - s) * -24.0), sp.z * s, SPOT)
	# The spore cloud.
	if st == St.PUFF:
		var r := _cloud_radius()
		var fade := clampf(_timer / puff_time * 1.5, 0.0, 1.0)
		for k in 10:
			var a := TAU * float(k) / 10.0 + anim_time
			var p := Vector2(0, -24) + Vector2(cos(a), sin(a)) * r * 0.75
			ci.draw_circle(p, r * 0.3, Color(SPORE, SPORE.a * fade))
		ci.draw_circle(Vector2(0, -24), r * 0.5, Color(SPORE, 0.3 * fade))
