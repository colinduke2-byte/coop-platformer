extends PlayerState
## Rising part of a jump. Releasing jump early cuts the arc (variable height).

var _cut := false


func enter(previous: StringName) -> void:
	# Marking the jump as already cut disables the early-release cut.
	_cut = previous == &"WallSlide" and not player.tuning.wall_jump_cuttable


func physics_update(delta: float) -> void:
	var t := player.tuning
	if not _cut and not player.input.jump_held() and player.velocity.y < 0.0:
		player.velocity.y *= t.jump_cut_multiplier
		_cut = true

	player.apply_gravity(delta)
	player.apply_horizontal(delta, t.air_accel, t.air_decel, t.max_run_speed)

	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
	if player.is_on_ceiling() and player.velocity.y < 0.0:
		player.velocity.y = 0.0
	if player.velocity.y >= 0.0:
		machine.transition_to(&"Fall")
		return
