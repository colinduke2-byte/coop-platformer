class_name Wormwick
extends Enemy
## WORMWICK: a bookworm that lives inside a fat old tome. Every couple of seconds it slams the
## book shut - then it is armoured (stomps just bounce off) - and pops back out to crawl
## along the shelf. Stomp it while the worm is out. Punches and ground pounds always work.

enum St { OUT, SHUT }

@export var crawl_speed := 50.0
@export var out_time := 2.4
@export var shut_time := 1.6

const COVER := Color("7a3a52")
const COVER_DARK := Color("522438")
const PAGES := Color("f6e6bd")
const WORM := Color("a8e06a")
const WORM_DARK := Color("7ab048")

var st := St.OUT
var _t := 0.0


func _init() -> void:
	body_size = Vector2(46, 34)
	health = 2
	lum_drop = 3


func _setup() -> void:
	_t = randf_range(0.5, out_time)


func blocks_hit(_by: Player, kind: HitKind) -> bool:
	return st == St.SHUT and kind in [HitKind.STOMP, HitKind.SLIDE]


func _behave(delta: float) -> void:
	_t -= delta
	match st:
		St.OUT:
			patrol(crawl_speed)
			if _t <= 0.0:
				st = St.SHUT
				_t = shut_time
				contact_hurts = false
				squash(Vector2(1.25, 0.7))
		St.SHUT:
			velocity.x = 0.0
			if _t <= 0.0:
				st = St.OUT
				_t = out_time * randf_range(0.85, 1.2)
				contact_hurts = true
				squash(Vector2(0.8, 1.25))


func _draw_body(ci: CanvasItem) -> void:
	var shut := st == St.SHUT
	# The book: cover underneath, pages, then the front cover.
	Art.shape(ci, Art.rounded_rect(Vector2(-25, -22), Vector2(25, 0), 3.0), COVER_DARK, OUTLINE, 3.0)
	ci.draw_rect(Rect2(-22, -18, 44, 12), PAGES)
	for k in 4:
		ci.draw_line(Vector2(-20, -16 + k * 3.0), Vector2(20, -16 + k * 3.0), Color(OUTLINE, 0.25), 1.0)
	if shut:
		Art.shape(ci, Art.rounded_rect(Vector2(-26, -30), Vector2(26, -20), 3.0), COVER, OUTLINE, 3.0)
		ci.draw_circle(Vector2(0, -25), 3.5, Color("ffd23f"))
		return
	# The worm bulging out of the top, nodding as it crawls.
	var nod := sin(anim_time * 6.0) * 2.0
	for k in 3:
		Art.shape(ci, Art.ellipse(Vector2(-14 + k * 11.0 * facing * -1.0, -26 - k * 2.0 + nod * 0.3), 9, 9, 12), WORM_DARK, OUTLINE, 2.5)
	var hd := Vector2(14.0 * facing, -34 + nod)
	Art.shape(ci, Art.ellipse(hd, 12, 12, 14), WORM, OUTLINE, 3.0)
	Enemy.draw_eye(ci, hd + Vector2(-3, -2), 4.0, Vector2(facing, 0), 0.0)
	Enemy.draw_eye(ci, hd + Vector2(6, -2), 4.0, Vector2(facing, 0), 0.0)
	ci.draw_rect(Rect2(-25, -22, 12, 22), Color(COVER, 0.0))
	Art.shape(ci, Art.rounded_rect(Vector2(-26, -22), Vector2(-14, 0), 3.0), COVER, OUTLINE, 3.0)   # the spine
