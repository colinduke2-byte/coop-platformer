extends PlayerState
## Helicopter glide. Started by Fall (see PlayerTuning.glide_mode); lasts while
## the mode's glide input is held.


func enter(_previous: StringName) -> void:
	player.set_glide_visual(true)


func exit() -> void:
	player.set_glide_visual(false)


func physics_update(delta: float) -> void:
	var t := player.tuning
	player.apply_horizontal(delta, t.glide_accel, t.air_decel, t.glide_max_speed)
	# Ease toward the glide fall speed (brakes hard if we were falling fast),
	# or rise if an Updraft is holding us up.
	if player.updraft_speed > 0.0:
		player.velocity.y = move_toward(player.velocity.y, -player.updraft_speed, t.updraft_accel * delta)
	else:
		player.velocity.y = move_toward(player.velocity.y, t.glide_fall_speed, t.fall_gravity() * delta)

	if player.is_on_floor():
		machine.transition_to(&"Ground")
		return
	if not player.glide_input_held():
		machine.transition_to(&"Fall")
		return
	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
	if player.is_pushing_into_wall():
		machine.transition_to(&"WallSlide")
		return
