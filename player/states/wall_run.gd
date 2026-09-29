extends PlayerState
## Running straight up a wall after hitting it at sprint speed. Lasts
## wall_run_time, slowing down, then turns into a wall slide. JUMP kicks off
## the wall; running off the top pops you up over the edge.

var _dir := 1
var _time := 0.0
var _phase := 0.0


func enter(_previous: StringName) -> void:
	_dir = player.ledge_dir
	_time = 0.0
	player.facing = _dir
	player.sprint = 0.0
	player.glide_armed = false
	player.body_pivot = Vector2(0, -30)
	player.squash(Vector2(0.85, 1.15))
	EventBus.player_wall_ran.emit(player)


func exit() -> void:
	player.body_rotation = 0.0


func physics_update(delta: float) -> void:
	var t := player.tuning
	_time += delta
	var k := clampf(_time / maxf(t.wall_run_time, 0.01), 0.0, 1.0)
	player.velocity = Vector2(_dir * 30.0, -t.wall_run_speed * (1.0 - k * 0.6))
	# Tip the body so the feet run on the wall.
	player.body_rotation = lerp_angle(player.body_rotation, -_dir * PI * 0.42, clampf(20.0 * delta, 0.0, 1.0))
	_phase += delta * 22.0
	player.rig.wall_run_phase = _phase

	if player.wants_jump():
		player.body_rotation = 0.0
		player.do_wall_jump(_dir)
		return
	if player.touching_wall_dir() != _dir:
		# Ran off the top of the wall: hop up and over the edge.
		player.body_rotation = 0.0
		player.launch(Vector2(_dir * 220.0, -420.0))
		return
	if k > 0.5 and player.try_ledge_grab():
		player.body_rotation = 0.0
		return
	if player.is_on_ceiling() or k >= 1.0:
		player.velocity.y = 0.0
		player.body_rotation = 0.0
		machine.transition_to(&"WallSlide")
		return
