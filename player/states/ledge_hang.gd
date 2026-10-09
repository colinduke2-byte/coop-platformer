extends PlayerState
## Hanging from a ledge edge (caught by Player.try_ledge_grab). Hold toward the
## ledge (or UP) to climb onto it, JUMP to hop up off it, DOWN / away to let go.
## Rides along if the ledge moves (moving platforms); drops if it disappears.

var _dir := 1
var _time := 0.0
var _climbing := false
var _climb_time := 0.0
var _from := Vector2.ZERO
var _to := Vector2.ZERO
var _body: CollisionObject2D
var _last_anchor := Vector2.ZERO


func enter(_previous: StringName) -> void:
	_dir = player.ledge_dir
	_time = 0.0
	_climbing = false
	player.facing = _dir
	player.velocity = Vector2.ZERO
	player.sprint = 0.0
	player.glide_armed = false
	player.global_position.y = player.ledge_top + player.tuning.ledge_hang_offset * player.gdir
	player.squash(Vector2(0.9, 1.12))
	player.rig.ledge_lip = -player.tuning.ledge_hang_offset
	_body = player.ledge_body as CollisionObject2D
	if _body:
		_last_anchor = _body.global_position
	EventBus.player_ledge_grabbed.emit(player)


func exit() -> void:
	player.rig.ledge_climb = 0.0


func physics_update(delta: float) -> void:
	var t := player.tuning
	_time += delta
	player.velocity = Vector2.ZERO

	var shift := Vector2.ZERO
	if _body != null:
		if not is_instance_valid(_body) or _body.collision_layer == 0:
			_body = null
			if not _climbing:
				_let_go()  # the ledge vanished (smashed / crumbled)
				return
		else:
			shift = _body.global_position - _last_anchor
			_last_anchor = _body.global_position

	if _climbing:
		_from += shift
		_to += shift
		_climb_time += delta
		var k := clampf(_climb_time / maxf(t.ledge_climb_time, 0.01), 0.0, 1.0)
		# Up first, then forward over the lip.
		var up_k := clampf(k / 0.6, 0.0, 1.0)
		var fwd_k := clampf((k - 0.45) / 0.55, 0.0, 1.0)
		player.global_position = Vector2(lerpf(_from.x, _to.x, fwd_k), lerpf(_from.y, _to.y, ease(up_k, 0.6)))
		player.rig.ledge_climb = k
		if k >= 1.0:
			player.velocity = Vector2(_dir * 80.0, 60.0)
			machine.transition_to(&"Fall")
		return
	player.global_position += shift

	if player.wants_jump():
		player.do_jump()
		player.ledge_regrab_timer = t.ledge_regrab_delay
		machine.transition_to(&"Jump")
		return
	var push := player.input.move_x() * _dir
	if player.input.down_held() or push < -0.5:
		_let_go()
		return
	if player.input.attack_pressed():
		player.ledge_regrab_timer = t.ledge_regrab_delay
		player.facing = -_dir
		machine.transition_to(&"Punch")
		return
	if (push > 0.5 or player.input.up_held()) and _time >= t.ledge_min_hang:
		_climbing = true
		_climb_time = 0.0
		_from = player.global_position
		_to = Vector2(_from.x + _dir * (Player.BODY_SIZE.x * 0.5 + Player.CLIMB_FORWARD), player.ledge_top - 0.5 * player.gdir)


func _let_go() -> void:
	player.ledge_regrab_timer = player.tuning.ledge_regrab_delay
	machine.transition_to(&"Fall")
