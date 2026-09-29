class_name Boingo
extends Enemy
## BOINGO: a puffed-up balloon blowfish that bobs in the air. Its sides are
## prickly, but bounce on its head for a HUGE boost (it pops, then puffs back
## up after `respawn_time`). Chain them over pits for bouncy traversal.

@export var bob_height := 24.0
@export var bob_speed := 1.6
@export var drift := Vector2.ZERO           ## optional slow sideways sway amplitude
@export var bounce_multiplier := 1.35
@export var respawn_time := 3.0

const SKIN := Color("ff9ec7")
const SKIN_DARK := Color("e8679f")
const FIN := Color("ffd23f")

var _home := Vector2.ZERO
var _popped := false


func _init() -> void:
	body_size = Vector2(52, 50)
	uses_gravity = false
	lum_drop = 0


func _setup() -> void:
	stomp_bounce = bounce_multiplier
	_home = global_position


func _behave(_delta: float) -> void:
	var target := _home + Vector2(sin(anim_time * bob_speed * 0.5) * drift.x, sin(anim_time * bob_speed) * bob_height)
	velocity = (target - global_position) * 5.0
	facing = 1 if cos(anim_time * bob_speed * 0.5) * drift.x >= 0.0 else -1


## Stomps pop it (no death animation - it deflates and comes back).
func _on_stomped(_by: Player) -> void:
	_pop()


func take_hit(by: Player, knockback: Vector2) -> void:
	# Punching it just bops it away a little.
	if not _popped:
		hit_flash = 1.0
		global_position += knockback.normalized() * 12.0
		squash(Vector2(1.3, 0.8))


func _pop() -> void:
	_popped = true
	visible = false
	collision_layer = 0
	_hitbox.set_deferred(&"monitoring", false)
	set_physics_process(false)
	EventBus.enemy_defeated.emit(self, null)
	get_tree().create_timer(respawn_time).timeout.connect(_respawn)


func _respawn() -> void:
	_popped = false
	visible = true
	global_position = _home
	collision_layer = 4
	_hitbox.monitoring = true
	set_physics_process(true)
	squash(Vector2(0.3, 0.3))


func _draw_body(ci: CanvasItem) -> void:
	var puff := 1.0 + sin(anim_time * 4.0) * 0.04
	var c := Vector2(0, -26)
	for i in 8:
		var a := TAU * float(i) / 8.0 + 0.2
		if sin(a) < -0.5:
			continue  # no prickles on top (that's the bouncy bit)
		var base := c + Vector2.from_angle(a) * 24.0 * puff
		Art.shape(ci, PackedVector2Array([base + Vector2.from_angle(a + 1.5) * 4.0, c + Vector2.from_angle(a) * 34.0 * puff, base + Vector2.from_angle(a - 1.5) * 4.0]), FIN, OUTLINE, 1.5)
	Art.shape(ci, Art.ellipse(c, 26 * puff, 24 * puff), SKIN, OUTLINE)
	Art.shape(ci, Art.ellipse(c + Vector2(0, 8), 18, 12), SKIN.lightened(0.3), OUTLINE, 0.0)
	# Top pad marker: a little bouncy tuft.
	Art.shape(ci, Art.ellipse(c + Vector2(0, -24 * puff), 10, 4), FIN, OUTLINE, 2.0)
	Art.shape(ci, PackedVector2Array([c + Vector2(-26, 0), c + Vector2(-38, -10), c + Vector2(-38, 10)]), SKIN_DARK, OUTLINE, 2.0)
	Enemy.draw_eye(ci, c + Vector2(8, -6), 6.0, Vector2(1, 0.2), 0.0)
	Art.shape(ci, Art.ellipse(c + Vector2(20, 4), 5, 4, 10), SKIN_DARK, OUTLINE, 2.0)
