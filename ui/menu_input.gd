class_name MenuInput
extends RefCounted
## Menu navigation from ANY joined player (keyboard or pad): call poll() once
## per frame, then read the edge flags. Works while the tree is paused.

const FLICK := 0.6

var up := false
var down := false
var left := false
var right := false
var confirm := false
var back := false
var pause := false
var who := -1                ## slot that pressed confirm/back/pause this frame

var _prev := {}              ## slot -> Vector2 stick last frame


func poll() -> void:
	up = false
	down = false
	left = false
	right = false
	confirm = false
	back = false
	pause = false
	who = -1
	for slot in InputRouter.get_bound_slots():
		var inp := PlayerInput.new(slot)
		var v := Vector2(inp.move_x(), inp.move_y())
		var pv: Vector2 = _prev.get(slot, Vector2.ZERO)
		if v.y < -FLICK and pv.y >= -FLICK: up = true
		if v.y > FLICK and pv.y <= FLICK: down = true
		if v.x < -FLICK and pv.x >= -FLICK: left = true
		if v.x > FLICK and pv.x <= FLICK: right = true
		_prev[slot] = v
		if inp.jump_pressed():
			confirm = true
			who = slot
		if inp.attack_pressed():
			back = true
			who = slot
		if inp.pause_pressed():
			pause = true
			who = slot
