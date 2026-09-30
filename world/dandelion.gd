@tool
class_name Dandelion
extends Area2D
## A giant dandelion. Jump into its fluffy head to grab a puff and parachute
## down slowly (steer left/right; wind carries you far!). Let go with JUMP or
## PUNCH, or by landing. The head regrows after `regrow` seconds.
## Origin = where the stem meets the ground.

@export var height := 180.0:                ## stem length (px)
	set(v):
		height = v
		_rebuild()
@export var regrow := 1.5

const STEM := Color("6fbf4a")
const FLUFF := Color(1, 1, 1, 0.92)
const SEED := Color("d9cfae")

var _ready_puff := true
var _t := 0.0
var _held := {}  ## Player -> Puff node
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	_rebuild()
	if not Engine.is_editor_hint():
		EventBus.parachute_changed.connect(_on_parachute_changed)


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := CircleShape2D.new()
	shape.radius = 44.0
	_col.shape = shape
	_col.position = Vector2(0, -height)
	queue_redraw()


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw(self)
	if Engine.is_editor_hint() or not _ready_puff:
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p and not p.is_bubbled() and not p.parachute and not p.is_on_floor():
			_ready_puff = false
			p.take_parachute()
			var puff := Puff.new()
			puff.player = p
			p.add_child(puff)
			_held[p] = puff
			Vfx.puff(global_position + Vector2(0, -height), 6, FLUFF, Vector2.UP, TAU, Vector2(20, 60))
			get_tree().create_timer(regrow).timeout.connect(func() -> void: _ready_puff = true)
			break


func _on_parachute_changed(p: Player, holding: bool) -> void:
	if holding or not _held.has(p):
		return
	var puff: Node2D = _held[p]
	_held.erase(p)
	if is_instance_valid(puff):
		Vfx.puff(puff.global_position, 10, FLUFF, Vector2.UP, TAU, Vector2(30, 90))
		puff.queue_free()


func _draw() -> void:
	var sway := sin(_t * 1.6) * 6.0
	var top := Vector2(sway, -height)
	var mid := Vector2(sway * 0.3 - 8.0, -height * 0.5)
	var pts := PackedVector2Array()
	for i in 11:
		var t := float(i) / 10.0
		pts.append(Vector2.ZERO.lerp(mid, t).lerp(mid.lerp(top, t), t))
	draw_polyline(pts, Color("1d1726"), 7.0)
	draw_polyline(pts, STEM, 4.0)
	# Leaves at the base.
	for s: float in [-1.0, 1.0]:
		Art.shape(self, PackedVector2Array([Vector2(0, -4), Vector2(s * 30, -26), Vector2(s * 44, -18), Vector2(s * 12, 0)]), STEM.darkened(0.1), Color("1d1726"), 2.0)
	if _ready_puff or Engine.is_editor_hint():
		draw_fluff(self, top, 1.0, _t)
	else:
		Art.shape(self, Art.ellipse(top, 7, 6, 10), SEED, Color("1d1726"), 2.0)


static func draw_fluff(ci: CanvasItem, c: Vector2, s: float, t: float) -> void:
	ci.draw_circle(c, 40.0 * s, Color(1, 1, 1, 0.25))
	for i in 16:
		var a := TAU * float(i) / 16.0 + sin(t * 2.0 + i) * 0.05
		var tip := c + Vector2(cos(a), sin(a)) * 36.0 * s
		ci.draw_line(c, tip, Color(1, 1, 1, 0.8), 1.5)
		ci.draw_circle(tip, 5.0 * s, FLUFF)
	ci.draw_circle(c, 7.0 * s, SEED)


## The puff carried above a parachuting player.
class Puff extends Node2D:
	var player: Player
	var _t := 0.0

	func _ready() -> void:
		position = Vector2(0, -96)
		z_index = 5

	func _process(delta: float) -> void:
		_t += delta
		rotation = sin(_t * 3.0) * 0.12 - clampf(player.velocity.x / 1200.0, -0.3, 0.3)
		scale.x = 1.0 / player.visual.scale.x if player.visual.scale.x != 0.0 else 1.0
		queue_redraw()

	func _draw() -> void:
		draw_line(Vector2(0, 8), Vector2(0, 50), Color("6fbf4a"), 3.0)
		Dandelion.draw_fluff(self, Vector2.ZERO, 0.8, _t)
