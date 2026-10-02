class_name LevelCatalog
## Every playable level, grouped into worlds, in play order.
## Add a level: build the scene (tools/levelgen or by hand), then add a line
## here. `id` is used for save data, `map` is its node on the world map
## (1920x1080 map space), `world` which world it belongs to.
## Within a world, a level unlocks when the one before it is finished.
## Bonus Dreams are always open.

## F9 on the world map (dev shortcut, this session only): everything is open.
static var dev_unlock := false

const WORLDS: Array[Dictionary] = [
	{"id": "w1", "name": "The Lullaby Woods", "blurb": "Where every dream begins. Mind the thorns."},
	{"id": "w2", "name": "Frostwhistle Peaks", "blurb": "Snowballs, ski lifts and a very grumpy yeti."},
	{"id": "w3", "name": "Rainbloom Jungle", "blurb": "Warm rain, swinging vines and a queen you can't always see."},
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
	{"id": "w2_1", "world": "w2", "name": "Snowball Slopes", "scene": "res://levels/w2_1_snowball_slopes.tscn",
		"blurb": "Punch a snow pile and watch the snowball grow. Mind the penguins on the pond!",
		"theme": "res://world/themes/frost.tres", "map": Vector2(230, 860)},
	{"id": "w2_2", "world": "w2", "name": "Cablecar Cliffs", "scene": "res://levels/w2_2_cablecar_cliffs.tscn",
		"blurb": "Ride the old ski lifts up the cliffs, through the gusts.",
		"theme": "res://world/themes/gondola.tres", "map": Vector2(520, 700)},
	{"id": "w2_3", "world": "w2", "name": "Crystal Caverns", "scene": "res://levels/w2_3_crystal_caverns.tscn",
		"blurb": "Inside the mountain: icicles, a frozen lake and glowing crystals.",
		"theme": "res://world/themes/crystal.tres", "map": Vector2(820, 820)},
	{"id": "w2_4", "world": "w2", "name": "Avalanche Alley", "scene": "res://levels/w2_4_avalanche_alley.tscn",
		"blurb": "It's awfully quiet up here... RUN!",
		"theme": "res://world/themes/avalanche.tres", "map": Vector2(1110, 620)},
	{"id": "w2_5", "world": "w2", "name": "Hot Spring Hollow", "scene": "res://levels/w2_5_hot_spring_hollow.tscn",
		"blurb": "Steamy pools, geysers and thermals hidden between the peaks.",
		"theme": "res://world/themes/hotspring.tres", "map": Vector2(1420, 780)},
	{"id": "w2_6", "world": "w2", "name": "Grumblefrost's Summit", "scene": "res://levels/w2_6_grumblefrost_summit.tscn",
		"blurb": "The top of the mountain, where the Snowball King sits on his icy throne.",
		"theme": "res://world/themes/summit.tres", "map": Vector2(1640, 300), "boss": true},
	{"id": "w3_1", "world": "w3", "name": "Drizzle Thicket", "scene": "res://levels/w3_1_drizzle_thicket.tscn",
		"blurb": "Warm rain, snapping flytraps and your first swing on a jungle liana.",
		"theme": "res://world/themes/jungle.tres", "map": Vector2(240, 850)},
	{"id": "w3_2", "world": "w3", "name": "Canopy Highway", "scene": "res://levels/w3_2_canopy_highway.tscn",
		"blurb": "Rope bridges and vines between giant trees - don't look down!",
		"theme": "res://world/themes/treetops.tres", "map": Vector2(540, 650)},
	{"id": "w3_3", "world": "w3", "name": "Sunken Temple", "scene": "res://levels/w3_3_sunken_temple.tscn",
		"blurb": "Old traps, a lost key and a flooded crypt under the roots.",
		"theme": "res://world/themes/ruins.tres", "map": Vector2(850, 820)},
	{"id": "w3_4", "world": "w3", "name": "Rumbletide Rapids", "scene": "res://levels/w3_4_rumbletide_rapids.tscn",
		"blurb": "Log rafts, leaping fish and a climb up the roaring falls.",
		"theme": "res://world/themes/rapids.tres", "map": Vector2(1130, 600)},
	{"id": "w3_5", "world": "w3", "name": "Firefly Bog", "scene": "res://levels/w3_5_firefly_bog.tscn",
		"blurb": "A dark, steamy swamp lit only by fireflies. Stay close!",
		"theme": "res://world/themes/swamp.tres", "map": Vector2(1420, 800)},
	{"id": "w3_6", "world": "w3", "name": "Chamelia's Temple", "scene": "res://levels/w3_6_chamelia_temple.tscn",
		"blurb": "The great temple, where the Colour Queen hides in plain sight...",
		"theme": "res://world/themes/temple.tres", "map": Vector2(1650, 330), "boss": true},
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
	if info["world"] == "bonus" or OS.has_feature("unlock_all") or dev_unlock:
		return true
	var list := levels_in(info["world"])
	var k := list.find(info)
	if k > 0:
		return SaveData.get_record(list[k - 1]["id"]).get("done", false)
	# The first level of a world opens when the world before it is finished.
	var prev := previous_world(info["world"])
	return prev == "" or world_done(prev)


## The story worlds in order ("w1", "w2", ...; not the bonus levels).
static func story_worlds() -> Array[String]:
	var out: Array[String] = []
	for w in WORLDS:
		if w["id"] != "bonus":
			out.append(w["id"])
	return out


static func previous_world(world_id: String) -> String:
	var ws := story_worlds()
	var i := ws.find(world_id)
	return ws[i - 1] if i > 0 else ""


static func next_world(world_id: String) -> String:
	var ws := story_worlds()
	var i := ws.find(world_id)
	return ws[i + 1] if i >= 0 and i + 1 < ws.size() else ""


static func world_number(world_id: String) -> int:
	return story_worlds().find(world_id) + 1


static func world_info(world_id: String) -> Dictionary:
	for w in WORLDS:
		if w["id"] == world_id:
			return w
	return {}


## Has the last level of the world been finished (e.g. its boss beaten)?
static func world_done(world_id: String) -> bool:
	var list := levels_in(world_id)
	return dev_unlock or (not list.is_empty() and SaveData.get_record(list[-1]["id"]).get("done", false))
