extends PlayerState
## Standing / running on the floor. DOWN crouches (or belly-slides when fast).


func enter(previous: StringName) -> void:
	player.glide_armed = false
	if previous in [&"Fall", &"Glide", &"Jump", &"WallSlide"]:
		player.squash(player.tuning.land_squash)
		EventBus.player_landed.emit(player)


func physics_update(delta: float) -> void:
	var t := player.tuning
	if player.try_environment_states():
		return
	var grip := player.floor_friction()
	player.apply_horizontal(delta, t.ground_accel * grip, t.ground_decel * grip, player.current_max_speed())
	player.apply_gravity(delta)

	if player.wants_jump():
		player.do_jump()
		machine.transition_to(&"Jump")
		return
	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
	if player.try_wall_run():
		return
	if not player.is_on_floor():
		machine.transition_to(&"Fall")
		return
	if player.input.down_held():
		var downhill := player.get_floor_normal().x * player.facing > 0.2
		machine.transition_to(&"Slide" if absf(player.velocity.x) >= t.slide_min_speed or downhill else &"Crouch")
		return
