extends Node2D
## Every dreamer in every Dream Wardrobe outfit, for art review:
##   godot --path . res://tools/outfit_gallery.tscn -- --shots=/tmp/dir


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("f3ecff")
	bg.size = Vector2(1920, 1080)
	add_child(bg)
	var n := Wardrobe.OUTFITS.size()
	for o in n:
		var l := Label.new()
		l.text = Wardrobe.OUTFITS[o]["name"]
		l.position = Vector2(60 + o * 260, 60)
		l.add_theme_font_size_override(&"font_size", 26)
		l.add_theme_color_override(&"font_color", Color("2b2233"))
		add_child(l)
		for c in GameManager.CHARACTERS.size():
			var rig := CharacterRig.new()
			rig.position = Vector2(140 + o * 260, 300 + c * 220)
			rig.scale = Vector2.ONE * 1.6
			add_child(rig)
			rig.build(Wardrobe.dress(GameManager.CHARACTERS[c], o))
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			for i in 10:
				await get_tree().process_frame
			get_viewport().get_texture().get_image().save_png(a.trim_prefix("--shots=") + "/outfits.png")
			get_tree().quit()
