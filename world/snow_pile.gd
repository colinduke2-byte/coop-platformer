@tool
class_name SnowPile
extends Area2D
## A heap of snow. PUNCH it (or slide into it) and a Snowball rolls out the
## other side, growing as it goes and bowling over enemies, crates and cracked
## walls. The heap piles back up after `regrow` seconds. Origin = ground centre.

@export var regrow := 1.6
@export var ball_speed := 420.0
@export var ball_max_radius := 72.0

const SNOW := Color("f4fbff")
const SHADE := Color("c7dcef")

var _ready_ball := true
var _grow := 1.0          ## 0..1 how piled-up it looks


func _ready() -> void:
	collision_layer = 4    # punchable (the punch hitbox scans the enemies layer)
	collision_mask = 0
	var col := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(110, 60)
	col.shape = shape
	col.position = Vector2(0, -30)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func take_hit(by: Player, _knockback: Vector2) -> void:
	var dir := 1.0
	if by:
		dir = signf(global_position.x - by.global_position.x)
		if dir == 0.0:
			dir = float(by.facing)
	launch(dir)


## Push a snowball out toward `dir` (+1 right, -1 left).
func launch(dir: float) -> Snowball:
	if not _ready_ball:
		return null
	_ready_ball = false
	_grow = 0.0
	var ball := Snowball.new()
	ball.direction = dir
	ball.speed = ball_speed
	ball.max_radius = ball_max_radius
	ball.position = position + Vector2(dir * 70.0, -4.0)
	get_parent().add_child(ball)
	ball.velocity.x = dir * ball_speed
	Vfx.puff(global_position + Vector2(dir * 40.0, -40), 8, SNOW, Vector2(dir, -0.6).normalized(), 1.0)
	Audio.play("punch_hit", -4.0, 0.7)
	var tw := create_tween()
	tw.tween_interval(regrow)
	tw.tween_property(self, ^"_grow", 1.0, 0.4)
	tw.tween_callback(func() -> void: _ready_ball = true)
	return ball


func _process(_delta: float) -> void:
	if _grow < 1.0 or Engine.is_editor_hint():
		queue_redraw()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var s := 0.35 + 0.65 * _grow
	var pts := PackedVector2Array()
	for i in 17:
		var a := PI + i * PI / 16.0
		var wob := 1.0 + 0.08 * sin(i * 2.3)
		pts.append(Vector2(cos(a) * 62.0 * wob, sin(a) * 58.0 * s * wob))
	Art.shape(self, pts, SNOW, o, 4.0)
	draw_colored_polygon(Art.ellipse(Vector2(14, -14 * s), 34, 16 * s, 12), SHADE)
	draw_colored_polygon(Art.ellipse(Vector2(-18, -34 * s), 14, 7 * s, 10), Color(1, 1, 1))
	# A little stick with a red flag, so it reads as "hit me".
	if _grow > 0.9:
		draw_line(Vector2(22, -40 * s), Vector2(34, -96), Color("7a4e2d"), 4.0)
		Art.shape(self, PackedVector2Array([Vector2(34, -96), Vector2(62, -88), Vector2(33, -78)]), th.accent, o, 2.5)
