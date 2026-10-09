extends PlayerState
## Rising part of a jump. Releasing jump early cuts the arc (variable height),
## but never below PlayerTuning.jump_min_height, so quick taps are consistent.

var _cut := false
var _start_y := 0.0


func enter(previous: StringName) -> void:
	_start_y = player.global_position.y
	# Marking the jump as already cut disables the early-release cut.
	_cut = not player.jump_cuttable or (previous == &"WallSlide" and not player.tuning.wall_jump_cuttable)
	player.jump_cuttable = true


func physics_update(delta: float) -> void:
	var t := player.tuning
	if player.try_environment_states():
		return
	if player.try_wall_jump():
		return  # JUMP again right beside a wall
	if not _cut and not player.input.jump_held() and player.velocity.y < 0.0:
		_cut_jump()

	player.apply_gravity(delta)
	player.apply_horizontal(delta, t.air_accel, t.air_decel, player.current_max_speed())

	if player.input.attack_pressed():
		machine.transition_to(player.air_attack_state())
		return
	if player.is_on_ceiling() and player.velocity.y < 0.0:
		player.velocity.y = 0.0
	if player.try_wall_run() or player.try_ledge_grab():
		return
	if player.velocity.y >= 0.0:
		machine.transition_to(&"Fall")
		return


func _cut_jump() -> void:
	var t := player.tuning
	_cut = true
	var custom := player.cut_multiplier >= 0.0  # stomp bounces keep their own cut
	var vy := player.velocity.y * (player.cut_multiplier if custom else t.jump_cut_multiplier)
	if not custom:
		# Keep enough speed to still reach the minimum hop height.
		var remaining := t.jump_min_height - (_start_y - player.global_position.y) * player.gdir
		if remaining > 0.0:
			vy = minf(vy, -sqrt(2.0 * t.rise_gravity() * remaining))
	player.velocity.y = maxf(vy, player.velocity.y)  # a cut never speeds you up
