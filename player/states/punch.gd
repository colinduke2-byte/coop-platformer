extends PlayerState
## Punch: windup -> (hold ATTACK to charge) -> active -> recovery.
## A tap punches straight away. Holding past the windup charges a bigger punch
## with more reach, a bigger hitbox and more knockback; release to throw it.
## Hits anything with take_hit() (enemies, crates) and pops teammate bubbles.

enum Phase { WINDUP, CHARGE, ACTIVE, RECOVERY }

var _phase := Phase.WINDUP
var _time := 0.0
var _charge_time := 0.0
var _power := 0.0
var _already_hit: Array[Node] = []


func enter(_previous: StringName) -> void:
	_phase = Phase.WINDUP
	_time = 0.0
	_charge_time = 0.0
	_power = 0.0
	_already_hit.clear()
	player.punch_power = 0.0
	player.set_punch_visual(false)
	player.set_punch_charge(0.0)


func exit() -> void:
	player.set_punch_visual(false)
	player.set_punch_charge(0.0)
	player.punch_area.scale = Vector2.ONE


func physics_update(delta: float) -> void:
	var t := player.tuning
	_time += delta

	var speed_scale := t.punch_charge_move_scale if _phase == Phase.CHARGE else t.punch_ground_speed_scale
	if player.is_on_floor():
		player.apply_horizontal(delta, t.ground_accel, t.ground_decel, t.max_run_speed * speed_scale)
	else:
		player.apply_horizontal(delta, t.air_accel, t.air_decel, t.max_run_speed)
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
	player.punch_area.position.x = player.facing * reach
	player.punch_area.scale = Vector2.ONE * lerpf(1.0, t.punch_charged_hitbox_multiplier, _power)
	player.set_punch_visual(true, reach, _power)
	_set_phase(Phase.ACTIVE)
	_apply_hits()  # land on the first active frame too


func _apply_hits() -> void:
	var t := player.tuning
	var kb := t.punch_knockback * lerpf(1.0, t.punch_charged_knockback_multiplier, _power)
	for body in player.punch_area.get_overlapping_bodies():
		if body == player or body in _already_hit:
			continue
		if body.has_method("take_hit"):
			body.take_hit(player, Vector2(player.facing * kb.x, kb.y))
			_already_hit.append(body)
			player.punch_hit(body)
	for area in player.punch_area.get_overlapping_areas():
		var target := area.get_parent()
		if target is Player and target != player and target.is_bubbled():
			target.revive()
