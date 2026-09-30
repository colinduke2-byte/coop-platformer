@tool
class_name SnoozlingCage
extends Area2D
## A wooden cage with a sleepy SNOOZLING inside (one hidden in every World 1
## level). Punch it or ground-pound it open: the Snoozling wakes up, does a
## happy hop and floats off, and the rescue is saved. Already rescued in an
## earlier run? The cage still appears (and can be opened again for fun).
## Origin = bottom centre of the cage. `hanging` hangs it from a rope above.

@export var hanging := false:
	set(v):
		hanging = v
		queue_redraw()
@export var fur := Color("ffb3d9"):         ## the Snoozling's colour
	set(v):
		fur = v
		queue_redraw()

const WOOD := Color("9a6533")
const WOOD_LIGHT := Color("c98a4b")
const O := Color("1d1726")

var _t := 0.0
var _opened := false
var _critter: Node2D


func _ready() -> void:
	collision_layer = 4   # punchable, like enemies and crates
	collision_mask = 0
	monitoring = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(70, 80)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -40)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _process(delta: float) -> void:
	_t += delta
	View.redraw(self)


func take_hit(_by: Player, _knockback: Vector2) -> void:
	if _opened or Engine.is_editor_hint():
		return
	_opened = true
	set_deferred(&"collision_layer", 0)
	Vfx.puff(global_position + Vector2(0, -40), 14, WOOD_LIGHT, Vector2.UP, TAU, Vector2(80, 220))
	Vfx.confetti(global_position + Vector2(0, -60))
	EventBus.snoozling_rescued.emit(global_position)
	# The freed critter hops, spins and floats away.
	_critter = Freed.new()
	_critter.fur = fur
	_critter.position = position + Vector2(0, -34)
	get_parent().add_child(_critter)
	queue_redraw()


func _draw() -> void:
	var sway := sin(_t * 1.8) * 0.06 if hanging else 0.0
	if hanging:
		draw_line(Vector2(0, -84), Vector2(0, -400), O, 4.0)
		draw_line(Vector2(0, -84), Vector2(0, -400), WOOD_LIGHT, 2.0)
	draw_set_transform(Vector2(0, -84), sway)
	var top := Vector2(0, 0)
	if not _opened:
		draw_snoozling(self, Vector2(0, 54), fur, _t, true)
		for i in 5:  # bars
			var x := -30.0 + i * 15.0
			draw_line(top + Vector2(x, 6), top + Vector2(x, 80), O, 6.0)
			draw_line(top + Vector2(x, 6), top + Vector2(x, 80), WOOD_LIGHT, 3.5)
		# Zzz
		for k in 3:
			var ph := fposmod(_t * 0.6 + k * 0.33, 1.0)
			var p := Vector2(30 + ph * 26.0, 20 - ph * 50.0)
			draw_string(ThemeDB.fallback_font, p, "z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(14 + ph * 10), Color(1, 1, 1, 1.0 - ph))
	else:
		for i in 3:  # broken stubs
			draw_line(top + Vector2(-30 + i * 30, 70), top + Vector2(-28 + i * 30, 80), WOOD_LIGHT, 4.0)
	# Roof and floor.
	Art.shape(self, PackedVector2Array([Vector2(-40, 8), Vector2(0, -10), Vector2(40, 8)]), WOOD, O, 3.0)
	Art.shape(self, Art.rounded_rect(Vector2(-38, 76), Vector2(38, 86), 3.0), WOOD, O, 3.0)
	draw_circle(Vector2(0, -12), 5.0, WOOD.darkened(0.2))
	draw_set_transform(Vector2.ZERO, 0.0)


## A round fuzzball with tiny wings and big sleepy eyes.
static func draw_snoozling(ci: CanvasItem, c: Vector2, col: Color, t: float, asleep: bool) -> void:
	var breathe := sin(t * 2.0) * 1.5 if asleep else 0.0
	c.y -= 16.0
	for s: float in [-1.0, 1.0]:
		var flap := 0.0 if asleep else sin(t * 20.0) * 6.0
		Art.shape(ci, PackedVector2Array([c + Vector2(s * 10, -4), c + Vector2(s * 24, -12 - flap), c + Vector2(s * 22, 2)]), Color(1, 1, 1, 0.9), O, 2.0)
	Art.shape(ci, Art.ellipse(c, 17.0 + breathe * 0.3, 15.0 + breathe, 18), col, O, 2.5)
	ci.draw_circle(c + Vector2(-6, -6), 4.0, Color(1, 1, 1, 0.5))
	if asleep:
		ci.draw_arc(c + Vector2(-6, 0), 3.5, 0.2, PI - 0.2, 6, O, 2.0)
		ci.draw_arc(c + Vector2(6, 0), 3.5, 0.2, PI - 0.2, 6, O, 2.0)
	else:
		for s: float in [-1.0, 1.0]:
			ci.draw_circle(c + Vector2(s * 6, -2), 4.0, Color.WHITE)
			ci.draw_circle(c + Vector2(s * 6 + 1, -1), 2.2, O)
		ci.draw_arc(c + Vector2(0, 5), 4.0, 0.3, PI - 0.3, 6, O, 2.0)
	ci.draw_circle(c + Vector2(-11, 5), 3.0, Color(1, 0.4, 0.5, 0.4))
	ci.draw_circle(c + Vector2(11, 5), 3.0, Color(1, 0.4, 0.5, 0.4))


## The rescued Snoozling: hops, twirls and floats off-screen.
class Freed extends Node2D:
	var fur := Color.PINK
	var _t := 0.0

	func _ready() -> void:
		z_index = 30
		var tw := create_tween()
		tw.tween_property(self, ^"position", position + Vector2(0, -70), 0.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
		tw.tween_property(self, ^"position", position + Vector2(0, -20), 0.25).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_QUAD)
		tw.tween_property(self, ^"position", position + Vector2(40, -520), 2.2).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(self, ^"modulate:a", 0.0, 1.0).set_delay(1.2)
		tw.tween_callback(queue_free)

	func _process(delta: float) -> void:
		_t += delta
		queue_redraw()

	func _draw() -> void:
		SnoozlingCage.draw_snoozling(self, Vector2(0, 16), fur, _t, false)
		if _t < 1.2:
			draw_string(ThemeDB.fallback_font, Vector2(-60, -40), "Thank you!", HORIZONTAL_ALIGNMENT_CENTER, 120, 22, Color.WHITE)
