extends Node2D
## PLAY ONLINE (browser version): host a game and get a 4-letter code, or type
## a friend's code to join them. Hosting goes straight to the character select
## (the lobby: friends' cards fill in as they join). Joining follows the host
## wherever they are. One dreamer per browser; any keys or gamepad play it.
##   Menu: Up / Down + Jump.  Code: type the letters (gamepad: Up / Down picks
##   a letter, Left / Right moves), ENTER / A joins, ESC / B goes back.

const LETTERS := "ABCDEFGHJKLMNPQRSTUVWXYZ"
const CODE_LEN := 4

enum Screen { MAIN, CODE, WAIT }

var _screen := Screen.MAIN
var _index := 0
var _items: Array[String] = []
var _code := ""
var _cursor := 0            ## gamepad letter picker position
var _menu := MenuInput.new()
var _t := 0.0
var _title: Label
var _list: VBoxContainer
var _info: Label
var _status: Label
var _hint: Label
var _boxes: HBoxContainer
var _prev_joy := Vector2.ZERO
var _grace := 0.25          ## ignore the press that opened this screen
var _hosting := false


func _ready() -> void:
	var bd := Backdrop.new()
	bd.horizon_y = 200.0
	bd.scenery = Backdrop.Scenery.HILLS
	add_child(bd)
	var amb := Ambience.new()
	amb.kind = Ambience.Kind.PETALS
	add_child(amb)
	var cam := Camera2D.new()
	add_child(cam)
	cam.make_current()
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	var center := CenterContainer.new()
	center.size = Vector2(1920, 1080)
	layer.add_child(center)
	var pc := PanelContainer.new()
	pc.add_theme_stylebox_override(&"panel", UIStyle.panel())
	pc.custom_minimum_size = Vector2(980, 0)
	center.add_child(pc)
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 18)
	pc.add_child(v)
	_title = _centered(UIStyle.label("Play Online", 64, UIStyle.ACCENT, 8, UIStyle.OUTLINE))
	v.add_child(_title)
	_info = _centered(UIStyle.label("", 26))
	_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_info.custom_minimum_size.x = 900
	v.add_child(_info)
	_boxes = HBoxContainer.new()
	_boxes.alignment = BoxContainer.ALIGNMENT_CENTER
	_boxes.add_theme_constant_override(&"separation", 16)
	v.add_child(_boxes)
	_list = VBoxContainer.new()
	_list.add_theme_constant_override(&"separation", 6)
	v.add_child(_list)
	_status = _centered(UIStyle.label("", 26, UIStyle.ACCENT))
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status.custom_minimum_size.x = 900
	v.add_child(_status)
	_hint = _centered(UIStyle.label("", 20, Color(UIStyle.INK, 0.7)))
	v.add_child(_hint)
	# One dreamer per browser online: every key and pad drives it.
	InputRouter.bind_online(0)
	Net.changed.connect(_refresh)
	_refresh()
	Audio.play_music("menu")
	var intent := Net.pending_intent
	Net.pending_intent = {}
	if intent.get("a") == "host":
		_choose("Host a game")
	elif intent.get("a") == "join" and String(intent.get("c", "")).length() == CODE_LEN:
		_code = String(intent["c"]).to_upper()
		_submit()


func _exit_tree() -> void:
	if Net.changed.is_connected(_refresh):
		Net.changed.disconnect(_refresh)


func _centered(l: Label) -> Label:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


func _process(delta: float) -> void:
	_t += delta
	_grace -= delta
	_title.modulate = Color.WHITE.lerp(Color("ffe6f0"), 0.5 + 0.5 * sin(_t * 3.0))
	if Net.is_host():
		get_tree().change_scene_to_file.call_deferred(GameManager.CHARACTER_SELECT)
		set_process(false)
		return
	if _screen == Screen.WAIT:
		if Net.mode == Net.Mode.OFFLINE:
			_screen = Screen.MAIN
			_refresh()
		elif Net.is_client():
			_status.text = "Connected! Following the host..."
		_menu.poll(false)
		if _grace <= 0.0 and _menu.back:
			Net.leave()
			_screen = Screen.MAIN
			_refresh()
		return
	if _screen == Screen.CODE:
		_poll_pad_picker()
		return
	if Net.available() == "pending":
		_refresh()
	_menu.poll()
	if _grace > 0.0:
		return
	if _menu.up:
		_index = wrapi(_index - 1, 0, _items.size())
		_refresh()
	elif _menu.down:
		_index = wrapi(_index + 1, 0, _items.size())
		_refresh()
	elif _menu.back or _menu.pause:
		_back_to_title()
	elif _menu.confirm:
		_choose(_items[_index])


func _choose(item: String) -> void:
	match item:
		"Host a game":
			Net.host_game()
			_hosting = true
			_screen = Screen.WAIT
			_grace = 0.3
			_refresh()
		"Join a friend's game":
			_screen = Screen.CODE
			_code = ""
			_cursor = 0
			_grace = 0.3
			_refresh()
		_:
			_back_to_title()


func _back_to_title() -> void:
	Net.leave()
	for s in InputRouter.get_bound_slots():
		InputRouter.unbind_slot(s)
	set_process(false)
	GameManager.goto_scene(Net.TITLE)


# --- Code entry ---------------------------------------------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if _screen != Screen.CODE or _grace > 0.0:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var k := event as InputEventKey
		var ch := char(k.unicode).to_upper() if k.unicode > 0 else ""
		if ch.length() == 1 and LETTERS.contains(ch) and _code.length() < CODE_LEN:
			_code += ch
			_cursor = mini(_code.length(), CODE_LEN - 1)
			Audio.play("menu_move", -6.0, 1.2, 0.0)
		elif k.physical_keycode == KEY_BACKSPACE:
			_code = _code.left(-1)
			_cursor = mini(_code.length(), CODE_LEN - 1)
		elif k.physical_keycode in [KEY_ENTER, KEY_KP_ENTER]:
			_submit()
		elif k.physical_keycode == KEY_ESCAPE:
			_screen = Screen.MAIN
		get_viewport().set_input_as_handled()
		_refresh()
	elif event is InputEventJoypadButton and event.pressed:
		match (event as InputEventJoypadButton).button_index:
			JOY_BUTTON_A, JOY_BUTTON_START:
				if _code.length() < CODE_LEN:
					_pad_letter(0)  # fill the current box and move on
					_cursor = mini(_cursor + 1, CODE_LEN - 1)
				else:
					_submit()
			JOY_BUTTON_B:
				_screen = Screen.MAIN
			JOY_BUTTON_X:
				_code = _code.left(-1)
				_cursor = mini(_code.length(), CODE_LEN - 1)
			JOY_BUTTON_DPAD_UP:
				_pad_letter(-1)
			JOY_BUTTON_DPAD_DOWN:
				_pad_letter(1)
		_refresh()


## Gamepad stick: up / down changes the letter under the cursor.
func _poll_pad_picker() -> void:
	var v := Vector2.ZERO
	for d in Input.get_connected_joypads():
		v = Vector2(Input.get_joy_axis(d, JOY_AXIS_LEFT_X), Input.get_joy_axis(d, JOY_AXIS_LEFT_Y))
		if v.length() > 0.6:
			break
	if v.y < -0.6 and _prev_joy.y >= -0.6:
		_pad_letter(-1)
		_refresh()
	elif v.y > 0.6 and _prev_joy.y <= 0.6:
		_pad_letter(1)
		_refresh()
	_prev_joy = v


func _pad_letter(step: int) -> void:
	while _code.length() <= _cursor:
		_code += LETTERS[0]
	var i := LETTERS.find(_code[_cursor])
	_code = _code.left(_cursor) + LETTERS[wrapi(i + step, 0, LETTERS.length())] + _code.substr(_cursor + 1)
	Audio.play("menu_move", -6.0, 1.2, 0.0)


func _submit() -> void:
	if _code.length() != CODE_LEN:
		return
	Net.join_game(_code)
	_hosting = false
	_screen = Screen.WAIT
	_grace = 0.3
	Audio.play("menu_ok", -4.0)


# --- Drawing ----------------------------------------------------------------------------

func _refresh() -> void:
	for c in _list.get_children():
		c.queue_free()
	for c in _boxes.get_children():
		c.queue_free()
	_status.text = Net.error
	var kind := Net.available()
	match _screen:
		Screen.MAIN:
			if kind == "" and OS.has_feature("web"):
				var why := Net.transport.why()
				_info.text = "Online play isn't available on this page.\n" + (why if why != "" else "On claude.ai everyone must be signed in, and friends must be invited to the game page (Share).")
				_items = ["Back"]
			elif kind == "":
				_info.text = "Online play works in the browser version of Dreamers.\nOpen the game from its link, then pick Play Online."
				_items = ["Back"]
			elif kind == "pending":
				_info.text = "Getting ready to go online..."
				_items = ["Back"]
			else:
				_info.text = "Play with friends on their own computers!\nHOST a game to get a code, then send it to your friends.\nOr JOIN with the code a friend sent you."
				_items = ["Host a game", "Join a friend's game", "Back"]
			_index = clampi(_index, 0, _items.size() - 1)
			for i in _items.size():
				var sel := i == _index
				_list.add_child(_centered(UIStyle.label(("> %s <" if sel else "%s") % _items[i], 38 if sel else 32,
						UIStyle.ACCENT if sel else UIStyle.INK)))
			_hint.text = "Up / Down + Jump: choose     Punch: back"
		Screen.CODE:
			_info.text = "Type the 4-letter code your friend sees on their screen:"
			for i in CODE_LEN:
				var ch := _code[i] if i < _code.length() else "_"
				var box := PanelContainer.new()
				var cur := i == mini(_cursor, CODE_LEN - 1)
				box.add_theme_stylebox_override(&"panel", UIStyle.panel(Color("ffe6f0") if cur else UIStyle.PANEL, 14, 4))
				box.custom_minimum_size = Vector2(96, 110)
				var l := _centered(UIStyle.label(ch, 72, UIStyle.INK))
				l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
				box.add_child(l)
				_boxes.add_child(box)
			_status.text = Net.error if _code.is_empty() else ""
			_hint.text = "Keyboard: type it, ENTER to join, ESC to go back\nGamepad: Up / Down letter, A next / join, X delete, B back"
		Screen.WAIT:
			_info.text = "Setting up your game..." if _hosting else "Looking for game %s..." % Net.code
			_status.text = ""
			_hint.text = "Punch: cancel"
