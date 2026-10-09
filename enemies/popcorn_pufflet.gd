class_name PopcornPufflet
extends Enemy
## POPCORN PUFFLET: a plump little bag of kernels that shivers, then POPS - lobbing a fan of
## popcorn up and over. The kernels come down with gravity (so after a flip they fall the
## other way!). It's stompable; it deflates for a moment after popping.

@export var pop_time := 2.6
@export var kernels := 5
@export var sight := 760.0

const BAG := Color("fff4e0")
const STRIPE := Color("e8426f")
const CORN := Color("ffe9a0")

var _wait := 0.0
var _shiver := 0.0
var _deflate := 0.0


func _init() -> void:
	body_size = Vector2(38, 42)
	health = 1
	lum_drop = 2


func _setup() -> void:
	_wait = randf_range(0.6, pop_time)


func _behave(delta: float) -> void:
	velocity.x = 0.0
	_deflate = maxf(_deflate - delta, 0.0)
	if _shiver > 0.0:
		_shiver -= delta
		if _shiver <= 0.0:
			_pop()
		return
	_wait -= delta
	if _wait <= 0.0 and _deflate <= 0.0 and nearest_player(sight, 700.0) != null:
		_shiver = 0.5
		_wait = pop_time * randf_range(0.9, 1.25)


func _pop() -> void:
	var target := nearest_player()
	if target:
		face(target)
	for i in kernels:
		var a := lerpf(-0.9, 0.9, float(i) / maxf(kernels - 1, 1)) + float(facing) * 0.5
		var p := shoot(Vector2(0, -34), Vector2(sin(a), -cos(a) * 0.9 * gdir), 360.0 + 40.0 * (i % 2), 0.55)
		p.color = CORN
	_deflate = 1.0
	squash(Vector2(1.5, 0.6))


func _draw_body(ci: CanvasItem) -> void:
	var sh := sin(anim_time * 50.0) * 2.0 if _shiver > 0.0 else 0.0
	var h := 38.0 - 14.0 * _deflate
	Art.shape(ci, PackedVector2Array([Vector2(-16 + sh, 0), Vector2(-20 + sh, -h), Vector2(20 + sh, -h), Vector2(16 + sh, 0)]), BAG, OUTLINE, 3.0)
	for k in 3:
		ci.draw_colored_polygon(PackedVector2Array([Vector2(-14 + k * 11.0 + sh, 0), Vector2(-18 + k * 12.0 + sh, -h), Vector2(-12 + k * 12.0 + sh, -h), Vector2(-8 + k * 11.0 + sh, 0)]), STRIPE)
	# Kernels bulging out of the top.
	for k in 6:
		var c := Vector2(-15.0 + k * 6.0 + sh, -h - 2.0 - (k % 2) * 4.0 - (6.0 if _shiver > 0.0 else 0.0))
		Art.shape(ci, Art.ellipse(c, 7, 6, 8), CORN, OUTLINE, 1.5)
	Enemy.draw_eye(ci, Vector2(-5 + sh, -h * 0.55), 4.5, Vector2(1, 0), 0.0, _deflate > 0.5)
	Enemy.draw_eye(ci, Vector2(6 + sh, -h * 0.55), 4.5, Vector2(1, 0), 0.0, _deflate > 0.5)
