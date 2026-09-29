extends PlayerState
## Swimming: steer in any direction, JUMP for a stroke (burst of speed),
## JUMP at the surface to leap out. Punch works underwater too.

var _stroke_cd := 0.0
var _kick := 0.0


func enter(_previous: StringName) -> void:
	player.velocity *= 0.45
	player.sprint = 0.0
	player.glide_armed = false
	player.set_crouched(false)
	_stroke_cd = 0.0
	player.squash(Vector2(1.15, 0.9))
	EventBus.player_splashed.emit(player, player.global_position)


func exit() -> void:
	player.body_rotation = 0.0


func physics_update(delta: float) -> void:
	var t := player.tuning
	if player.water == null:
		machine.transition_to(&"Fall")
		return
	var surface: float = player.water.surface_y()
	var inp := Vector2(player.input.move_x(), player.input.move_y())
	if inp.length() > 1.0:
		inp = inp.normalized()
	var target := inp * t.swim_speed
	if inp.length() < 0.1:
		target = Vector2(0, t.swim_sink)
	player.velocity = player.velocity.move_toward(target, t.swim_accel * delta)
	_stroke_cd -= delta
	var head_y := player.global_position.y - Player.BODY_SIZE.y
	var at_surface := head_y < surface + 12.0

	if player.wants_jump():
		if at_surface and inp.y <= 0.3:
			# Leap out of the water.
			player.global_position.y = minf(player.global_position.y, surface + 30.0)
			player.do_jump(t.swim_leap_multiplier)
			EventBus.player_splashed.emit(player, Vector2(player.global_position.x, surface))
			machine.transition_to(&"Jump")
			return
		if _stroke_cd <= 0.0:
			player.consume_jump()
			_stroke_cd = t.swim_stroke_cooldown
			var dir := inp.normalized() if inp.length() > 0.1 else Vector2(player.facing, -0.3).normalized()
			player.velocity += dir * t.swim_stroke
			_kick = 1.0
	# Bob at the surface instead of flying out of it.
	if at_surface and player.velocity.y < 0.0 and head_y < surface - 6.0:
		player.velocity.y = 0.0
	if absf(inp.x) > 0.2:
		player.facing = 1 if inp.x > 0.0 else -1
	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
	if not player.is_submerged() and not at_surface:
		machine.transition_to(&"Fall")
		return
	# Lie flat when swimming sideways, upright when treading water.
	var flat := clampf(absf(player.velocity.x) / t.swim_speed, 0.0, 1.0) * (1.0 - clampf(-player.velocity.y / t.swim_speed, 0.0, 1.0))
	player.body_rotation = lerp_angle(player.body_rotation, player.facing * flat * 1.2, clampf(8.0 * delta, 0.0, 1.0))
	player.body_pivot = Vector2(0, -30)
	_kick = maxf(_kick - delta * 3.0, 0.0)
	player.rig.swim_kick = _kick
