class_name Shieldbug
extends Enemy
## SHIELDBUG: beetle knight hiding behind a big shield. Punches and slides from
## the front just clank off. Get it from behind, stomp it, ground pound it, or
## smash the shield with a CHARGED punch (then it's a pushover).
## Marches toward the nearest player.

@export var walk_speed := 65.0
@export var sight := 420.0
@export var break_power := 0.6              ## punch power that breaks the shield

const SHELL := Color("2fa39a")
const SHELL_DARK := Color("1d7a73")
const SHIELD := Color("c98a4b")
const RIM := Color("d9dde8")

var has_shield := true


func _init() -> void:
	body_size = Vector2(44, 44)
	health = 2


func _behave(_delta: float) -> void:
	var p := nearest_player(sight, 100.0)
	if p and absf(p.global_position.x - global_position.x) > 12.0:
		face(p)
		var spd := walk_speed * (1.0 if has_shield else 1.8)
		if is_on_floor() and (wall_ahead() or not floor_ahead()):
			velocity.x = 0.0
		else:
			velocity.x = facing * spd
	else:
		patrol(walk_speed * 0.6)


func blocks_hit(by: Player, kind: HitKind) -> bool:
	if not has_shield or by == null or kind in [HitKind.POUND, HitKind.STOMP]:
		return false
	var from_front := signf(by.global_position.x - global_position.x) == facing
	if not from_front:
		return false
	if kind == HitKind.PUNCH and by.punch_power >= break_power:
		_break_shield(by)
		return true
	return true


func _break_shield(by: Player) -> void:
	has_shield = false
	health = 1
	stun_timer = 1.0
	hit_flash = 1.0
	velocity = Vector2(-facing * 250.0, -250.0)
	EventBus.enemy_hit.emit(self, by)
	EventBus.screen_shake.emit(0.35)


func _draw_body(ci: CanvasItem) -> void:
	var step := sin(anim_time * 9.0) * 4.0 if absf(velocity.x) > 1.0 else 0.0
	for i in 3:
		var x := -12.0 + i * 10.0
		ci.draw_line(Vector2(x, -10), Vector2(x + (step if i % 2 == 0 else -step), 0), OUTLINE, 3.0)
	Art.shape(ci, Art.ellipse(Vector2(-4, -22), 22, 18), SHELL, OUTLINE)
	ci.draw_line(Vector2(-4, -40), Vector2(-4, -6), SHELL_DARK, 3.0)
	draw_shine(ci)
	# Head with horn.
	Art.shape(ci, Art.ellipse(Vector2(15, -26), 10, 9), SHELL_DARK, OUTLINE, 2.0)
	Art.shape(ci, PackedVector2Array([Vector2(18, -33), Vector2(28, -46), Vector2(23, -31)]), RIM, OUTLINE, 2.0)
	Enemy.draw_eye(ci, Vector2(18, -27), 3.5, Vector2(1, 0), 0.8)
	if has_shield:
		Art.shape(ci, Art.rounded_rect(Vector2(22, -46), Vector2(38, 0), 7.0), SHIELD, OUTLINE)
		ci.draw_rect(Rect2(22, -26, 16, 5), RIM)
		ci.draw_circle(Vector2(30, -23), 4.0, RIM.darkened(0.2))


func draw_shine(ci: CanvasItem) -> void:
	Art.shape(ci, Art.ellipse(Vector2(-12, -32), 6, 4), Color(1, 1, 1, 0.45), OUTLINE, 0.0)
