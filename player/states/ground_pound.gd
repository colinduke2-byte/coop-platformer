extends PlayerState
## Ground pound: DOWN + ATTACK in the air. Spin in place, then dive straight
## down. Smashes crates on the way (wood; iron needs a charged punch), squashes
## enemies it lands on (and bounces you off them), and the landing shockwave
## knocks out nearby grounded enemies. Jump right after landing = pound jump.

enum Phase { HANG, DIVE, LAND }

var _phase := Phase.HANG
var _time := 0.0
var _already_hit: Array[Node] = []


func enter(_previous: StringName) -> void:
	_phase = Phase.HANG
	_time = 0.0
	_already_hit.clear()
	player.velocity = Vector2(player.velocity.x * 0.2, -60.0)
	player.sprint = 0.0
	player.glide_armed = false
	player.punch_power = player.tuning.ground_pound_power
	# Hitbox under the feet for the dive.
	var rect := player.punch_area.get_node(^"CollisionShape2D").shape as RectangleShape2D
	rect.size = Vector2(Player.BODY_SIZE.x + 16.0, 30.0)
	player.punch_area.position = Vector2(0.0, -6.0)
	player.rig.pound_phase = 0
	player.rig.punch_target = Vector2(0.0, -4.0)  # impact stars burst at the feet


func exit() -> void:
	player.reset_punch_area()
	player.rig.pound_phase = -1


func physics_update(delta: float) -> void:
	var t := player.tuning
	_time += delta
	match _phase:
		Phase.HANG:
			player.velocity.x = move_toward(player.velocity.x, 0.0, 2000.0 * delta)
			player.velocity.y = move_toward(player.velocity.y, 0.0, 600.0 * delta)
			player.rig.pound_spin = clampf(_time / maxf(t.ground_pound_hang, 0.01), 0.0, 1.0)
			if _time >= t.ground_pound_hang:
				_phase = Phase.DIVE
				_time = 0.0
				player.velocity = Vector2(0.0, t.ground_pound_speed)
				player.squash(Vector2(0.75, 1.3))
				player.rig.pound_phase = 1
		Phase.DIVE:
			player.velocity.x = player.input.move_x() * t.ground_pound_steer
			player.velocity.y = t.ground_pound_speed
			for body in player.hit_with_punch_area(Vector2(0.0, -200.0), _already_hit):
				if body is CollisionObject2D and (body as CollisionObject2D).collision_layer & 4 and not body is Crate:
					# Landed on an enemy: squash it and spring off like a super stomp.
					player.bounce(1.0)
					return
			if player.is_on_floor():
				_land()
		Phase.LAND:
			player.velocity.x = 0.0
			if not player.is_on_floor() and _time > 0.02:
				# What we landed on broke (crate): keep diving through it.
				_phase = Phase.DIVE
				player.rig.pound_phase = 1
				player.velocity.y = t.ground_pound_speed
				return
			player.apply_gravity(delta)
			if player.wants_jump():
				player.do_jump(t.ground_pound_jump_multiplier)
				machine.transition_to(&"Jump")
				return
			if _time >= t.ground_pound_recovery:
				machine.transition_to(&"Ground" if player.is_on_floor() else &"Fall")
				return


func _land() -> void:
	var t := player.tuning
	_phase = Phase.LAND
	_time = 0.0
	player.velocity = Vector2.ZERO
	player.squash(t.hard_land_squash)
	player.rig.pound_phase = 2
	# Whatever we landed on may be breakable (crate below the feet).
	for i in player.get_slide_collision_count():
		var c := player.get_slide_collision(i).get_collider()
		if c and c.has_method("take_hit") and not c in _already_hit:
			_already_hit.append(c)
			c.take_hit(player, Vector2(0.0, -200.0))
			player.punch_hit(c)
	# Shockwave: knock out grounded enemies close by.
	for e in player.get_tree().get_nodes_in_group(&"enemies"):
		var n := e as Node2D
		if n == null or n in _already_hit or not n.has_method("take_hit"):
			continue
		var d := n.global_position - player.global_position
		if absf(d.x) <= t.ground_pound_radius and absf(d.y) <= 40.0:
			_already_hit.append(n)
			n.take_hit(player, Vector2(signf(d.x) * 250.0, -350.0))
	EventBus.player_ground_pounded.emit(player, player.global_position)
