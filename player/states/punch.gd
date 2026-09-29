extends PlayerState
## Punch: windup -> (hold ATTACK to charge) -> active -> recovery.
## A tap punches straight away. Holding past the windup charges a bigger punch
## with more reach, a bigger hitbox and more knockback; release to throw it.
## Holding UP throws an uppercut instead (in the air it also kicks you upward,
## once per airtime). Hits anything with take_hit() (enemies, crates) and pops
## teammate bubbles.

enum Phase { WINDUP, CHARGE, ACTIVE, RECOVERY }

var _phase := Phase.WINDUP
var _time := 0.0
var _charge_time := 0.0
var _power := 0.0
var _up := false
var _already_hit: Array[Node] = []


func enter(_previous: StringName) -> void:
	_phase = Phase.WINDUP
	_time = 0.0
	_charge_time = 0.0
	_power = 0.0
	_up = player.input.up_held()
	_already_hit.clear()
	player.punch_power = 0.0
	player.set_punch_visual(false)
	player.set_punch_charge(0.0)
	player.rig.punch_up = _up


func exit() -> void:
	player.set_punch_visual(false)
	player.set_punch_charge(0.0)
	player.reset_punch_area()


func physics_update(delta: float) -> void:
	var t := player.tuning
	_time += delta

	var speed_scale := t.punch_charge_move_scale if _phase == Phase.CHARGE else t.punch_ground_speed_scale
	if player.is_on_floor():
		player.apply_horizontal(delta, t.ground_accel, t.ground_decel, player.current_max_speed() * speed_scale)
	else:
		player.apply_horizontal(delta, t.air_accel, t.air_decel, player.current_max_speed())
	player.apply_gravity(delta)

	match _phase:
		Phase.WINDUP:
			if _time >= t.punch_windup:
				if player.input.attack_held():
					_set_phase(Phase.CHARGE)
				else:
					_launch()
		Phase.CHARGE:
			_charge_time += delta
			_power = clampf((_charge_time - t.punch_charge_min) / maxf(t.punch_charge_time - t.punch_charge_min, 0.01), 0.0, 1.0)
			player.set_punch_charge(_power)
			if not player.input.attack_held():
				_launch()
		Phase.ACTIVE:
			_apply_hits()
			if _time >= t.punch_active:
				player.set_punch_visual(false)
				_set_phase(Phase.RECOVERY)
		Phase.RECOVERY:
			# A buffered jump cancels the recovery on the ground: punch-jump combos flow.
			if player.is_on_floor() and player.wants_jump():
				player.do_jump()
				machine.transition_to(&"Jump")
				return
			if _time >= t.punch_recovery:
				machine.transition_to(&"Ground" if player.is_on_floor() else &"Fall")
				return


func _set_phase(p: Phase) -> void:
	_phase = p
	_time = 0.0


func _launch() -> void:
	var t := player.tuning
	player.punch_power = _power
	player.set_punch_charge(0.0)
	var reach := t.punch_reach * lerpf(1.0, t.punch_charged_reach_multiplier, _power)
	var body_mid := -30.0
	var target := Vector2(reach, body_mid)  # facing-right local space
	if _up:
		target = Vector2(8.0, body_mid - reach)
		player.punch_area.rotation = PI * 0.5
		if not player.is_on_floor() and not player.uppercut_used:
			player.uppercut_used = true
			player.velocity.y = minf(player.velocity.y, -t.uppercut_lift)
	player.punch_area.position = Vector2(target.x * player.facing, target.y)
	player.punch_area.scale = Vector2.ONE * lerpf(1.0, t.punch_charged_hitbox_multiplier, _power)
	player.set_punch_visual(true, target, _power)
	_set_phase(Phase.ACTIVE)
	_apply_hits()  # land on the first active frame too


func _apply_hits() -> void:
	var t := player.tuning
	var kb := t.punch_knockback * lerpf(1.0, t.punch_charged_knockback_multiplier, _power)
	var knock := Vector2(player.facing * kb.x * 0.2, -absf(kb.x)) if _up else Vector2(player.facing * kb.x, kb.y)
	player.hit_with_punch_area(knock, _already_hit)
