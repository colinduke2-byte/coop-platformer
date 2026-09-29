extends Node
## Maps physical devices to player slots (0-3) and builds per-slot InputMap
## actions named "p<slot>_<action>", e.g. "p0_jump".
##
## Unjoined devices join by pressing their join button:
##   Keyboard (left side)  : SPACE  - WASD move, SPACE jump, F attack, G glide
##   Keyboard (right side) : ENTER  - arrows move, ENTER jump, SHIFT attack, R-CTRL glide
##   Gamepad               : A / START - A jump, X/B attack, RB glide
## (glide action is only used when PlayerTuning.glide_mode is SEPARATE_BUTTON)
## Player code never reads devices directly; it goes through PlayerInput.

signal join_requested(slot: int)

const MAX_PLAYERS := 4
const ACTIONS: Array[StringName] = [
	&"move_left", &"move_right", &"move_up", &"move_down", &"jump", &"attack", &"glide", &"pause",
]

enum DeviceKind { KEYBOARD_LEFT, KEYBOARD_RIGHT, JOYPAD }

const KEYS_LEFT := {
	&"move_left": KEY_A, &"move_right": KEY_D, &"move_up": KEY_W, &"move_down": KEY_S,
	&"jump": KEY_SPACE, &"attack": KEY_F, &"glide": KEY_G, &"pause": KEY_ESCAPE,
}
const KEYS_RIGHT := {
	&"move_left": KEY_LEFT, &"move_right": KEY_RIGHT, &"move_up": KEY_UP, &"move_down": KEY_DOWN,
	&"jump": KEY_ENTER, &"attack": KEY_SHIFT, &"glide": KEY_CTRL, &"pause": KEY_BACKSPACE,
}
const STICK_DEADZONE := 0.25

## slot -> { "kind": DeviceKind, "id": int }
var _slots: Dictionary = {}


func _ready() -> void:
	Input.joy_connection_changed.connect(_on_joy_connection_changed)


func _unhandled_input(event: InputEvent) -> void:
	var device := _device_for_join_event(event)
	if device.is_empty() or find_slot(device["kind"], device["id"]) != -1:
		return
	var slot := _first_free_slot()
	if slot == -1:
		return
	bind_slot(slot, device["kind"], device["id"])
	get_viewport().set_input_as_handled()
	join_requested.emit(slot)


static func action_name(slot: int, action: StringName) -> StringName:
	return StringName("p%d_%s" % [slot, action])


func get_bound_slots() -> Array[int]:
	var result: Array[int] = []
	for slot: int in _slots:
		result.append(slot)
	result.sort()
	return result


func find_slot(kind: int, id: int) -> int:
	for slot: int in _slots:
		var d: Dictionary = _slots[slot]
		if d["kind"] == kind and (kind != DeviceKind.JOYPAD or d["id"] == id):
			return slot
	return -1


func bind_slot(slot: int, kind: int, id: int = 0) -> void:
	_slots[slot] = {"kind": kind, "id": id}
	for action in ACTIONS:
		var n := action_name(slot, action)
		if InputMap.has_action(n):
			InputMap.action_erase_events(n)
		else:
			InputMap.add_action(n, STICK_DEADZONE)
	match kind:
		DeviceKind.KEYBOARD_LEFT:
			_bind_keys(slot, KEYS_LEFT)
		DeviceKind.KEYBOARD_RIGHT:
			_bind_keys(slot, KEYS_RIGHT, true)
		DeviceKind.JOYPAD:
			_bind_joypad(slot, id)


func unbind_slot(slot: int) -> void:
	_slots.erase(slot)
	for action in ACTIONS:
		var n := action_name(slot, action)
		if InputMap.has_action(n):
			InputMap.erase_action(n)


func _bind_keys(slot: int, map: Dictionary, right_side := false) -> void:
	for action: StringName in map:
		var ev := InputEventKey.new()
		ev.physical_keycode = map[action]
		if right_side and map[action] == KEY_CTRL:
			ev.location = KEY_LOCATION_RIGHT  # Right Ctrl only, so left Ctrl stays free
		InputMap.action_add_event(action_name(slot, action), ev)


func _bind_joypad(slot: int, id: int) -> void:
	_add_axis(slot, &"move_left", id, JOY_AXIS_LEFT_X, -1.0)
	_add_axis(slot, &"move_right", id, JOY_AXIS_LEFT_X, 1.0)
	_add_axis(slot, &"move_up", id, JOY_AXIS_LEFT_Y, -1.0)
	_add_axis(slot, &"move_down", id, JOY_AXIS_LEFT_Y, 1.0)
	_add_button(slot, &"move_left", id, JOY_BUTTON_DPAD_LEFT)
	_add_button(slot, &"move_right", id, JOY_BUTTON_DPAD_RIGHT)
	_add_button(slot, &"move_up", id, JOY_BUTTON_DPAD_UP)
	_add_button(slot, &"move_down", id, JOY_BUTTON_DPAD_DOWN)
	_add_button(slot, &"jump", id, JOY_BUTTON_A)
	_add_button(slot, &"attack", id, JOY_BUTTON_X)
	_add_button(slot, &"attack", id, JOY_BUTTON_B)
	_add_button(slot, &"glide", id, JOY_BUTTON_RIGHT_SHOULDER)
	_add_button(slot, &"pause", id, JOY_BUTTON_START)


func _add_axis(slot: int, action: StringName, id: int, axis: JoyAxis, value: float) -> void:
	var ev := InputEventJoypadMotion.new()
	ev.device = id
	ev.axis = axis
	ev.axis_value = value
	InputMap.action_add_event(action_name(slot, action), ev)


func _add_button(slot: int, action: StringName, id: int, button: JoyButton) -> void:
	var ev := InputEventJoypadButton.new()
	ev.device = id
	ev.button_index = button
	InputMap.action_add_event(action_name(slot, action), ev)


func _device_for_join_event(event: InputEvent) -> Dictionary:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_SPACE:
			return {"kind": DeviceKind.KEYBOARD_LEFT, "id": 0}
		if event.physical_keycode == KEY_ENTER:
			return {"kind": DeviceKind.KEYBOARD_RIGHT, "id": 0}
	elif event is InputEventJoypadButton and event.pressed:
		if event.button_index == JOY_BUTTON_A or event.button_index == JOY_BUTTON_START:
			return {"kind": DeviceKind.JOYPAD, "id": event.device}
	return {}


func _first_free_slot() -> int:
	for i in MAX_PLAYERS:
		if not _slots.has(i):
			return i
	return -1


func _on_joy_connection_changed(device: int, connected: bool) -> void:
	if connected:
		return
	var slot := find_slot(DeviceKind.JOYPAD, device)
	if slot != -1:
		EventBus.device_lost.emit(slot)
