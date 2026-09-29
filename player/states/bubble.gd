extends PlayerState
## "Dead" in co-op: float in a bubble toward the camera until a teammate
## touches or punches you. When everyone is bubbled, GameManager restarts
## from the checkpoint.


func enter(_previous: StringName) -> void:
	player.set_bubbled_physics(true)
	player.velocity = Vector2.ZERO


func exit() -> void:
	player.set_bubbled_physics(false)


func physics_update(delta: float) -> void:
	var t := player.tuning
	var anchor := player.global_position
	var cam := player.get_viewport().get_camera_2d()
	if cam:
		anchor = cam.get_screen_center_position()
	var desired := (anchor - player.global_position) * t.bubble_follow_strength
	desired += Vector2(player.input.move_x(), player.input.move_y()) * t.bubble_steer_speed
	player.velocity = player.velocity.lerp(desired, clampf(4.0 * delta, 0.0, 1.0))

	for body in player.bubble_area.get_overlapping_bodies():
		if body is Player and body != player and not body.is_bubbled():
			player.revive()
			return
