extends PlayerState
## Climbing a vine (up/down, centred on it) or a net (any direction).
## JUMP to leap off (steer with left/right), DOWN off the bottom to let go.

var _dist := 0.0


func enter(_previous: StringName) -> void:
	player.velocity = Vector2.ZERO
	player.sprint = 0.0
	player.glide_armed = false
	player.uppercut_used = false
	player.squash(Vector2(0.9, 1.1))


func exit() -> void:
	player.climb_regrab_timer = player.tuning.climb_regrab_delay
	player.rig.climb_phase = 0.0


func physics_update(delta: float) -> void:
	var t := player.tuning
	var c := player.climbable
	if c == null:
		machine.transition_to(&"Fall")
		return
	var inp := Vector2(player.input.move_x(), player.input.move_y())
	var v := Vector2.ZERO
	if c.is_vine():
		v.y = inp.y * t.climb_speed
		# Glide onto the vine's centre line.
		v.x = (c.center_x() - player.global_position.x) * 12.0
	else:
		v = inp.limit_length(1.0) * t.climb_speed
	# Don't climb off the top of the climbable; hop onto whatever's there.
	var grip_y := player.global_position.y + Player.GRIP_OFFSET.y
	if grip_y + v.y * delta < c.top_y() and v.y < 0.0:
		v.y = 0.0
		if inp.y < -0.5:
			player.do_jump(0.6)
			machine.transition_to(&"Jump")
			return
	player.velocity = v
	_dist += v.length() * delta
	player.rig.climb_phase = _dist * 0.08
	if absf(inp.x) > 0.3:
		player.facing = 1 if inp.x > 0.0 else -1

	if player.wants_jump():
		player.do_jump(t.climb_jump_multiplier)
		player.velocity.x = inp.x * t.max_run_speed
		machine.transition_to(&"Jump")
		return
	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
	if player.is_on_floor() and inp.y > 0.3:
		machine.transition_to(&"Ground")
		return
