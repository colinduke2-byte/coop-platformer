class_name PlayerInput
extends RefCounted
## Per-player input view. States ask this, never Input directly, so every
## player works identically whether on keyboard or gamepad.

var slot: int
var enabled := true
var _p: String


func _init(p_slot: int) -> void:
	slot = p_slot
	_p = "p%d_" % slot


## False if this slot's device was unbound (e.g. player left).
func is_active() -> bool:
	return enabled and InputMap.has_action(_p + "jump")


func move_x() -> float:
	if not is_active():
		return 0.0
	return Input.get_axis(_p + "move_left", _p + "move_right")


func move_y() -> float:
	if not is_active():
		return 0.0
	return Input.get_axis(_p + "move_up", _p + "move_down")


## Mostly-down on the stick (diagonal down-forward on a keyboard counts too):
## crouch, slide, ground pound, drop through ledges, fast fall.
func down_held() -> bool:
	var y := move_y()
	return y > 0.6 and y >= absf(move_x()) * 0.9


## Mostly-up: uppercut.
func up_held() -> bool:
	var y := move_y()
	return y < -0.6 and -y >= absf(move_x()) * 0.9


func jump_pressed() -> bool:
	return is_active() and Input.is_action_just_pressed(_p + "jump")


func jump_held() -> bool:
	return is_active() and Input.is_action_pressed(_p + "jump")


func glide_held() -> bool:
	return is_active() and Input.is_action_pressed(_p + "glide")


func attack_pressed() -> bool:
	return is_active() and Input.is_action_just_pressed(_p + "attack")


func attack_held() -> bool:
	return is_active() and Input.is_action_pressed(_p + "attack")


func pause_pressed() -> bool:
	return is_active() and Input.is_action_just_pressed(_p + "pause")
