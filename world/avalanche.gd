@tool
class_name Avalanche
extends Node2D
## RUN! A roaring wall of snow that thunders along to the right while active
## (start it with a ZoneTrigger). Anyone it catches is bubbled. It travels
## `distance` px, then crashes into a harmless heap. Everyone bubbled ->
## it restarts a safe way behind the checkpoint you respawn at.
## Origin = the front of the wave, at ground level, where it starts.

@export var distance := 6000.0
@export var speed := 360.0            ## px/s (a running player does 430, sprinting 610)
@export var height := 900.0           ## how tall the wave is (drawn and deadly), up from the origin
@export var depth := 600.0            ## how far below the origin it reaches
@export var active := false
@export var respawn_lead := 900.0     ## after a restart it waits this far behind the checkpoint...
@export var restart_delay := 2.0      ## ...and starts again after this many seconds
@export var catchup_gap := 850.0      ## farther behind the last player than this, it surges...
@export var catchup_boost := 1.5      ## ...at this times its speed

const SNOW := Color("f4fbff")
const SHADE := Color("c7dcef")
const DARK := Color("9fb9d6")
const OUTLINE := Color("1b2a44")

var _start := Vector2.ZERO
var _travel := 0.0
var _t := 0.0
var _auto := false
var _done := false


func _ready() -> void:
	z_index = 20
	_start = position
	_auto = active
	if not Engine.is_editor_hint():
		EventBus.level_reset.connect(_reset)
		visible = active  # it appears when it starts (surprise!)


func set_active(on: bool) -> void:
	if on and not active and not _done:
		Audio.play("boss_slam", -4.0, 0.6)
		EventBus.screen_shake.emit(0.6)
		if View.rect.size.x > 0.0:
			Vfx.text(View.rect.get_center() + Vector2(0, -View.rect.size.y * 0.25), "AVALANCHE!  RUN!", Color("ff5d5d"), 56)
	active = on and not _done
	if active:
		visible = true
		modulate.a = 1.0


func front_x() -> float:
	return global_position.x


func _reset() -> void:
	_done = false
	active = _auto
	visible = _auto
	modulate.a = 1.0
	_travel = 0.0
	position = _start
	var cp := GameManager.checkpoint
	var back := cp.x - respawn_lead - global_position.x
	if back > 0.0 and back < distance:
		# Respawned mid-chase: wait a moment, then come thundering again.
		_travel = back
		position.x = _start.x + back
		get_tree().create_timer(restart_delay).timeout.connect(func() -> void:
			if not _done and _travel == back:
				set_active(true))


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw_rect(self, Rect2(global_position + Vector2(-1600, -height - 200), Vector2(1800, height + depth + 200)))
	if Engine.is_editor_hint() or _done:
		return
	if active:
		# Rubber band: if everyone is far ahead it surges to stay on screen (drama!).
		var gap := INF
		for n in get_tree().get_nodes_in_group(&"players"):
			if not (n as Player).is_bubbled():
				gap = minf(gap, (n as Player).global_position.x - global_position.x)
		var v := speed * (catchup_boost if gap < INF and gap > catchup_gap else 1.0)
		var step := v * delta
		_travel += step
		position.x += step
		if fmod(_t, 0.5) < delta:
			EventBus.screen_shake.emit(0.12)
		if fmod(_t, 0.12) < delta and View.sees(global_position):
			Vfx.puff(global_position + Vector2(40, randf_range(-height, 0.0)), 3, SNOW, Vector2(1, -0.4).normalized(), 0.8,
					Vector2(40, 120), Vector2(10, 22), 0.5)
		if _travel >= distance:
			_crash()
			return
		for p in get_tree().get_nodes_in_group(&"players"):
			var pl := p as Player
			var y := pl.global_position.y - global_position.y
			if pl.global_position.x < global_position.x - 10.0 and y > -height and y < depth and not pl.is_bubbled():
				pl.hurt()


func _crash() -> void:
	_done = true
	active = false
	EventBus.screen_shake.emit(0.8)
	Audio.play("pound", 0.0, 0.7)
	for i in 5:
		Vfx.puff(global_position + Vector2(0, -i * height / 5.0), 10, SNOW, Vector2.RIGHT, 1.4, Vector2(80, 260), Vector2(14, 30), 0.7)
	var tw := create_tween()
	tw.tween_property(self, ^"modulate:a", 0.0, 1.2)


func _draw() -> void:
	var back := -1500.0
	# Body: a tall slab of tumbling snow with a billowing powder crest on top.
	var front := PackedVector2Array()
	var n := 24
	for i in n + 1:
		var f := float(i) / n
		var y := -height + f * (height + depth)
		var bulge := sin(f * PI) * 90.0 + sin(_t * 6.0 + f * 11.0) * 18.0 + sin(_t * 9.0 + f * 23.0) * 8.0
		front.append(Vector2(bulge - 40.0, y))
	var body := front.duplicate()
	body.append(Vector2(back, depth))
	body.append(Vector2(back, -height))
	var cols := PackedColorArray()
	for q in body:
		cols.append(SHADE.lerp(DARK, clampf(-q.x / -back, 0.0, 1.0) * 0.7))
	draw_polygon(body, cols)
	# Powder crest: big soft puffs rolling forward along the top.
	for i in 16:
		var x := back + fmod(i * 97.0 + _t * 160.0, -back + 60.0)
		var r := 70.0 + (i % 5) * 18.0
		var y := -height + sin(_t * 2.0 + i) * 16.0
		draw_circle(Vector2(x, y), r + 5.0, OUTLINE)
	for i in 16:
		var x := back + fmod(i * 97.0 + _t * 160.0, -back + 60.0)
		var r := 70.0 + (i % 5) * 18.0
		var y := -height + sin(_t * 2.0 + i) * 16.0
		draw_circle(Vector2(x, y), r, SNOW)
		draw_circle(Vector2(x - r * 0.3, y - r * 0.35), r * 0.35, Color(1, 1, 1))
	# Inside: churning clumps that tumble down and forward.
	for i in 22:
		var fx := fmod(i * 0.29, 1.0)
		var fy := fmod(i * 0.137 + _t * 0.3 * (1.0 + (i % 3) * 0.3), 1.0)
		var c := Vector2(back * 0.9 * fx - 60.0, -height + 60.0 + fy * (height + depth - 60.0))
		var r := 22.0 + (i % 4) * 12.0
		draw_circle(c, r + 3.0, DARK)
		draw_circle(c, r, SHADE.lightened(0.35))
	# Tumbling logs.
	for i in 2:
		var c := Vector2(-260.0 - i * 420.0, -height * 0.4 + sin(_t * 1.3 + i) * 140.0)
		var a := _t * (2.0 + i) + i
		var d := Vector2(cos(a), sin(a)) * 70.0
		draw_line(c - d, c + d, Color("2b1d17"), 24.0)
		draw_line(c - d, c + d, Color("7a4e2d"), 16.0)
	# The front: boulders of snow churning along the leading edge.
	for i in 14:
		var f := fmod(i * 0.137 + _t * 0.35, 1.0)
		var y := -height + f * (height + depth)
		var bx := sin(f * PI) * 90.0 - 50.0 - (i % 3) * 40.0
		var r := 34.0 + (i % 4) * 14.0
		draw_circle(Vector2(bx, y), r + 5.0, OUTLINE)
		draw_circle(Vector2(bx, y), r, SNOW)
		draw_circle(Vector2(bx + r * 0.2, y + r * 0.25), r * 0.6, SHADE)
		draw_circle(Vector2(bx - r * 0.05, y - r * 0.05), r * 0.62, SNOW)
		draw_circle(Vector2(bx - r * 0.3, y - r * 0.3), r * 0.35, Color(1, 1, 1))
	draw_polyline(front, Color(1, 1, 1, 0.8), 8.0)
	if Engine.is_editor_hint():
		Art.dotted(self, PackedVector2Array([Vector2.ZERO, Vector2(distance, 0)]), Color(0.4, 0.7, 1.0, 0.9), 24.0, 5.0)
