@tool
class_name PressurePlate
extends Area2D
## Floor plate: ON while at least `required` players stand on it (co-op
## puzzles: need two friends on two plates, or two on one). `latch` keeps it
## on once pressed. Origin = centre of the plate's base.

signal toggled(on: bool)

@export var targets: Array[NodePath] = []:
	set(v):
		targets = v
		queue_redraw()
@export var required := 1                   ## players needed on the plate at once
@export var latch := false
@export var width := 96.0

var on := false


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width - 12.0, 24.0)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -12)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var n := 0
	for b in get_overlapping_bodies():
		if b is Player and not b.is_bubbled():
			n += 1
	var want := n >= required or (latch and on)
	if want != on:
		on = want
		Activation.send(self, targets, on)
		toggled.emit(on)
		queue_redraw()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var h := 4.0 if on else 10.0
	Art.shape(self, Art.rect(Vector2(-width * 0.5, -4), Vector2(width * 0.5, 0)), th.outline, th.outline, 0.0)
	Art.shape(self, Art.rounded_rect(Vector2(-width * 0.5 + 6, -4 - h), Vector2(width * 0.5 - 6, -4), 3.0),
			Color("5fd35a") if on else th.accent, th.outline, 2.5)
	if required > 1:
		for i in required:
			draw_circle(Vector2((float(i) - (required - 1) * 0.5) * 14.0, -4 - h * 0.5), 3.0, Color.WHITE)
	Activation.draw_links(self, targets)
