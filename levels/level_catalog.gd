class_name LevelCatalog
## The list of playable levels, in order. Add a level: make the scene (copy
## levels/level_template.tscn), then add a line here. `id` is used for save data.

const LEVELS: Array[Dictionary] = [
	{"id": "demo", "name": "Dreamer's Playground", "scene": "res://levels/demo_level.tscn",
		"blurb": "Learn every move in a sunny meadow.", "theme": "res://world/themes/meadow.tres"},
]


static func index_of(scene_path: String) -> int:
	for i in LEVELS.size():
		if LEVELS[i]["scene"] == scene_path:
			return i
	return -1


static func next_after(scene_path: String) -> String:
	var i := index_of(scene_path)
	if i == -1 or i + 1 >= LEVELS.size():
		return ""
	return LEVELS[i + 1]["scene"]
