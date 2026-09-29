extends PlayerState
## Belly slide: run fast + DOWN. Low hitbox (slips under gaps), keeps momentum,
## kicks enemies out of the way. JUMP out of it for a long jump.

var _dir := 1
var _already_hit: Array[Node] = []


func enter(_previous: StringName) -> void:
	var t := player.tuning
	player.set_crouched(true)
	_dir = int(signf(player.velocity.x)) if player.velocity.x != 0.0 else player.facing
	player.facing = _dir
	player.velocity.x = _dir * minf(maxf(absf(player.velocity.x), t.crawl_speed * 1.5) + t.slide_boost, t.slide_max_speed)
	player.squash(Vector2(1.25, 0.8))
	_already_hit.clear()
	# Low kick hitbox at the feet.
	player.punch_area.position = Vector2(_dir * 30.0, -14.0)
	player.punch_power = 0.0
	EventBus.player_slid.emit(player)


func exit() -> void:
	player.set_crouched(false)
	player.reset_punch_area()


func physics_update(delta: float) -> void:
	var t := player.tuning
	var n := player.get_floor_normal() if player.is_on_floor() else Vector2.UP
	if n.x * _dir > 0.1:
		# Downhill: pick up speed instead of slowing down.
		player.velocity.x = move_toward(player.velocity.x, _dir * t.slide_max_speed * 1.3, t.slope_slide_accel * absf(n.x) * delta)
	else:
		player.velocity.x = move_toward(player.velocity.x, 0.0, t.slide_friction * player.floor_friction() * delta)
	player.apply_gravity(delta)
	player.hit_with_punch_area(Vector2(_dir * t.punch_knockback.x, t.punch_knockback.y), _already_hit)

	if player.wants_jump() and player.can_stand():
		# Long jump: lower, but flat and fast. Sprint keeps the air speed cap high.
		player.sprint = 1.0
		player.do_jump(t.long_jump_height_multiplier)
		player.velocity.x = _dir * maxf(absf(player.velocity.x), t.long_jump_speed)
		machine.transition_to(&"Jump")
		return
	if not player.is_on_floor():
		machine.transition_to(&"Fall")
		return
	if player.is_on_wall() or absf(player.velocity.x) <= t.crawl_speed:
		if player.input.down_held() or not player.can_stand():
			machine.transition_to(&"Crouch")
		else:
			machine.transition_to(&"Ground")
		return
