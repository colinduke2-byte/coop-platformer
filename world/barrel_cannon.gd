@tool
class_name BarrelCannon
extends Area2D
## Hop in, get fired out. Rotate the node to aim (the barrel points UP when
## rotation = 0). JUMP fires, or set `auto_fire_time`. `sweep_degrees` makes it
## rock back and forth so you have to time your shot. Chain them!
## The editor draws the shot direction.

@export var launch_speed := 1250.0
@export var auto_fire_time := 0.0           ## s until it fires by itself (0 = wait for JUMP)
@export var sweep_degrees := 0.0            ## rocks +- this many degrees around its aim
@export var sweep_speed := 1.5              ## sweeps per second (ish)
@export var steer_lock := 0.35              ## s of ignored steering after firing

const RELOAD := 0.35

var _base_rotation := 0.0
var _t := 0.0
var _occupants := {}   ## Player -> time inside
var _cooldowns := {}
var _recoil := 0.0


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	_base_rotation = rotation
	var shape := CircleShape2D.new()
	shape.radius = 40.0
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func _physics_process(delta: float) -> void:
	_t += delta
	_recoil = maxf(_recoil - delta * 4.0, 0.0)
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	if sweep_degrees != 0.0:
		rotation = _base_rotation + deg_to_rad(sweep_degrees) * sin(_t * sweep_speed * TAU * 0.5)
	for p in _cooldowns.keys():
		_cooldowns[p] -= delta
		if _cooldowns[p] <= 0.0:
			_cooldowns.erase(p)
	for b in get_overlapping_bodies():
		var p := b as Player
		if p and not p.is_bubbled() and not _cooldowns.has(p) and not _occupants.has(p) \
				and p.state_machine.current_name() != &"Cannon":
			_occupants[p] = 0.0
			p.enter_cannon(self)
			_recoil = 0.6
	for p in _occupants.keys():
		if not is_instance_valid(p) or p.state_machine.current_name() != &"Cannon":
			_occupants.erase(p)
			continue
		_occupants[p] += delta
		if auto_fire_time > 0.0 and _occupants[p] >= auto_fire_time:
			fire(p)


func fire(p: Player) -> void:
	var dir := Vector2.UP.rotated(global_rotation)
	_occupants.erase(p)
	_cooldowns[p] = RELOAD
	p.global_position = global_position + dir * 50.0 + Vector2(0, 30)
	p.launch(dir * launch_speed, steer_lock if absf(dir.x) > 0.3 else 0.0)
	_recoil = 1.0
	EventBus.cannon_fired.emit(self, p)
	EventBus.screen_shake.emit(0.2)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var wood := Color("a8683a")
	var k := _recoil
	# Barrel (pointing up in local space).
	var body := Art.rounded_rect(Vector2(-32, -44 + k * 8.0), Vector2(32, 36), 10.0)
	Art.shape(self, body, wood, o, 4.0)
	for y: float in [-30.0 + k * 8.0, 20.0]:
		draw_rect(Rect2(-33, y, 66, 8), Color("6d7680"))
	Art.shape(self, Art.ellipse(Vector2(0, -44 + k * 8.0), 30, 9, 16), Color("3a2616"), o, 3.0)
	# Star badge.
	Art.shape(self, Art.star(Vector2(0, 0), 12.0), th.accent, o, 2.0)
	if Engine.is_editor_hint():
		Art.dotted(self, PackedVector2Array([Vector2(0, -50), Vector2(0, -300)]), Color(1, 1, 1, 0.7), 16.0, 3.0)
		if sweep_degrees != 0.0:
			for s: float in [-1.0, 1.0]:
				var d := Vector2.UP.rotated(deg_to_rad(sweep_degrees) * s)
				draw_line(d * 50.0, d * 200.0, Color(1, 1, 1, 0.3), 2.0)
