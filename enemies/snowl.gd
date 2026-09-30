class_name Snowl
extends Enemy
## SNOWL: a round snowy owl that glides back and forth overhead. When someone
## passes underneath it puffs up (the tell - "HOO!") and drops a snowball.
## Dodge it, or PUNCH the snowball straight back up at it! Stomp it, or
## uppercut it; it's too high to punch from the ground.

@export var patrol_offset := Vector2(360, 0)
@export var fly_speed := 110.0
@export var drop_range := 700.0          ## how far below it looks
@export var reload := 1.6
@export var tell_time := 0.4

const FEATHER := Color("f4fbff")
const FEATHER_DARK := Color("c7dcef")
const BEAK := Color("ffb13f")
const EYE := Color("ffd23f")

var _home := Vector2.ZERO
var _t := 0.0
var _dir := 1.0
var _cool := 0.8
var _tell := 0.0


func _init() -> void:
	body_size = Vector2(48, 44)
	uses_gravity = false
	lum_drop = 2


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	_t += delta
	_cool -= delta
	if _tell > 0.0:
		_tell -= delta
		velocity = Vector2.ZERO
		if _tell <= 0.0:
			_drop()
		return
	# Glide between home and home + patrol_offset, bobbing.
	var a := _home
	var b := _home + patrol_offset
	var target := b if _dir > 0.0 else a
	var to := target - global_position
	if to.length() < 12.0:
		_dir = -_dir
	var v := to.normalized() * fly_speed
	velocity = Vector2(v.x, v.y + sin(_t * 3.0) * 30.0)
	if absf(v.x) > 1.0:
		facing = 1 if v.x > 0.0 else -1
	if _cool <= 0.0:
		for n in get_tree().get_nodes_in_group(&"players"):
			var p := n as Player
			var dx := p.global_position.x - global_position.x
			var dy := p.global_position.y - global_position.y
			if not p.is_bubbled() and absf(dx) < 60.0 + absf(p.velocity.x) * 0.25 and dy > 60.0 and dy < drop_range:
				_tell = tell_time
				squash(Vector2(1.25, 1.2))
				break


func _drop() -> void:
	_cool = reload
	var shot := shoot(Vector2(0, 6), Vector2.DOWN, 60.0, 0.5)
	shot.color = FEATHER
	squash(Vector2(0.85, 1.15))


func _draw_body(ci: CanvasItem) -> void:
	var puff := 1.0 + (0.15 if _tell > 0.0 else 0.0)
	var flap := sin(anim_time * (14.0 if _tell <= 0.0 else 30.0))
	# Wings.
	for d: float in [-1.0, 1.0]:
		var base := Vector2(d * 20.0, -26.0)
		var tip := base + Vector2(d * 30.0, -8.0 + flap * 14.0)
		Art.shape(ci, PackedVector2Array([base + Vector2(0, -10), tip, base + Vector2(d * 8.0, 10.0)]), FEATHER_DARK, OUTLINE, 2.0)
	# Round body with ear tufts.
	Art.shape(ci, Art.ellipse(Vector2(0, -24), 25.0 * puff, 24.0 * puff, 20), FEATHER, OUTLINE, 2.5)
	for d: float in [-1.0, 1.0]:
		Art.shape(ci, PackedVector2Array([Vector2(d * 10, -44), Vector2(d * 20, -58), Vector2(d * 20, -42)]), FEATHER, OUTLINE, 2.0)
	for i in 3:  # speckles
		ci.draw_circle(Vector2(-8 + i * 8, -12 + (i % 2) * 4), 2.2, FEATHER_DARK)
	# Big goggle eyes (wide open during the tell) and a beak.
	for d: float in [-1.0, 1.0]:
		var c := Vector2(4 + d * 9.0, -30)
		Art.shape(ci, Art.ellipse(c, 8.0, 8.0, 14), EYE, OUTLINE, 2.0)
		ci.draw_circle(c + Vector2(1.5, 1), 4.5 if _tell > 0.0 else 3.0, OUTLINE)
		if is_stunned():
			ci.draw_arc(c, 5.0, 0, TAU * 0.8, 8, OUTLINE, 1.5)
	Art.shape(ci, PackedVector2Array([Vector2(1, -24), Vector2(9, -24), Vector2(5, -15)]), BEAK, OUTLINE, 1.5)
	# Little talons.
	for d: float in [-1.0, 1.0]:
		ci.draw_line(Vector2(d * 7, -2), Vector2(d * 9, 4), BEAK, 3.0)
