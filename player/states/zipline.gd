extends PlayerState
## Hanging from a Zipline's pulley, whizzing along it. Downhill speeds you up.
## JUMP lets go with your speed plus a hop; DOWN drops; reaching the end
## flings you off it.

var _t := 0.0          ## 0..1 along the line
var _speed := 0.0      ## px/s along the line (+ = toward the end point)


func enter(_previous: StringName) -> void:
	var z := player.zipline
	var grip := player.global_position + Player.GRIP_OFFSET
	_t = z.closest_t(grip)
	var dir: Vector2 = z.direction()
	_speed = player.velocity.dot(dir)
	# Start moving downhill if we arrived slowly.
	if absf(_speed) < player.tuning.zipline_min_speed:
		_speed = player.tuning.zipline_min_speed * (signf(dir.y) if absf(dir.y) > 0.05 else (signf(_speed) if _speed != 0.0 else float(player.facing) * signf(dir.x)))
	player.sprint = 0.0
	player.glide_armed = false
	player.squash(Vector2(0.9, 1.1))
	EventBus.player_swung.emit(player)


func exit() -> void:
	player.zipline_regrab_timer = player.tuning.zipline_regrab_delay


func physics_update(delta: float) -> void:
	var t := player.tuning
	var z := player.zipline
	if not is_instance_valid(z):
		machine.transition_to(&"Fall")
		return
	var dir: Vector2 = z.direction()
	# Gravity pulls you along the slope; never stop dead.
	_speed += dir.y * t.zipline_accel * delta
	_speed = clampf(_speed, -t.zipline_max_speed, t.zipline_max_speed)
	if absf(_speed) < t.zipline_min_speed:
		_speed = signf(_speed if _speed != 0.0 else 1.0) * t.zipline_min_speed
	_t += _speed * delta / maxf(z.length(), 1.0)
	var along := dir * _speed
	if absf(along.x) > 20.0:
		player.facing = 1 if along.x > 0.0 else -1
	if _t <= 0.0 or _t >= 1.0:
		player.launch(along + Vector2(0, -t.zipline_jump_up * 0.4))
		return
	var target: Vector2 = z.point_at(_t) - Player.GRIP_OFFSET
	player.velocity = (target - player.global_position) / delta
	if player.wants_jump():
		player.consume_jump()
		player.launch(Vector2(along.x, minf(along.y, 0.0) - t.zipline_jump_up))
		EventBus.player_jumped.emit(player)
		return
	if player.input.down_held():
		machine.transition_to(&"Fall")
		return
