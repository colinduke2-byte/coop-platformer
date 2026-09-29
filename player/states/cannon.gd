extends PlayerState
## Sitting inside a BarrelCannon, waiting to be fired (JUMP, or automatic).
## The barrel owns aiming and firing; we just stay hidden in it.


func enter(_previous: StringName) -> void:
	player.velocity = Vector2.ZERO
	player.sprint = 0.0
	player.glide_armed = false
	player.visual.visible = false
	player.set_crouched(false)


func exit() -> void:
	player.visual.visible = true
	player.cannon = null


func physics_update(_delta: float) -> void:
	var c := player.cannon
	if not is_instance_valid(c):
		machine.transition_to(&"Fall")
		return
	player.velocity = Vector2.ZERO
	player.global_position = c.global_position + Vector2(0, 30)
	if player.wants_jump():
		player.consume_jump()
		c.fire(player)
