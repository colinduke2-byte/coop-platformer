class_name Checkpoint
extends Area2D
## Touch to set the respawn point. Also frees every bubbled player.

var _reached := false


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if _reached or not body is Player:
		return
	_reached = true
	$Flag.color = Color("7be07b")
	EventBus.checkpoint_reached.emit(global_position)
