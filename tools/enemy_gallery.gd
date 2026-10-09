extends Node2D
## Line-up of every enemy for art review:
##   godot --path . res://tools/enemy_gallery.tscn -- --shots=/tmp/dir
## (without --shots it just shows them; they're frozen after a moment).

const ENEMIES := ["grunt", "flapjack", "spikeroo", "shieldbug", "spitpod", "bonkhorn", "boingo",
		"shellbert", "bumblebonk", "diggle", "ribbiton", "prickleroll", "puffcap", "wispet",
		"slidgewick", "snowl", "yetling", "grumblefrost",
		"cocobonk", "swoopbeak", "nibblefin", "chamelia",
		"windup", "sparkbot", "springbot", "cuckoolossus",
		"pufferfin", "crabbit", "jellybob", "eelectra", "anglerling", "inkabella",
		"jackbonk", "unicyclops", "popcorn_pufflet", "balloonatic", "marionette", "madame_topsy"]


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("9fd8ee")
	bg.size = Vector2(4000, 2000)
	bg.position = Vector2(-500, -1000)
	add_child(bg)
	var floor_block: Block = load("res://world/block.tscn").instantiate()
	floor_block.position = Vector2(-200, 0)
	floor_block.size = Vector2(4000, 200)
	add_child(floor_block)
	var cols := 9
	for i in ENEMIES.size():
		var e: Enemy = load("res://enemies/%s.tscn" % ENEMIES[i]).instantiate()
		var row := i / cols
		e.position = Vector2(120 + (i % cols) * 250, -40 - row * 260 if row > 0 else 0)
		e.start_facing = 1
		add_child(e)
		var l := Label.new()
		l.text = ENEMIES[i]
		l.position = e.position + Vector2(-50, 20)
		l.add_theme_color_override(&"font_color", Color("1d1726"))
		add_child(l)
		if row > 0:
			var shelf: Block = load("res://world/block.tscn").instantiate()
			shelf.position = e.position + Vector2(-100, 0)
			shelf.size = Vector2(200, 30)
			add_child(shelf)
	var cam := Camera2D.new()
	cam.position = Vector2(1100, -560)
	cam.zoom = Vector2(0.62, 0.62)
	add_child(cam)
	cam.make_current()
	await get_tree().create_timer(0.7).timeout
	for e in get_children():
		if e is Enemy:
			e.set_physics_process(false)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			await get_tree().process_frame
			await get_tree().process_frame
			get_viewport().get_texture().get_image().save_png(a.trim_prefix("--shots=") + "/enemies.png")
			get_tree().quit()
