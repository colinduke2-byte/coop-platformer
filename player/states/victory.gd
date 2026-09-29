extends PlayerState
## Level complete! Hop and cheer; ignores input.

var _t := 0.0


func enter(_previous: StringName) -> void:
	_t = 0.0
	player.velocity.x = 0.0
	player.body_rotation = 0.0
	player.set_crouched(false)


func physics_update(delta: float) -> void:
	_t += delta
	player.apply_gravity(delta)
	player.velocity.x = move_toward(player.velocity.x, 0.0, 2000.0 * delta)
	if player.is_on_floor() and _t > 0.25:
		_t = 0.0
		player.velocity.y = player.tuning.jump_velocity() * 0.55
		player.squash(player.tuning.jump_stretch)
