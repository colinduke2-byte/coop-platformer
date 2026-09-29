extends CanvasLayer
## Minimal HUD: Lum counter + join hint. Listens only to EventBus.

@onready var _lums: Label = $Margin/VBox/Lums
@onready var _hint: Label = $Margin/VBox/JoinHint


func _ready() -> void:
	EventBus.lums_changed.connect(func(total: int) -> void: _lums.text = "Lums: %d" % total)
	EventBus.player_joined.connect(func(_p: Player) -> void: _refresh_hint())
	_lums.text = "Lums: %d" % GameManager.lums
	_refresh_hint()


func _refresh_hint() -> void:
	var n := InputRouter.get_bound_slots().size()
	_hint.visible = n < InputRouter.MAX_PLAYERS
	_hint.text = ("Press SPACE (WASD), ENTER (arrows) or A (gamepad) to join"
			if n == 0 else "%d/4 players - more can join anytime" % n)
