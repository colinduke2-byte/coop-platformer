extends PlayerState
## Airborne and moving down. Handles coyote jumps, starting a glide,
## grabbing ledges and walls.

var _hold_time := 0.0  ## HOLD_THROUGH: seconds jump has stayed held past the apex


func enter(_previous: StringName) -> void:
	_hold_time = 0.0


func _glide_requested(delta: float) -> bool:
	var t := player.tuning
	match t.glide_mode:
		PlayerTuning.GlideMode.HOLD_THROUGH:
			if not player.glide_armed or player.velocity.y < 0.0:
				_hold_time = 0.0
				return false
			# Armed by holding through the apex, or by a fresh press in midair
			# (re-glide). Never while that press could still be a buffered jump.
			_hold_time += delta
			return _hold_time >= t.glide_hold_delay and not player.wants_jump()
		PlayerTuning.GlideMode.SECOND_PRESS:
			# Wait until the press has aged out of the jump buffer: if we land
			# inside that window it becomes a buffered jump, never a glide.
			return player.glide_armed and not player.wants_jump()
		PlayerTuning.GlideMode.SEPARATE_BUTTON:
			return player.input.glide_held()
	return false


func physics_update(delta: float) -> void:
	var t := player.tuning
	if player.try_environment_states():
		return

	if player.wants_jump() and player.can_coyote_jump():
		player.do_jump()
		machine.transition_to(&"Jump")
		return
	if player.try_wall_coyote_jump():
		return
	if player.balloon_timer <= 0.0 and _glide_requested(delta):
		machine.transition_to(&"Glide")
		return
	if player.input.attack_pressed():
		machine.transition_to(player.air_attack_state())
		return

	player.apply_gravity(delta)
	player.apply_horizontal(delta, t.air_accel, t.air_decel, player.current_max_speed())

	if player.is_on_floor():
		machine.transition_to(&"Ground")
		return
	if player.try_wall_run() or player.try_ledge_grab():
		return
	if player.velocity.y > 0.0 and not player.input.down_held() and player.wants_wall_grab(player.touching_wall_dir()):
		machine.transition_to(&"WallSlide")
		return
