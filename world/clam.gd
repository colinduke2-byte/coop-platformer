@tool
class_name Clam
extends BouncePad
## A giant clam that slowly opens and snaps shut. While it's OPEN it's a bounce
## pad (land on the pearl and you're flung up); shut, it's just a shell to stand on.
## `phase` (s) desyncs a row of clams. Origin = bottom centre.

@export var open_time := 1.8
@export var closed_time := 1.4
@export var phase := 0.0

var _tt := 0.0
var _open := 1.0   ## 0 shut .. 1 open (animated)


func is_open() -> bool:
	return fposmod(_tt + phase, open_time + closed_time) < open_time


func can_launch() -> bool:
	return is_open()


func _process(delta: float) -> void:
	_tt += delta
	_open = move_toward(_open, 1.0 if is_open() or Engine.is_editor_hint() else 0.0, delta * 5.0)
	View.redraw(self)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var shell := th.flower_colors[0].lerp(Color.WHITE, 0.45) if tint.a == 0.0 else tint
	var o := th.outline
	# Bottom shell.
	var bot := PackedVector2Array()
	for i in 17:
		var a := float(i) / 16.0 * PI
		bot.append(Vector2(-cos(a) * 52.0, -sin(a) * 18.0 - 4.0 + 18.0))
	Art.shape(self, bot, shell.darkened(0.1), o, 3.0)
	# The pearl (the bouncy bit).
	if _open > 0.2:
		draw_circle(Vector2(0, -16), 14.0, Color("fff6fb"))
		draw_circle(Vector2(-4, -20), 4.0, Color(1, 1, 1, 0.9))
	# Top shell, hinged at the back (left), swinging up as it opens.
	var lid := PackedVector2Array()
	var ang := -lerpf(0.0, 1.15, _open) - _squish * 0.2
	for i in 17:
		var a := float(i) / 16.0 * PI
		var p := Vector2(52.0 - cos(a) * 52.0, -sin(a) * 26.0)
		lid.append(Vector2(-52, -14) + p.rotated(ang))
	Art.shape(self, lid, shell, o, 3.0)
	for k in 4:
		var t := 0.2 + k * 0.2
		draw_line(Vector2(-52, -14), Vector2(-52, -14) + Vector2(104.0 * t, -22.0 * sin(t * PI)).rotated(ang), shell.darkened(0.15), 2.0)
