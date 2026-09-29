---
description: Create a new enemy type
argument-hint: <describe behavior and how players defeat it>
---
Create this enemy: $ARGUMENTS

Use `enemies/grunt.gd` / `grunt.tscn` as the pattern: CharacterBody2D on layer 3
(mask world), a Hitbox Area2D masking players, `take_hit(by, knockback)` for
punches, stomp handling, `EventBus.enemy_defeated` on death, grey-box Polygon2D
visual, exported behavior numbers. Place 1–2 in `levels/test_level.tscn` where
they're fun to fight, add a test if the defeat rule is unusual, run
`bash tools/check.sh`, and tell me where to find it in the level.
