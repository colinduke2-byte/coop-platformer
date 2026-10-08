class_name GfxWatchdog
extends Node
## Web safety net: if the player never chose a Graphics preset and the first few seconds
## of a level run slowly, drop one preset for the rest of the session (it takes effect
## from the next level). Added by Level on web builds only.

const WARMUP := 2.0
const SAMPLE := 4.0
const MIN_FPS := 40.0

var _t := 0.0
var _frames := 0
var _done := false


func _process(delta: float) -> void:
	if _done:
		return
	_t += delta
	if _t < WARMUP:
		return
	_frames += 1
	if _t >= WARMUP + SAMPLE:
		_done = true
		var fps := float(_frames) / SAMPLE
		if fps < MIN_FPS and Gfx.level > Gfx.Level.LOW:
			Gfx.level -= 1
			Vfx.text(GameManager.level.get_spawn_position() + Vector2(0, -260) if GameManager.level else Vector2.ZERO,
					"Graphics set to %s for smoother play" % Gfx.name_of(Gfx.level), Color.WHITE, 26)
		set_process(false)
