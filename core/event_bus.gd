extends Node
## Global signal hub. Systems talk through here instead of holding references
## to each other, so any piece (HUD, audio, camera, VFX) can listen in.

@warning_ignore_start("unused_signal")
signal player_joined(player: Player)
signal player_left(slot: int)
signal player_died(player: Player)
signal player_revived(player: Player)
signal player_jumped(player: Player)
signal player_landed(player: Player)
signal player_hard_landed(player: Player, speed: float)
signal player_ground_pounded(player: Player, position: Vector2)
signal player_slid(player: Player)
signal player_ledge_grabbed(player: Player)
signal player_wall_jumped(player: Player)
signal player_character_changed(player: Player)
signal lum_collected(slot: int)
signal lums_changed(total: int)
signal enemy_defeated(enemy: Node2D, by: Player)
signal punch_landed(player: Player, target: Node2D, power: float)
signal breakable_broken(breakable: Node2D, by: Player)
signal checkpoint_reached(position: Vector2)
signal level_reset
signal device_lost(slot: int)
@warning_ignore_restore("unused_signal")
