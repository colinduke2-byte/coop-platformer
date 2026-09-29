extends PlayerState
## Sliding down a wall while pushing into it. Jump kicks off the wall.

var _wall_dir := 0  ## +1 wall is to the right, -1 to the left


func enter(_previous: StringName) -> void:
	player.glide_armed = false
	_wall_dir = player.touching_wall_dir()
	if _wall_dir == 0:
		_wall_dir = -int(signf(player.get_wall_normal().x))
	player.facing = -_wall_dir


func physics_update(delta: float) -> void:
	var t := player.tuning
	player.velocity.y = minf(player.velocity.y + t.fall_gravity() * delta, t.wall_slide_speed)
	player.velocity.x = _wall_dir * 20.0  # keep contact with the wall

	if player.wants_jump():
		player.do_wall_jump(_wall_dir)
		return
	if player.is_on_floor():
		machine.transition_to(&"Ground")
		return
	if player.input.attack_pressed():
		player.facing = -_wall_dir  # punch away from the wall
		machine.transition_to(&"Punch")
		return
	if player.touching_wall_dir() != _wall_dir or not player.wants_wall_grab(_wall_dir) or player.input.down_held():
		player.wall_coyote_timer = t.wall_coyote_time
		player.wall_coyote_dir = _wall_dir
		machine.transition_to(&"Fall")
		return
