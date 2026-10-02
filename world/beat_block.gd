@tool
class_name BeatBlock
extends StaticBody2D
## TICK-TOCK BLOCK: clockwork blocks that take turns being solid. Every `beat`
## seconds the clock ticks and the PINK blocks (group 0) and BLUE blocks
## (group 1) swap: solid ones fade to a dotted outline, outlined ones snap
## solid. They blink just before a swap. A block never snaps solid inside a
## player - it waits until they've moved out. Origin = top-left, like Block.

@export var size := Vector2(128, 32):
	set(v):
		size = v
		_rebuild()
@export_enum("Pink:0", "Blue:1") var group := 0:
	set(v):
		group = v
		queue_redraw()
@export var beat := 1.6                     ## seconds between swaps (keep the same in a level)

const WARN := 0.4
const COLORS := [Color("ff5d8f"), Color("3fb7ff")]

static var clock := 0.0                     ## shared tick-tock clock (advanced by every block's world)
static var _clock_frame := -1

var _solid := true
var _col: CollisionShape2D
var _overlap: Area2D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	_rebuild()
	if not Engine.is_editor_hint():
		_overlap = Area2D.new()
		_overlap.collision_layer = 0
		_overlap.collision_mask = 2
		_overlap.monitorable = false
		var c := CollisionShape2D.new()
		var s := RectangleShape2D.new()
		s.size = size - Vector2(4, 4)
		c.shape = s
		c.position = size * 0.5
		_overlap.add_child(c)
		add_child(_overlap)


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size
	_col.shape = shape
	_col.position = size * 0.5
	queue_redraw()


## Which group is solid right now (0 pink / 1 blue), from the shared clock.
static func solid_group(at: float, beat_len: float) -> int:
	return int(floor(at / beat_len)) % 2


func should_be_solid() -> bool:
	return solid_group(clock, beat) == group


func time_to_swap() -> float:
	return beat - fmod(clock, beat)


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	var f := Engine.get_physics_frames()
	if f != _clock_frame:  # the first block each frame advances the shared clock
		_clock_frame = f
		clock += delta
	var want := should_be_solid()
	if want and not _solid:
		# Don't snap solid around a player: wait for them to step out.
		for b in _overlap.get_overlapping_bodies():
			if b is Player and not b.is_bubbled():
				want = false
	if want != _solid:
		_solid = want
		_col.set_deferred(&"disabled", not want)
		if want:
			Audio.play("clank", -14.0, 1.6 if group == 0 else 1.3)
	View.redraw(self)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var col: Color = COLORS[group]
	var blink := not Engine.is_editor_hint() and time_to_swap() < WARN and fmod(time_to_swap(), 0.12) < 0.06
	var r := Rect2(Vector2.ZERO, size)
	if _solid or Engine.is_editor_hint():
		var c := col.lightened(0.35) if blink else col
		Art.shape(self, Art.rounded_rect(r.position, r.end, 6.0), c, th.outline, 3.0)
		draw_rect(Rect2(4, 4, size.x - 8, 6), Color(1, 1, 1, 0.35))
		# A little clock face in the middle.
		var cc := size * 0.5
		var rad := minf(size.y * 0.32, 12.0)
		draw_circle(cc, rad, Color("fff8ec"))
		draw_arc(cc, rad, 0, TAU, 16, th.outline, 2.0)
		draw_line(cc, cc + Vector2(0, -rad * 0.75), th.outline, 2.0)
		draw_line(cc, cc + Vector2(rad * 0.55, 0), th.outline, 2.0)
	else:
		var c := Color(col, 0.75 if blink else 0.45)
		var x := 0.0
		while x < size.x:  # dotted outline
			draw_line(Vector2(x, 0), Vector2(minf(x + 8, size.x), 0), c, 3.0)
			draw_line(Vector2(x, size.y), Vector2(minf(x + 8, size.x), size.y), c, 3.0)
			x += 14.0
		var y := 0.0
		while y < size.y:
			draw_line(Vector2(0, y), Vector2(0, minf(y + 8, size.y)), c, 3.0)
			draw_line(Vector2(size.x, y), Vector2(size.x, minf(y + 8, size.y)), c, 3.0)
			y += 14.0
