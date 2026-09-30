@tool
class_name FlameJet
extends Node2D
## Nozzle that blasts on a timer. FIRE bubbles players it touches; STEAM
## launches them upward instead (geysers). It sputters as a warning first.
## Rotate the node to aim (default: straight up). `phase` offsets the timing so
## rows of jets can ripple.

enum Style { FIRE, STEAM }

@export var style := Style.FIRE:
	set(v):
		style = v
		queue_redraw()
@export var length := 220.0:
	set(v):
		length = v
		_rebuild()
@export var on_time := 1.0
@export var off_time := 1.6
@export var warn_time := 0.45
@export_range(0.0, 1.0) var phase := 0.0
@export var steam_push := 1100.0           ## STEAM: launch speed (px/s)

var _t := 0.0
var _area: Area2D
var _flicker := 0.0


func _ready() -> void:
	_t = phase * (on_time + off_time)
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _area == null:
		_area = Area2D.new()
		_area.collision_layer = 32
		_area.collision_mask = 2
		_area.monitorable = false
		add_child(_area, false, Node.INTERNAL_MODE_FRONT)
		var col := CollisionShape2D.new()
		col.shape = RectangleShape2D.new()
		_area.add_child(col)
	var col2 := _area.get_child(0) as CollisionShape2D
	(col2.shape as RectangleShape2D).size = Vector2(44, length)
	col2.position = Vector2(0, -length * 0.5 - 16.0)
	queue_redraw()


func is_on() -> bool:
	return fmod(_t, on_time + off_time) < on_time


func _warning() -> bool:
	var c := fmod(_t, on_time + off_time)
	return c > on_time + off_time - warn_time


var _cooldowns := {}


func _physics_process(delta: float) -> void:
	_t += delta
	_flicker += delta * 20.0
	for k in _cooldowns.keys():
		_cooldowns[k] -= delta
		if _cooldowns[k] <= 0.0:
			_cooldowns.erase(k)
	View.redraw(self, length + 200.0)
	if Engine.is_editor_hint() or not is_on():
		return
	for b in _area.get_overlapping_bodies():
		var p := b as Player
		if p == null:
			continue
		if style == Style.FIRE:
			p.hurt()
		elif not _cooldowns.has(p):
			_cooldowns[p] = 0.3
			p.launch(Vector2.UP.rotated(global_rotation) * steam_push, 0.1)
			EventBus.pad_bounced.emit(p, self, false)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	Art.shape(self, Art.rounded_rect(Vector2(-22, -18), Vector2(22, 4), 4.0), Color("6d7680"), o, 3.0)
	Art.shape(self, Art.rect(Vector2(-14, -26), Vector2(14, -16)), Color("4a4f5c"), o, 2.5)
	var fire := style == Style.FIRE
	var c1 := Color("ff8a3d") if fire else Color(1, 1, 1, 0.75)
	var c2 := Color("ffe45c") if fire else Color(0.85, 0.95, 1.0, 0.9)
	if is_on() or Engine.is_editor_hint():
		var pts := PackedVector2Array([Vector2(-16, -26)])
		var n := 10
		for i in n + 1:
			var k := float(i) / n
			var w := lerpf(16.0, 26.0, sin(k * PI)) + sin(_flicker + k * 9.0) * 4.0
			pts.append(Vector2(-w, -26 - length * k))
		pts.append(Vector2(0, -26 - length - 20))
		for i in range(n, -1, -1):
			var k := float(i) / n
			var w := lerpf(16.0, 26.0, sin(k * PI)) + cos(_flicker * 1.3 + k * 7.0) * 4.0
			pts.append(Vector2(w, -26 - length * k))
		draw_colored_polygon(pts, c1)
		var core := PackedVector2Array()
		for p in pts:
			core.append(Vector2(p.x * 0.5, lerpf(-26.0, p.y, 0.8)))
		draw_colored_polygon(core, c2)
	elif _warning():
		for i in 3:
			draw_circle(Vector2(sin(_flicker + i) * 8.0, -32 - i * 10.0 - fmod(_flicker * 3.0, 10.0)), 5.0 - i, c1)
