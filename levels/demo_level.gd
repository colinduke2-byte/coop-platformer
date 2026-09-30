extends Level
## Movement playground reached from the character select screen. Sections:
## wardrobe, jump heights, coyote gap, one-way ledges, wall-jump shaft, glide
## canyon, punch & stomp arena. PAUSE opens the pause menu (every Level has one).
## F1 cycles PlayerTuning.glide_mode (dev toggle for this demo only; the change
## lives in memory and isn't saved to player_default.tres).

var _tuning: PlayerTuning = preload("res://player/tuning/player_default.tres")
const DEV_GLIDE_KEY := KEY_F1

var _info: Label


func _ready() -> void:
	super()
	var layer := CanvasLayer.new()
	add_child(layer)
	_info = Label.new()
	_info.add_theme_font_size_override(&"font_size", 22)
	_info.add_theme_color_override(&"font_color", Color.WHITE)
	_info.add_theme_color_override(&"font_outline_color", Color("1d1726"))
	_info.add_theme_constant_override(&"outline_size", 6)
	_info.position = Vector2(30, 990)
	_info.add_theme_font_size_override(&"font_size", 18)
	layer.add_child(_info)
	_refresh_info()


func _unhandled_input(event: InputEvent) -> void:
	var key := event as InputEventKey
	if key and key.pressed and not key.echo and key.physical_keycode == DEV_GLIDE_KEY:
		var modes := PlayerTuning.GlideMode.size()
		_tuning.glide_mode = ((_tuning.glide_mode + 1) % modes) as PlayerTuning.GlideMode
		_refresh_info()


func _refresh_info() -> void:
	var mode: String = PlayerTuning.GlideMode.keys()[_tuning.glide_mode]
	var how := {
		"HOLD_THROUGH": "keep holding jump past the top of the jump",
		"SECOND_PRESS": "press jump again in the air and hold",
		"SEPARATE_BUTTON": "hold G / Numpad 0 / RB in the air",
	}
	_info.text = ("Glide mode: %s  (%s)   [F1 to change]\n" % [mode, how[mode]]
			+ "Move: WASD / arrows / stick    Jump: Space / Enter / A    Punch: L-Shift / R-Shift / X    "
			+ "Sprint: L-Ctrl / R-Ctrl / RT (or double-tap)    Pause (+ all controls): Esc / Backspace / Start")
