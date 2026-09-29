class_name WardrobePedestal
extends Area2D
## Stand on it and press UP to become this character. Place it with its origin
## on the floor (like players). Builds its own visuals: plinth, statue, name.

const PLINTH_SIZE := Vector2(110, 26)
const TRIGGER_SIZE := Vector2(110, 120)
const UP_THRESHOLD := -0.6
const STATUE_TINT := Color(1, 1, 1, 0.9)
const LABEL_Y := -190.0  ## same height for every pedestal so the row reads cleanly

@export var character: CharacterDef

var _statue: CharacterRig
var _up_held := {}  ## Player -> bool, for edge detection per player


func _ready() -> void:
	collision_layer = 32  # triggers
	collision_mask = 2    # players
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = TRIGGER_SIZE
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -TRIGGER_SIZE.y * 0.5)
	add_child(col)

	var plinth := Polygon2D.new()
	var w := PLINTH_SIZE.x * 0.5
	plinth.polygon = PackedVector2Array([
		Vector2(-w, 0), Vector2(-w + 8, -PLINTH_SIZE.y), Vector2(w - 8, -PLINTH_SIZE.y), Vector2(w, 0)])
	plinth.color = Color("e8dcc8")
	add_child(plinth)

	if character == null:
		return
	_statue = CharacterRig.new()
	_statue.position = Vector2(0, -PLINTH_SIZE.y)
	_statue.modulate = STATUE_TINT
	add_child(_statue)
	_statue.build(character)

	var label := Label.new()
	label.text = "%s\nUP to wear" % character.display_name
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override(&"font_size", 20)
	label.add_theme_color_override(&"font_color", character.main_color.darkened(0.2))
	label.size = Vector2(200, 50)
	label.position = Vector2(-100, LABEL_Y)
	add_child(label)


func _physics_process(delta: float) -> void:
	if _statue:
		_statue.update_pose(&"Ground", Vector2.ZERO, true, 1.0, delta)
	for body in get_overlapping_bodies():
		var p := body as Player
		if p == null or p.is_bubbled():
			continue
		var up := p.input.move_y() < UP_THRESHOLD
		if up and not _up_held.get(p, false) and p.character != character:
			p.set_character(character)
		_up_held[p] = up
