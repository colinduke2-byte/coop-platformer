class_name LevelCatalog
## Every playable level, grouped into worlds, in play order.
## Add a level: build the scene (tools/levelgen or by hand), then add a line
## here. `id` is used for save data, `map` is its node on the world map
## (1920x1080 map space), `world` which world it belongs to.
## Within a world, a level unlocks when the one before it is finished.
## Bonus Dreams are always open.

const WORLDS: Array[Dictionary] = [
	{"id": "w1", "name": "The Lullaby Woods", "blurb": "Where every dream begins. Mind the thorns."},
	{"id": "bonus", "name": "Bonus Dreams", "blurb": "Old favourites and tricky extras."},
]

const LEVELS: Array[Dictionary] = [
	{"id": "w1_1", "world": "w1", "name": "Pillow Meadow", "scene": "res://levels/w1_1_pillow_meadow.tscn",
		"blurb": "A sleepy meadow. Stretch your legs, bop some Grumblets, meet Shellbert.",
		"theme": "res://world/themes/meadow.tres", "map": Vector2(250, 800)},
	{"id": "w1_2", "world": "w1", "name": "Dandelion Drift", "scene": "res://levels/w1_2_dandelion_drift.tscn",
		"blurb": "Ride the breeze on dandelion puffs. Watch out for Bumblebonks!",
		"theme": "res://world/themes/breezy.tres", "map": Vector2(560, 640)},
	{"id": "w1_3", "world": "w1", "name": "Mossy Hollow", "scene": "res://levels/w1_3_mossy_hollow.tscn",
		"blurb": "Glowing mushrooms, shy ghosts and spore puffs deep under the hill.",
		"theme": "res://world/themes/hollow.tres", "map": Vector2(860, 790)},
	{"id": "w1_4", "world": "w1", "name": "Bramble Bridges", "scene": "res://levels/w1_4_bramble_bridges.tscn",
		"blurb": "A village in the treetops: rope bridges, swinging logs and seesaws.",
		"theme": "res://world/themes/canopy.tres", "map": Vector2(1150, 560)},
	{"id": "w1_5", "world": "w1", "name": "Millstream Rush", "scene": "res://levels/w1_5_millstream_rush.tscn",
		"blurb": "Hop the log rafts down the river, past the old water mill.",
		"theme": "res://world/themes/river.tres", "map": Vector2(1440, 760)},
	{"id": "w1_6", "world": "w1", "name": "Thornwood Keep", "scene": "res://levels/w1_6_thornwood_keep.tscn",
		"blurb": "The bramble castle. Something big and prickly lives at the top...",
		"theme": "res://world/themes/thorn.tres", "map": Vector2(1680, 380), "boss": true},
	{"id": "demo", "world": "bonus", "name": "Dreamer's Playground", "scene": "res://levels/demo_level.tscn",
		"blurb": "Every move in one long sunny playground.", "theme": "res://world/themes/meadow.tres"},
	{"id": "candy", "world": "bonus", "name": "Candy Canopy", "scene": "res://levels/candy_canopy.tscn",
		"blurb": "Bouncy mushrooms, Boingo chains, a soda lake... and a syrup flood!", "theme": "res://world/themes/candy.tres"},
	{"id": "sunset", "world": "bonus", "name": "Sunset Gusts", "scene": "res://levels/sunset_gusts.tscn",
		"blurb": "Crumbling bridges, gusty cliffs, cannons and a locked arena.", "theme": "res://world/themes/sunset.tres"},
	{"id": "glacier", "world": "bonus", "name": "Glacier Grotto", "scene": "res://levels/glacier_grotto.tscn",
		"blurb": "Slide the glacier, swim the frozen lake... and wake KING GRUMBLO.", "theme": "res://world/themes/glacier.tres"},
]


static func index_of(scene_path: String) -> int:
	for i in LEVELS.size():
		if LEVELS[i]["scene"] == scene_path:
			return i
	return -1


static func by_id(id: String) -> Dictionary:
	for l in LEVELS:
		if l["id"] == id:
			return l
	return {}


static func levels_in(world_id: String) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for l in LEVELS:
		if l["world"] == world_id:
			out.append(l)
	return out


## The next level in the same world ("" at the end of a world).
static func next_after(scene_path: String) -> String:
	var i := index_of(scene_path)
	if i == -1 or i + 1 >= LEVELS.size() or LEVELS[i + 1]["world"] != LEVELS[i]["world"]:
		return ""
	var next: String = LEVELS[i + 1]["scene"]
	return next if ResourceLoader.exists(next) else ""


## Is the level's scene actually built? (The map shows planned levels too.)
static func exists(id: String) -> bool:
	var info := by_id(id)
	return not info.is_empty() and ResourceLoader.exists(info["scene"])


static func is_unlocked(id: String) -> bool:
	var info := by_id(id)
	if info.is_empty() or not ResourceLoader.exists(info["scene"]):
		return false
	if info["world"] == "bonus" or OS.has_feature("unlock_all"):
		return true
	var list := levels_in(info["world"])
	var k := list.find(info)
	return k <= 0 or SaveData.get_record(list[k - 1]["id"]).get("done", false)
