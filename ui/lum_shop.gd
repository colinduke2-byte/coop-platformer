extends Control
## THE LUM SHOP: spend the Lums you've collected on new outfits (some come with a
## new hat). LEFT / RIGHT to browse - your dreamer tries each one on - JUMP to
## buy, PUNCH to go back to the map. Bought outfits are picked on the character
## select screen (UP / DOWN). Items come from Wardrobe.OUTFITS entries with a "price".

var _items: Array[int] = []         ## indices into Wardrobe.OUTFITS
var _index := 0
var _menu := MenuInput.new()
var _rig: CharacterRig
var _rig_holder: Node2D
var _name: Label
var _price: Label
var _status: Label
var _bank: Label
var _keeper: Keeper
var _t := 0.0
var _thanks := 0.0


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := TextureRect.new()
	var grad := Gradient.new()
	grad.set_color(0, Color("ff9e5e"))
	grad.set_color(1, Color("ffd6e8"))
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill_to = Vector2(0, 1)
	bg.texture = tex
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	_keeper = Keeper.new()
	add_child(_keeper)
	var title := UIStyle.label("The Lum Shop", 72, Color.WHITE, 14)
	title.position = Vector2(360, 30)
	title.custom_minimum_size.x = 1200
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(title)
	_bank = UIStyle.label("", 40, Color("ffe45c"), 10)
	_bank.position = Vector2(60, 40)
	add_child(_bank)
	_rig_holder = Node2D.new()
	_rig_holder.position = Vector2(960, 700)
	add_child(_rig_holder)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override(&"panel", UIStyle.panel())
	panel.position = Vector2(560, 780)
	panel.custom_minimum_size = Vector2(800, 0)
	add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override(&"separation", 6)
	panel.add_child(v)
	_name = UIStyle.label("", 44, UIStyle.INK)
	_price = UIStyle.label("", 30, UIStyle.INK)
	_status = UIStyle.label("", 26, UIStyle.ACCENT)
	for l in [_name, _price, _status]:
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(l)
	var hint := UIStyle.label("Left / Right: browse (your dreamer tries it on)     Jump: buy     Punch: back to the map", 24, Color.WHITE, 8)
	hint.position = Vector2(160, 1010)
	hint.custom_minimum_size.x = 1600
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(hint)
	for i in Wardrobe.OUTFITS.size():
		if Wardrobe.OUTFITS[i].has("price"):
			_items.append(i)
	_refresh()
	Audio.play_music("shop")


func items() -> Array[int]:
	return _items


func selected() -> int:
	return _items[_index] if not _items.is_empty() else -1


func _process(delta: float) -> void:
	_t += delta
	_thanks = maxf(_thanks - delta, 0.0)
	_keeper.t = _t
	_keeper.happy = _thanks
	if _rig:
		_rig.position.y = sin(_t * 2.0) * 4.0
	_menu.poll(true)
	if _items.is_empty():
		return
	if _menu.left:
		_index = wrapi(_index - 1, 0, _items.size())
		Audio.play("menu_move", -6.0)
		_refresh()
	elif _menu.right:
		_index = wrapi(_index + 1, 0, _items.size())
		Audio.play("menu_move", -6.0)
		_refresh()
	elif _menu.confirm:
		buy_selected()
	elif _menu.back:
		set_process(false)
		GameManager.goto_scene(GameManager.WORLD_MAP)


## Buy the selected outfit if it isn't owned and you have the Lums. Returns true on a sale.
func buy_selected() -> bool:
	var i := selected()
	if i < 0:
		return false
	var o: Dictionary = Wardrobe.OUTFITS[i]
	if SaveData.owns(o["name"]):
		Audio.play("menu_move", -6.0, 0.7, 0.0)
		return false
	if not SaveData.buy(o["name"], int(o["price"])):
		Audio.play("menu_move", -6.0, 0.7, 0.0)
		_status.text = "Not enough Lums yet - %d more!" % (int(o["price"]) - SaveData.lum_bank())
		return false
	Audio.play("gem", -2.0)
	_thanks = 1.6
	_refresh()
	_status.text = "Thank you! Wear it from the character select (up / down)."
	return true


func _refresh() -> void:
	_bank.text = "Lums: %d" % SaveData.lum_bank()
	if _items.is_empty():
		_name.text = "Sold out!"
		return
	var i := selected()
	var o: Dictionary = Wardrobe.OUTFITS[i]
	_name.text = "%s   (%d / %d)" % [o["name"], _index + 1, _items.size()]
	var owned := SaveData.owns(o["name"])
	_price.text = "Owned" if owned else "%d Lums" % int(o["price"])
	if owned:
		_status.text = "Yours! Pick it at the character select (up / down)."
	elif SaveData.lum_bank() >= int(o["price"]):
		_status.text = "Press JUMP to buy it!"
	else:
		_status.text = "Collect %d more Lums to buy it." % (int(o["price"]) - SaveData.lum_bank())
	if _rig:
		_rig.queue_free()
	_rig = CharacterRig.new()
	_rig.scale = Vector2.ONE * 2.4
	_rig_holder.add_child(_rig)
	var base := Wardrobe.base_of(GameManager.character_for(0))
	_rig.build(Wardrobe.dress(base, i))


## The shopkeeper: a big sleepy Snoozling under a striped awning.
class Keeper extends Node2D:
	var t := 0.0
	var happy := 0.0

	func _process(_delta: float) -> void:
		queue_redraw()

	func _draw() -> void:
		var o := Color("1d1726")
		# The awning.
		for k in 12:
			var x := 160.0 + k * 133.0
			var col := Color("ff5d8f") if k % 2 == 0 else Color("fff6e8")
			draw_colored_polygon(PackedVector2Array([Vector2(x, 150), Vector2(x + 133, 150), Vector2(x + 133, 230),
					Vector2(x + 66, 260), Vector2(x, 230)]), col)
		draw_line(Vector2(160, 150), Vector2(1756, 150), o, 5.0)
		# The counter.
		draw_rect(Rect2(1280, 520, 460, 240), Color("c98a4b"))
		draw_rect(Rect2(1260, 500, 500, 30), Color("8a5a36"))
		# The shopkeeper Snoozling peeking over it.
		var c := Vector2(1510, 470 + sin(t * 2.0) * 6.0 - happy * 20.0 * absf(sin(t * 10.0)))
		Art.shape(self, Art.ellipse(c, 110, 90, 28), Color("c9a0ff"), o, 5.0)
		for s: float in [-1.0, 1.0]:
			Art.shape(self, Art.ellipse(c + Vector2(s * 80, -80), 26, 34, 14), Color("c9a0ff"), o, 4.0)
			var e := c + Vector2(s * 36, -14)
			if happy > 0.0:
				draw_arc(e + Vector2(0, 6), 12.0, PI, TAU, 10, o, 4.0)  # ^ ^
			else:
				draw_line(e + Vector2(-12, 0), e + Vector2(12, 0), o, 4.0)  # sleepy eyes
		draw_arc(c + Vector2(0, 26), 18.0, 0.2, PI - 0.2, 10, o, 4.0)
		# A Lum on the counter.
		var lum := Vector2(1340, 470 + sin(t * 3.0) * 8.0)
		draw_circle(lum, 26.0, Color(1.0, 0.9, 0.36, 0.35))
		Art.shape(self, Art.ellipse(lum, 16, 16, 16), Color("ffe45c"), o, 3.0)
		# Zzz (or hearts after a sale).
		for k in 3:
			var ph := fposmod(t * 0.5 + k * 0.33, 1.0)
			var p := c + Vector2(110 + ph * 60.0, -90 - ph * 90.0)
			var f := ThemeDB.fallback_font
			draw_string(f, p, "<3" if happy > 0.0 else "z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(24 + ph * 18), Color(o, 1.0 - ph))
