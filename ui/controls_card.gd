class_name ControlsCard
extends PanelContainer
## The button key: every button on every device, plus how to do each move.
## Shown from the pause menu ("Controls") and with PAUSE in the lobby.
## Keep in sync with InputRouter's bindings and docs/CONTROLS.md.

## [action, player 1 keyboard, player 2 keyboard, gamepad]
const BUTTONS := [
	["Join", "Space", "Enter", "A"],
	["Move", "W A S D", "Arrow keys", "Left stick / D-pad"],
	["Jump", "Space", "Enter", "A"],
	["Punch", "Left Shift", "Right Shift", "X  or  B"],
	["Sprint (hold)", "Left Ctrl", "Right Ctrl", "RT / LT / LB"],
	["Pause", "Esc", "Backspace", "Start"],
]

## [move, how]
const MOVES := [
	["Sprint", "Hold SPRINT while running, or double-tap a direction and keep holding it"],
	["Hop / big jump", "Tap JUMP for a short hop, hold JUMP for the full jump"],
	["Glide", "In the air, press JUMP again and hold it"],
	["Wall jump", "Press JUMP next to a wall. Hold toward the wall to climb it, away to leap off"],
	["Charged punch", "Hold PUNCH, let go to throw it (breaks iron crates)"],
	["Uppercut", "UP + PUNCH (in the air it lifts you once)"],
	["Ground pound", "DOWN + PUNCH in the air (then JUMP right away = pound jump)"],
	["Crouch / slide", "DOWN. While running = belly slide, JUMP out of it = long jump"],
	["Drop through", "DOWN + JUMP on a wooden ledge"],
	["Ledges", "Caught automatically. Hold toward to climb up, JUMP to hop up"],
	["Stomp", "Land on enemies. Hold JUMP to bounce higher"],
	["Revive", "Punch a teammate's bubble"],
]

const HEAD := Color("6a4bc4")


func _init() -> void:
	add_theme_stylebox_override(&"panel", UIStyle.panel())
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 14)
	add_child(v)

	var title := UIStyle.label("Controls", 48)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(title)

	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override(&"h_separation", 36)
	grid.add_theme_constant_override(&"v_separation", 4)
	v.add_child(grid)
	for h: String in ["", "Player 1 keyboard", "Player 2 keyboard", "Gamepad"]:
		grid.add_child(UIStyle.label(h, 22, HEAD))
	for row: Array in BUTTONS:
		for i in row.size():
			grid.add_child(UIStyle.label(row[i], 22, UIStyle.ACCENT if i == 0 else UIStyle.INK))

	var sep := ColorRect.new()
	sep.color = Color(UIStyle.INK, 0.15)
	sep.custom_minimum_size = Vector2(0, 3)
	v.add_child(sep)

	var moves := GridContainer.new()
	moves.columns = 2
	moves.add_theme_constant_override(&"h_separation", 24)
	moves.add_theme_constant_override(&"v_separation", 2)
	v.add_child(moves)
	for row: Array in MOVES:
		moves.add_child(UIStyle.label(row[0], 20, UIStyle.ACCENT))
		moves.add_child(UIStyle.label(row[1], 20))

	var hint := UIStyle.label("Press JUMP, PUNCH or PAUSE to close", 18, Color(UIStyle.INK, 0.6))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(hint)


## A full-screen overlay (dim + centred card) to add to a CanvasLayer / Control.
static func overlay() -> Control:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var dim := ColorRect.new()
	dim.color = Color(0.08, 0.05, 0.15, 0.6)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)
	center.add_child(ControlsCard.new())
	return root
