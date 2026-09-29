extends PlayerState
## Standing / running on the floor.


func enter(previous: StringName) -> void:
	player.glide_armed = false
	if previous in [&"Fall", &"Glide", &"Jump", &"WallSlide"]:
		player.squash(player.tuning.land_squash)
		EventBus.player_landed.emit(player)


func physics_update(delta: float) -> void:
	var t := player.tuning
	player.apply_horizontal(delta, t.ground_accel, t.ground_decel, t.max_run_speed)
	player.apply_gravity(delta)

	if player.wants_jump():
		player.do_jump()
		machine.transition_to(&"Jump")
		return
	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
	if not player.is_on_floor():
		machine.transition_to(&"Fall")
		return
