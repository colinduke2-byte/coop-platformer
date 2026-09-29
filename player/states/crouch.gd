extends PlayerState
## Crouching / crawling (hold DOWN on the ground). Lower hitbox: crawl through
## tight gaps. DOWN + JUMP on a one-way ledge drops through it.


func enter(_previous: StringName) -> void:
	player.set_crouched(true)
	player.sprint = 0.0


func exit() -> void:
	player.set_crouched(false)


func physics_update(delta: float) -> void:
	var t := player.tuning
	player.apply_horizontal(delta, t.ground_accel, t.ground_decel, t.crawl_speed)
	player.apply_gravity(delta)

	if player.wants_jump():
		if player.try_drop_through():
			return
		if player.can_stand():
			player.do_jump()
			machine.transition_to(&"Jump")
			return
	if not player.is_on_floor():
		machine.transition_to(&"Fall")
		return
	if player.input.attack_pressed() and player.can_stand():
		machine.transition_to(&"Punch")
		return
	if not player.input.down_held() and player.can_stand():
		machine.transition_to(&"Ground")
		return
