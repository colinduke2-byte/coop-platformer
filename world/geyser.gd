@tool
class_name Geyser
extends Area2D
## A hot spring vent. Bubbles for a moment (the tell), then erupts: a tall
## water column that launches anyone standing in it high into the air (an
## uncuttable launch, like a bounce pad). `always_on` = a steady fountain you
## can ride. Origin = the vent, on the ground.

@export var height := 420.0:                ## how high the column reaches (px)
	set(v):
		height = v
		_rebuild()
@export var width := 70.0:
	set(v):
		width = v
		_rebuild()
@export var launch_speed := 1250.0          ## px/s upward
@export var calm_time := 1.8
@export var warn_time := 0.7
@export var erupt_time := 1.2
@export var phase := 0.0                    ## s offset into the cycle
@export var always_on := false

const WATER := Color(0.55, 0.85, 1.0, 0.8)
const FOAM := Color(1, 1, 1, 0.9)
const ROCK := Color("8a7a70")

enum St { CALM, WARN, ERUPT }

var st := St.CALM
var _timer := 0.0
var _t := 0.0
var _rise := 0.0      ## 0..1 column height
var _col: CollisionShape2D
var _cooldown := {}   ## Player -> s


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	_rebuild()
	_timer = calm_time - fposmod(phase, calm_time + warn_time + erupt_time)
	if always_on:
		st = St.ERUPT
		_rise = 1.0


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width, height)
	_col.shape = shape
	_col.position = Vector2(0, -height * 0.5)
	queue_redraw()


func is_erupting() -> bool:
	return st == St.ERUPT


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw(self, height)
	if Engine.is_editor_hint():
		return
	for p in _cooldown.keys():
		_cooldown[p] -= delta
		if _cooldown[p] <= 0.0:
			_cooldown.erase(p)
	if not always_on:
		_timer -= delta
		match st:
			St.CALM:
				_rise = move_toward(_rise, 0.0, delta * 3.0)
				if _timer <= 0.0:
					st = St.WARN
					_timer = warn_time
			St.WARN:
				if _timer <= 0.0:
					st = St.ERUPT
					_timer = erupt_time
					EventBus.screen_shake.emit(0.15)
			St.ERUPT:
				_rise = move_toward(_rise, 1.0, delta * 6.0)
				if _timer <= 0.0:
					st = St.CALM
					_timer = calm_time
	if st != St.ERUPT:
		return
	var top := global_position.y - height * _rise
	for b in get_overlapping_bodies():
		var p := b as Player
		if p == null or p.is_bubbled() or _cooldown.has(p) or p.global_position.y < top:
			continue
		_cooldown[p] = 0.25
		p.launch(Vector2(p.velocity.x, -launch_speed))
		p.drop_parachute()


func _draw() -> void:
	var o := Color("1d1726")
	# Rocky vent.
	Art.shape(self, PackedVector2Array([Vector2(-width * 0.8, 0), Vector2(-width * 0.5, -18), Vector2(-width * 0.2, -14),
			Vector2(width * 0.2, -14), Vector2(width * 0.5, -18), Vector2(width * 0.8, 0)]), ROCK, o, 2.5)
	var show := _rise if not Engine.is_editor_hint() else 1.0
	if st == St.WARN or (Engine.is_editor_hint() and false):
		for i in 5:
			var y := -14.0 - fposmod(_t * 90.0 + i * 13.0, 60.0)
			draw_circle(Vector2(sin(i * 2.3 + _t * 5.0) * width * 0.25, y), 4.0 + i % 3, Color(1, 1, 1, 0.7))
	if show <= 0.01:
		if Engine.is_editor_hint():
			draw_rect(Rect2(-width * 0.5, -height, width, height), Color(WATER, 0.15), false, 2.0)
		return
	var h := height * show
	var w := width * 0.5
	var pts := PackedVector2Array([Vector2(-w * 0.7, -10)])
	var n := 12
	for i in n + 1:
		var t := float(i) / n
		pts.append(Vector2(-w * (0.7 + 0.3 * t) + sin(_t * 9.0 + t * 8.0) * 4.0, -10 - h * t))
	for i in range(n, -1, -1):
		var t := float(i) / n
		pts.append(Vector2(w * (0.7 + 0.3 * t) + sin(_t * 9.0 + t * 8.0 + 2.0) * 4.0, -10 - h * t))
	draw_colored_polygon(pts, WATER)
	draw_rect(Rect2(-w * 0.25, -10 - h, w * 0.3, h), Color(1, 1, 1, 0.35))
	# Foamy crown.
	for i in 7:
		var a := TAU * float(i) / 7.0 + _t * 2.0
		draw_circle(Vector2(cos(a) * w * 0.9, -10 - h + sin(a) * 10.0), 12.0, FOAM)
	for i in 6:
		var y := -10 - fposmod(_t * 400.0 + i * 70.0, h)
		draw_circle(Vector2(sin(i * 1.7) * w * 0.6, y), 5.0, FOAM)
