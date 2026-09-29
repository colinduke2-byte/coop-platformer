class_name KillZone
extends Area2D
## Bottomless pits, spikes, lava: anything that bubbles a player on touch.


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		body.hurt()
