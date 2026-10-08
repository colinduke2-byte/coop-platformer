@tool
class_name TideWater
extends Water
## Water whose surface rises and falls like a tide (the bottom stays put).
## `amplitude` px between high and low tide, `period` s for a full cycle.
## Tide pools: platforms that are dry at low tide become swims at high tide.

@export var amplitude := 120.0
@export var period := 7.0
@export var phase := 0.0                  ## 0..1 into the cycle

var _base_y := 0.0
var _base_h := 0.0
var _tt := 0.0


func _ready() -> void:
	super()
	_base_y = position.y
	_base_h = size.y


## 0 = high tide, 1 = low tide.
func ebb() -> float:
	return 0.5 - 0.5 * cos((_tt / period + phase) * TAU)


func _physics_process(delta: float) -> void:
	if not Engine.is_editor_hint():
		_tt += delta
		var off := ebb() * amplitude
		position.y = _base_y + off
		var h := _base_h - off
		if absf(h - size.y) > 0.5:
			size = Vector2(size.x, h)
	super(delta)
