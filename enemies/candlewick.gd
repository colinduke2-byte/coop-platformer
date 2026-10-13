class_name Candlewick
extends Enemy
## CANDLEWICK: a stubby walking candle with a live flame on its head. You can't stomp a
## flame - it burns you - so PUNCH it (a good hit snuffs the flame out for a few seconds,
## and it just wanders harmlessly with a puff of smoke). Ground pounds work too.

@export var walk_speed := 62.0
@export var relight_time := 4.0

const WAX := Color("fff0d0")
const WAX_DARK := Color("e0c896")
const FLAME := Color("ffb02e")

var _snuffed := 0.0


func _init() -> void:
	body_size = Vector2(32, 52)
	health = 2
	lum_drop = 3
	stompable = false


func _behave(delta: float) -> void:
	_snuffed = maxf(_snuffed - delta, 0.0)
	stompable = _snuffed > 0.0
	patrol(walk_speed * (0.6 if _snuffed > 0.0 else 1.0))
	contact_hurts = _snuffed <= 0.0


func _on_hurt(_by: Player, _kind: HitKind) -> void:
	_snuffed = relight_time


func _draw_body(ci: CanvasItem) -> void:
	var lit := _snuffed <= 0.0
	Art.shape(ci, Art.rounded_rect(Vector2(-14, -40), Vector2(14, 0), 5.0), WAX, OUTLINE, 3.0)
	ci.draw_colored_polygon(Art.rect(Vector2(-14, -40), Vector2(-8, -2)), WAX_DARK)
	for k in 2:   # melted drips
		Art.shape(ci, Art.ellipse(Vector2(-6 + k * 14.0, -38 + k * 3.0), 4, 6, 8), WAX, OUTLINE, 2.0)
	ci.draw_line(Vector2(0, -40), Vector2(0, -47), OUTLINE, 3.0)
	if lit:
		var f := sin(anim_time * 14.0) * 2.0
		ci.draw_circle(Vector2(0, -56), 22.0, Color(1.0, 0.8, 0.4, 0.14))
		Art.shape(ci, PackedVector2Array([Vector2(-8, -47), Vector2(-5 + f, -62), Vector2(0, -74 + f), Vector2(5 + f, -62), Vector2(8, -47)]), FLAME, OUTLINE, 2.5)
		ci.draw_colored_polygon(PackedVector2Array([Vector2(-4, -48), Vector2(0, -64), Vector2(4, -48)]), Color("fff3a0"))
	else:
		for k in 3:
			ci.draw_circle(Vector2(sin(anim_time * 3.0 + k) * 5.0, -52.0 - k * 9.0 - fmod(anim_time * 20.0, 9.0)), 4.0 - k, Color(0.7, 0.7, 0.75, 0.5))
	Enemy.draw_eye(ci, Vector2(-5, -24), 4.0, Vector2(facing, 0), 0.0, not lit)
	Enemy.draw_eye(ci, Vector2(6, -24), 4.0, Vector2(facing, 0), 0.0, not lit)
