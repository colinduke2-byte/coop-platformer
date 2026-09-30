class_name Wardrobe
## THE DREAM WARDROBE: outfits (colour schemes) every dreamer can wear, unlocked
## by collecting Dream Gems and rescuing Snoozlings across the story worlds.
## Pick one on the character select screen with UP / DOWN.
## Add an outfit: append to OUTFITS. "need_gems" / "need_snoozlings" are totals
## over every story world; colours replace the character's main/accent/trim.

const OUTFITS: Array[Dictionary] = [
	{"name": "Classic"},
	{"name": "Sunset", "need_gems": 6,
		"main": Color("ff7a45"), "accent": Color("ffd23f"), "trim": Color("b8435e")},
	{"name": "Minty", "need_gems": 12,
		"main": Color("3bceac"), "accent": Color("fff3b0"), "trim": Color("1f7a6a")},
	{"name": "Snoozling PJs", "need_snoozlings": 6,
		"main": Color("ffb3d9"), "accent": Color("ffffff"), "trim": Color("c58bff")},
	{"name": "Frostbite", "need_gems": 20,
		"main": Color("7fc8ff"), "accent": Color("f4fbff"), "trim": Color("3a6ea8")},
	{"name": "Midnight", "need_gems": 28,
		"main": Color("2a2f55"), "accent": Color("ffd23f"), "trim": Color("c9a0ff")},
	{"name": "Golden Dreamer", "need_gems": 36, "need_snoozlings": 12,
		"main": Color("f2b632"), "accent": Color("fff6c9"), "trim": Color("b87a1a")},
]


static func totals() -> Dictionary:
	var t := {"gems": 0, "snoozlings": 0}
	for w in LevelCatalog.story_worlds():
		var wt := SaveData.world_totals(w)
		t["gems"] += wt["gems"]
		t["snoozlings"] += wt["snoozlings"]
	return t


static func is_unlocked(index: int) -> bool:
	if OS.has_feature("unlock_all") or LevelCatalog.dev_unlock:
		return true
	var o: Dictionary = OUTFITS[index]
	var t := totals()
	return t["gems"] >= o.get("need_gems", 0) and t["snoozlings"] >= o.get("need_snoozlings", 0)


## "Find 12 Dream Gems" / "Rescue 6 Snoozlings" (what's still missing).
static func requirement(index: int) -> String:
	var o: Dictionary = OUTFITS[index]
	var t := totals()
	var parts: Array[String] = []
	if o.has("need_gems") and t["gems"] < o["need_gems"]:
		parts.append("find %d Dream Gems (%d/%d)" % [o["need_gems"], t["gems"], o["need_gems"]])
	if o.has("need_snoozlings") and t["snoozlings"] < o["need_snoozlings"]:
		parts.append("rescue %d Snoozlings (%d/%d)" % [o["need_snoozlings"], t["snoozlings"], o["need_snoozlings"]])
	return " and ".join(parts)


## A copy of `def` wearing outfit `index` (index 0 = the character itself).
static func dress(def: CharacterDef, index: int) -> CharacterDef:
	if index <= 0 or index >= OUTFITS.size():
		return def
	var o: Dictionary = OUTFITS[index]
	var d: CharacterDef = def.duplicate()
	d.main_color = o["main"]
	d.accent_color = o["accent"]
	d.trim_color = o["trim"]
	d.resource_name = def.display_name  # remember who's underneath
	return d


## The base character of a (possibly dressed) def.
static func base_of(def: CharacterDef) -> CharacterDef:
	for c in GameManager.CHARACTERS:
		if c == def or c.display_name == def.display_name:
			return c
	return def
