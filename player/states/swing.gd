extends PlayerState
## Hanging from a SwingRing, swinging like a pendulum. Pump LEFT / RIGHT to
## swing higher, JUMP to let go with a boost (keeps your swing speed), DOWN to
## drop. Rides along if the ring moves.

var _angle := 0.0     ## rad from straight down (+ = to the right of the ring)
var _omega := 0.0     ## rad/s
var _length := 92.0


func enter(_previous: StringName) -> void:
	var t := player.tuning
	_length = t.swing_length
	var anchor := player.swing_anchor.global_position
	var grip := player.global_position + Player.GRIP_OFFSET
	var d := grip - anchor
	_angle = clampf(atan2(d.x, maxf(d.y, 1.0)), -t.swing_max_angle, t.swing_max_angle)
	# Keep the momentum we arrived with: project velocity onto the swing tangent.
	var tangent := Vector2(cos(_angle), -sin(_angle))
	_omega = player.velocity.dot(tangent) / _length
	player.sprint = 0.0
	player.glide_armed = false
	player.body_pivot = Player.GRIP_OFFSET
	player.squash(Vector2(0.9, 1.1))
	EventBus.player_swung.emit(player)


func exit() -> void:
	player.body_rotation = 0.0
	player.swing_regrab_timer = player.tuning.swing_regrab_delay


func physics_update(delta: float) -> void:
	var t := player.tuning
	if not is_instance_valid(player.swing_anchor):
		machine.transition_to(&"Fall")
		return
	var push := player.input.move_x()
	var alpha := -(t.swing_gravity / _length) * sin(_angle) + push * t.swing_push / _length
	_omega += alpha * delta
	_omega *= 1.0 - t.swing_damping * delta
	_angle += _omega * delta
	if absf(_angle) > t.swing_max_angle:
		_angle = signf(_angle) * t.swing_max_angle
		_omega *= -0.2  # soft stop at the top of the arc
	if absf(push) > 0.3:
		player.facing = 1 if push > 0.0 else -1
	elif absf(_omega) > 0.5:
		player.facing = 1 if _omega > 0.0 else -1

	var anchor := player.swing_anchor.global_position
	var grip := anchor + Vector2(sin(_angle), cos(_angle)) * _length
	var target := grip - Player.GRIP_OFFSET
	player.velocity = (target - player.global_position) / delta
	player.body_rotation = -_angle
	player.rig.swing_speed = _omega

	if player.wants_jump():
		var tangent := Vector2(cos(_angle), -sin(_angle))
		var v := tangent * _omega * _length * t.swing_release_boost
		v.y = minf(v.y, 0.0) - t.swing_release_up
		player.consume_jump()
		player.launch(v)
		EventBus.player_jumped.emit(player)
		return
	if player.input.down_held():
		machine.transition_to(&"Fall")
		return
	if player.input.attack_pressed():
		machine.transition_to(&"Punch")
		return
