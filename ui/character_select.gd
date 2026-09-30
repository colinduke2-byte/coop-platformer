class_name CharacterSelect
extends Node2D
## Lobby. Players join with their join button, pick with left/right, press JUMP
## to lock in and ATTACK to un-ready (or leave if not ready). UP / DOWN picks an
## outfit from the Dream Wardrobe (unlocked by Dream Gems and Snoozlings). When everyone who
## joined is ready, the picks go to GameManager.chosen_characters and
## next_scene loads. A character locked in by one player can't be taken.
## ONLINE this is the lobby: your card is yours, friends' cards follow their
## browsers (Net.remote_lobby), the room code shows at the bottom, and the
## host's browser starts the game once everyone is ready.

const CARD_SIZE := Vector2(420, 640)
const CARD_TOP := 250.0
const RIG_SCALE := 2.4
const JOIN_GRACE := 0.25   ## s of ignored input after joining (the join key is also jump)
const STICK_FLICK := 0.6   ## stick deflection that counts as one left/right step
const START_DELAY := 0.8   ## s after everyone is ready before the level loads
const PANEL := Color(1, 1, 1, 0.55)
const PANEL_EMPTY := Color(1, 1, 1, 0.2)
const PANEL_READY := Color(0.85, 1, 0.85, 0.8)
const INK := Color("2b2233")

@export_file("*.tscn") var next_scene := "res://ui/world_map.tscn"
@export var auto_start := true   ## tests turn this off

var _cards: Array[Card] = []
var _start_timer := 0.0
var _footer: Label
var _menu := MenuInput.new()
var _controls: CanvasLayer  ## ControlsCard overlay while PAUSE shows it
var _code_label: Label
var _leave_t := 0.0         ## online: > 0 while a second PUNCH leaves the online game


class Card:
	var slot := 0
	var remote := false         ## online: a friend's card (their browser drives it)
	var joined := false
	var ready := false
	var index := 0
	var outfit := 0
	var grace := 0.0
	var prev_x := 0.0
	var prev_y := 0.0
	var input: PlayerInput
	var panel: Polygon2D
	var rig: CharacterRig
	var title: Label
	var name_label: Label
	var blurb: Label
	var status: Label
	var arrows: Label
	var outfit_label: Label


func _ready() -> void:
	var w := 1920.0
	_label("Choose your dreamer", 64, Vector2(0, 50), w)
	_label("Join: SPACE (WASD)  /  ENTER (arrows)  /  A (gamepad)     Left / Right: pick     Up / Down: outfit     Jump: ready     Punch: leave",
			22, Vector2(0, 150), w)
	_label("Press PAUSE (Esc / Backspace / Start) to see all the controls", 22, Vector2(0, 185), w)
	_footer = _label("", 28, Vector2(0, 950), w)
	for slot in InputRouter.MAX_PLAYERS:
		_cards.append(_make_card(slot, 240.0 + slot * 480.0))
	for slot in InputRouter.get_bound_slots():
		_join(slot)
	InputRouter.join_requested.connect(_join)
	if Net.is_online():
		_code_label = _label("", 34, Vector2(0, 1010), w)
		_code_label.add_theme_color_override(&"font_color", UIStyle.ACCENT)
	Audio.play_music("menu")


func _exit_tree() -> void:
	if InputRouter.join_requested.is_connected(_join):
		InputRouter.join_requested.disconnect(_join)


# --- Public (used by tests) -----------------------------------------------------

func card_index(slot: int) -> int:
	return _cards[slot].index


func is_card_ready(slot: int) -> bool:
	return _cards[slot].ready


func is_everyone_ready() -> bool:
	var any := false
	for c in _cards:
		if c.joined:
			any = true
			if not c.ready:
				return false
	return any


# --- Flow -----------------------------------------------------------------------

func _process(delta: float) -> void:
	_menu.poll(false)
	if _controls:
		if _menu.pause or _menu.confirm or _menu.back:
			_controls.queue_free()
			_controls = null
			for c in _cards:
				c.grace = JOIN_GRACE  # don't let the closing press also ready / leave
		return
	if _menu.pause:
		var layer := CanvasLayer.new()
		layer.layer = 20
		layer.add_child(ControlsCard.overlay())
		add_child(layer)
		_controls = layer
		return
	if Net.is_online():
		_sync_online(delta)
	for c in _cards:
		if not c.joined:
			continue
		c.grace -= delta
		if c.grace <= 0.0 and not c.remote:
			_handle_input(c)
		if c.joined:
			c.rig.update_pose(&"Jump" if c.ready else &"Ground", Vector2.ZERO, not c.ready, 1.0, delta)

	if is_everyone_ready():
		_footer.text = "Everyone's ready!" if not Net.is_client() else "Everyone's ready! Waiting for the host..."
		_start_timer += delta
		if auto_start and _start_timer >= START_DELAY and not Net.is_client():
			_start()
	else:
		_start_timer = 0.0
		_footer.text = "Waiting for players..." if _cards.all(func(c: Card) -> bool: return not c.joined) \
				else "Press JUMP when you're happy with your pick"


func _handle_input(c: Card) -> void:
	var x := c.input.move_x()
	var dir := 0
	if x > STICK_FLICK and c.prev_x <= STICK_FLICK:
		dir = 1
	elif x < -STICK_FLICK and c.prev_x >= -STICK_FLICK:
		dir = -1
	c.prev_x = x
	var y := c.input.move_y()
	var ydir := 0
	if y > STICK_FLICK and c.prev_y <= STICK_FLICK:
		ydir = 1
	elif y < -STICK_FLICK and c.prev_y >= -STICK_FLICK:
		ydir = -1
	c.prev_y = y
	if not c.ready and ydir != 0:
		c.outfit = wrapi(c.outfit + ydir, 0, Wardrobe.OUTFITS.size())
		_refresh(c)
		Audio.play("menu_move", -6.0, 1.2, 0.0)

	if not c.ready and dir != 0:
		c.index = _next_free(c.index, dir, c.slot)
		_refresh(c)
		Audio.play("menu_move", -6.0, 1.0, 0.0)
	if c.input.jump_pressed():
		if not c.ready and not _taken_by_other(c.index, c.slot) and Wardrobe.is_unlocked(c.outfit):
			c.ready = true
			_refresh(c)
			Audio.play("menu_ok", -4.0, 1.0, 0.0)
	elif c.input.attack_pressed():
		if c.ready:
			c.ready = false
			_refresh(c)
		elif Net.is_online():
			if _leave_t > 0.0:
				Net.leave()
				set_process(false)
				GameManager.goto_scene(Net.ONLINE_MENU)
				return
			_leave_t = 2.0  # press again to really leave
		else:
			_leave(c)


func _join(slot: int) -> void:
	var c := _cards[slot]
	if c.joined:
		return
	c.joined = true
	c.ready = false
	c.grace = JOIN_GRACE
	c.prev_x = 0.0
	c.input = PlayerInput.new(slot)
	var chars := GameManager.CHARACTERS
	var preferred := chars.find(Wardrobe.base_of(GameManager.character_for(slot)))
	c.outfit = GameManager.chosen_outfits.get(slot, 0)
	if not Wardrobe.is_unlocked(c.outfit):
		c.outfit = 0
	c.index = preferred if preferred != -1 else slot % chars.size()
	if _taken_by_other(c.index, slot):
		c.index = _next_free(c.index, 1, slot)
	_refresh(c)


func _leave(c: Card) -> void:
	c.joined = false
	c.ready = false
	GameManager.chosen_characters.erase(c.slot)
	InputRouter.unbind_slot(c.slot)
	EventBus.player_left.emit(c.slot)
	_refresh(c)


func _start() -> void:
	set_process(false)
	for c in _cards:
		if c.joined:
			GameManager.chosen_characters[c.slot] = Wardrobe.dress(GameManager.CHARACTERS[c.index], c.outfit)
			GameManager.chosen_outfits[c.slot] = c.outfit
	get_tree().change_scene_to_file.call_deferred(next_scene)


## Online: friends' cards mirror their browsers; ours is sent to them.
func _sync_online(delta: float) -> void:
	_leave_t = maxf(_leave_t - delta, 0.0)
	var remote := Net.remote_slots()
	for c in _cards:
		if c.slot == Net.my_slot:
			if c.joined:
				Net.lobby = [c.index, c.outfit, 1 if c.ready else 0]
			continue
		var lb := Net.remote_lobby(c.slot) if c.slot in remote else []
		var was := [c.joined, c.index, c.outfit, c.ready]
		c.remote = true
		c.joined = not lb.is_empty()
		if c.joined:
			c.index = clampi(int(lb[0]), 0, GameManager.CHARACTERS.size() - 1)
			c.outfit = clampi(int(lb[1]), 0, Wardrobe.OUTFITS.size() - 1)
			c.ready = int(lb[2]) == 1
		if was != [c.joined, c.index, c.outfit, c.ready]:
			_refresh(c)
	var tip := "Friends join with code  %s   -  or send them the invite link (button at the top)" % Net.code
	if Net.is_client():
		tip = "You're in game %s!  Pick your dreamer and press JUMP when ready" % Net.code
	if _leave_t > 0.0:
		tip = "Press PUNCH again to leave the online game"
	_code_label.text = tip


func _taken_by_other(index: int, slot: int) -> bool:
	for c in _cards:
		if c.slot != slot and c.joined and c.ready and c.index == index:
			return true
	return false


func _next_free(index: int, dir: int, slot: int) -> int:
	var n := GameManager.CHARACTERS.size()
	for i in n:
		index = wrapi(index + dir, 0, n)
		if not _taken_by_other(index, slot):
			return index
	return index


# --- Visuals --------------------------------------------------------------------

func _make_card(slot: int, center_x: float) -> Card:
	var c := Card.new()
	c.slot = slot
	var half := CARD_SIZE.x * 0.5
	c.panel = Polygon2D.new()
	c.panel.polygon = PackedVector2Array([
		Vector2(center_x - half, CARD_TOP), Vector2(center_x + half, CARD_TOP),
		Vector2(center_x + half, CARD_TOP + CARD_SIZE.y), Vector2(center_x - half, CARD_TOP + CARD_SIZE.y)])
	add_child(c.panel)
	c.title = _label("P%d" % (slot + 1), 36, Vector2(center_x - half, CARD_TOP + 16), CARD_SIZE.x)
	c.rig = CharacterRig.new()
	c.rig.position = Vector2(center_x, CARD_TOP + 390)
	c.rig.scale = Vector2.ONE * RIG_SCALE
	add_child(c.rig)
	c.outfit_label = _label("", 22, Vector2(center_x - half, CARD_TOP + 66), CARD_SIZE.x)
	c.arrows = _label("<                                    >", 40, Vector2(center_x - half, CARD_TOP + 210), CARD_SIZE.x)
	c.name_label = _label("", 36, Vector2(center_x - half, CARD_TOP + 410), CARD_SIZE.x)
	c.blurb = _label("", 20, Vector2(center_x - half + 30, CARD_TOP + 465), CARD_SIZE.x - 60, true)
	c.status = _label("", 24, Vector2(center_x - half, CARD_TOP + 580), CARD_SIZE.x)
	_refresh(c)
	return c


func _refresh(c: Card) -> void:
	c.rig.visible = c.joined
	c.arrows.visible = c.joined and not c.ready
	c.name_label.visible = c.joined
	c.blurb.visible = c.joined
	c.outfit_label.visible = c.joined
	if not c.joined:
		c.panel.color = PANEL_EMPTY
		c.status.text = "Waiting for a friend..." if Net.is_online() else "Press jump to join"
		return
	var base: CharacterDef = GameManager.CHARACTERS[c.index]
	var def := Wardrobe.dress(base, c.outfit)
	if c.rig.def == null or c.rig.def.display_name != def.display_name or c.rig.def.main_color != def.main_color:
		c.rig.build(def)
	var unlocked := c.remote or Wardrobe.is_unlocked(c.outfit)  # a friend wears what their save unlocked
	c.rig.modulate = Color.WHITE if unlocked else Color(0.35, 0.35, 0.4, 0.8)
	var outfit_name: String = Wardrobe.OUTFITS[c.outfit]["name"]
	c.outfit_label.text = ("Outfit: %s  (up / down)" % outfit_name) if unlocked else ("%s - locked: %s" % [outfit_name, Wardrobe.requirement(c.outfit)])
	c.outfit_label.add_theme_color_override(&"font_color", INK if unlocked else Color("b8435e"))
	c.panel.color = PANEL_READY if c.ready else PANEL
	c.name_label.text = def.display_name
	c.name_label.add_theme_color_override(&"font_color", def.main_color.darkened(0.25))
	c.blurb.text = def.blurb
	c.status.text = "READY!  (attack to change)" if c.ready else ("Jump: ready   Attack: leave" if unlocked else "Pick an unlocked outfit")


func _label(text: String, font_size: int, pos: Vector2, width: float, wrap := false) -> Label:
	var l := Label.new()
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD
		l.custom_minimum_size.x = width
	l.text = text
	l.position = pos
	l.size.x = width
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override(&"font_size", font_size)
	l.add_theme_color_override(&"font_color", INK)
	add_child(l)
	return l
