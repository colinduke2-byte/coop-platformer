class_name CharacterDef
extends Resource
## One playable character's look. All four play the same; this is cosmetic only.
## CharacterRig builds the vector cutout from these values. Edit the .tres files
## in characters/ in the Inspector to restyle a character.

enum Headwear { WIZARD_HAT, BUCKET_HELM, BERET, BANDANA }
## What the character does after standing still for a couple of seconds.
enum IdleQuirk { NONE, SNORE, PLUME_WAG, HUM, SHIFTY_EYES }

@export var display_name := "Dreamer"
@export_multiline var blurb := ""

@export_group("Colors")
@export var main_color := Color("6a4bc4")    ## robe / tunic / coat; also the HUD colour
@export var accent_color := Color("f7c948")  ## star, plume, feather, bandana
@export var trim_color := Color("f7c948")    ## belt, helm steel, beret, scarf
@export var skin_color := Color("f2c9a0")
@export var hand_color := Color("f2c9a0")    ## gloves / gauntlets if different from skin

@export_group("Proportions")
@export var head_radius := 17.0
@export var nose_size := 1.0                 ## 1 = the big goofy nose
@export var body_width := 34.0               ## widest point (hem)
@export var body_height := 28.0
@export var leg_length := 12.0

@export_group("Extras")
@export var headwear: Headwear = Headwear.WIZARD_HAT
@export var has_beard := false
@export var has_long_hair := false           ## flowing hair down the back + a lock by the cheek
@export var hair_color := Color("c4552f")
@export var has_lashes := false              ## eyelashes
@export var has_mask := false
@export var has_scarf := false
@export var idle_quirk: IdleQuirk = IdleQuirk.NONE
