@tool
class_name Signpost
extends Node2D
## Wooden sign on a post with a message (tutorial hints, jokes, directions).
## Origin = bottom of the post. `arrow` adds a pointing arrow board.

@export_multiline var text := "HELLO!":
	set(v):
		text = v
		_rebuild()
@export var width := 300.0:
	set(v):
		width = v
		_rebuild()
@export_enum("None", "Left", "Right") var arrow := 0:
	set(v):
		arrow = v
		queue_redraw()
@export var font_size := 26:
	set(v):
		font_size = v
		_rebuild()

var _label: Label
var _board_h := 80.0


func _ready() -> void:
	z_index = -5
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _label == null:
		_label = Label.new()
		add_child(_label, false, Node.INTERNAL_MODE_FRONT)
	_label.text = text
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	_label.add_theme_font_size_override(&"font_size", font_size)
	_label.add_theme_color_override(&"font_color", Color("3a2616"))
	# Measure the wrapped text with the font itself (reliable in editor + game).
	var font := _label.get_theme_font(&"font")
	var text_h := font.get_multiline_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, width - 24.0, font_size,
			-1, TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND).y
	_board_h = clampf(text_h + 24.0, 56.0, 600.0)
	_label.size = Vector2(width - 24.0, text_h)
	_label.position = Vector2(-width * 0.5 + 12.0, -_board_h - 70.0 + 12.0)
	queue_redraw()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var wood := Color("d9a066")
	Art.shape(self, Art.rect(Vector2(-7, -80), Vector2(7, 0)), wood.darkened(0.3), o, 3.0)
	var a := Vector2(-width * 0.5, -_board_h - 70.0)
	var b := Vector2(width * 0.5, -70.0)
	Art.shape(self, Art.rounded_rect(a, b, 8.0), wood, o, 4.0)
	draw_rect(Rect2(a + Vector2(8, 6), Vector2(width - 16, 5)), wood.lightened(0.2))
	for x: float in [a.x + 12, b.x - 12]:
		draw_circle(Vector2(x, a.y + 14), 3.0, wood.darkened(0.45))
	if arrow != 0:
		var d := -1.0 if arrow == 1 else 1.0
		var tip := Vector2(d * (width * 0.5 + 34.0), -70.0 - _board_h * 0.5)
		var base_x := d * (width * 0.5 - 4.0)
		Art.shape(self, PackedVector2Array([Vector2(base_x, tip.y - 18), Vector2(tip.x - d * 22, tip.y - 18), Vector2(tip.x - d * 22, tip.y - 30),
				tip, Vector2(tip.x - d * 22, tip.y + 30), Vector2(tip.x - d * 22, tip.y + 18), Vector2(base_x, tip.y + 18)]), th.accent, o, 3.0)
