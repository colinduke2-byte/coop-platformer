@tool
class_name Checkpoint
extends Area2D
## Dream lantern on a post: touch to set the respawn point. Lights up (and
## frees everyone in a bubble). Origin = bottom of the post.

var _reached := false
var _t := 0.0
var _flash := 0.0


func _ready() -> void:
	# (Old scenes had Pole/Flag polygons; the lantern is drawn instead.)
	for n in [^"Pole", ^"Flag"]:
		if has_node(n):
			get_node(n).visible = false
	if not Engine.is_editor_hint():
		body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	_t += delta
	_flash = maxf(_flash - delta * 2.0, 0.0)
	queue_redraw()


func _on_body_entered(body: Node2D) -> void:
	if _reached or not body is Player:
		return
	_reached = true
	_flash = 1.0
	EventBus.checkpoint_reached.emit(global_position)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var wood := Color("8a5a3a")
	Art.shape(self, Art.rect(Vector2(-5, -140), Vector2(5, 0)), wood, o, 3.0)
	Art.shape(self, Art.rect(Vector2(-5, -140), Vector2(40, -132)), wood, o, 3.0)
	var sway := sin(_t * 2.0) * 0.12
	var hook := Vector2(34, -132)
	var c := hook + Vector2(0, 34).rotated(sway)
	draw_line(hook, hook + Vector2(0, 14).rotated(sway), o, 3.0)
	var lit := _reached
	var glow := Color("ffd23f") if lit else Color("8fa3b8")
	if lit:
		draw_circle(c, 44.0 + 6.0 * sin(_t * 3.0) + 30.0 * _flash, Color(1, 0.85, 0.3, 0.2))
	var body := Art.rounded_rect(c + Vector2(-16, -20), c + Vector2(16, 20), 6.0)
	Art.shape(self, body, Color(glow, 0.9), o, 3.0)
	for x: float in [-8.0, 0.0, 8.0]:
		draw_line(c + Vector2(x, -18), c + Vector2(x, 18), Color(o, 0.5), 2.0)
	Art.shape(self, Art.rect(c + Vector2(-19, -24), c + Vector2(19, -18)), wood, o, 2.0)
	Art.shape(self, Art.rect(c + Vector2(-19, 18), c + Vector2(19, 24)), wood, o, 2.0)
	if lit:
		Art.shape(self, Art.ellipse(c + Vector2(0, 2), 6, 9 + sin(_t * 12.0), 10), Color("ff8a3d"), Color(0, 0, 0, 0), 0.0)
