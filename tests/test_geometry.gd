extends SceneTree
## Run: godot --headless --path . --script res://tests/test_geometry.gd
const Shapes = preload("res://scripts/attack_patterns.gd")
const Encounters = preload("res://scripts/encounter_data.gd")
const Mods = preload("res://scripts/modifiers.gd")

func _initialize() -> void:
    var errors: Array[String] = []
    if Shapes.cells_for("Jab", Vector2i(1, 1), Vector2i(2, 1)).size() != 1:
        errors.append("Jab adjacent attack failed")
    if not Shapes.cells_for("Jab", Vector2i(1, 1), Vector2i(2, 2)).is_empty():
        errors.append("Jab diagonal must be invalid")
    if Shapes.cells_for("Sweep", Vector2i(1, 1), Vector2i(4, 1)).size() != 3:
        errors.append("Sweep cardinal range failed")
    if Shapes.cells_for("Burst", Vector2i(0, 0), Vector2i(1, 0)).size() != 4:
        errors.append("Burst edge clipping failed")
    if not Shapes.cells_for("Sweep", Vector2i(-1, 2), Vector2i(2, 2)).is_empty():
        errors.append("Out-of-bounds attack origin accepted")
    if not Shapes.cells_for("Burst", Vector2i(2, 2), Vector2i(6, 2)).is_empty():
        errors.append("Out-of-bounds attack target accepted")
    for r in range(3):
        for t in range(4):
            var cells: Array[Vector2i] = Encounters.pattern(r, t)["cells"]
            if cells.is_empty() or cells.size() >= 36:
                errors.append("Room %d turn %d pattern size invalid" % [r, t])
            for cell in cells:
                if not Shapes.inside(cell):
                    errors.append("Room %d turn %d out-of-bounds tile" % [r, t])
    # Release A shared frozen fixture: the SAME golden x,y cells are consumed by
    # Node and native Godot; changes to either engine's twelve attacks fail CI.
    var path := "res://tests/encounter_patterns.json"
    if not FileAccess.file_exists(path):
        errors.append("Missing shared encounter pattern fixture")
    else:
        var fixture: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
        if not (fixture is Dictionary):
            errors.append("Unparseable shared encounter pattern fixture")
        else:
            var expected_rooms: Array = fixture["rooms"]
            if expected_rooms.size() != 3:
                errors.append("Expected exactly three frozen room definitions")
            else:
                for r in range(3):
                    var expected: Dictionary = expected_rooms[r]
                    var actual: Dictionary = Encounters.room(r)
                    if str(actual["name"]) != str(expected["title"]):
                        errors.append("Room %d title drift" % r)
                    if str(actual["enemy"]) != str(expected["enemy"]):
                        errors.append("Room %d enemy drift" % r)
                    if int(actual["hp"]) != int(expected["hp"]):
                        errors.append("Room %d enemy HP drift" % r)
                    if actual["pos"] != Vector2i(int(expected["pos"][0]), int(expected["pos"][1])):
                        errors.append("Room %d enemy position drift" % r)
                    if actual["start"] != Vector2i(int(expected["spawn"][0]), int(expected["spawn"][1])):
                        errors.append("Room %d player spawn drift" % r)
                    if not is_equal_approx(float(actual["tell"]), float(expected["tell"])):
                        errors.append("Room %d warning duration drift" % r)
                    if int(actual["damage"]) != int(expected["damage"]):
                        errors.append("Room %d direct strike drift" % r)
                    if str(actual["effect"]) != str(expected["effect"]):
                        errors.append("Room %d floor effect drift" % r)
                    if int(actual["effect_damage"]) != int(expected["effect_damage"]):
                        errors.append("Room %d floor effect power drift" % r)
                    var patterns: Array = expected["patterns"]
                    if patterns.size() != 4:
                        errors.append("Room %d expected four patterns" % r)
                        continue
                    for t in range(4):
                        var golden_pattern: Dictionary = patterns[t]
                        var computed: Dictionary = Encounters.pattern(r, t)
                        var cells: Array[Vector2i] = computed["cells"]
                        if str(computed["name"]) != str(golden_pattern["name"]):
                            errors.append("Room %d turn %d attack name drift" % [r, t])
                        var golden_ids: Array[String] = []
                        for tile in golden_pattern["tiles"]:
                            golden_ids.append(str(tile))
                        var observed_ids: Array[String] = []
                        for cell in cells:
                            observed_ids.append("%d,%d" % [cell.x, cell.y])
                        golden_ids.sort()
                        observed_ids.sort()
                        if observed_ids != golden_ids:
                            errors.append("Room %d turn %d warning geometry drift" % [r, t])
                        if Encounters.pattern(r, t + 4)["cells"] != cells:
                            errors.append("Room %d turn %d pattern did not repeat" % [r, t])
                        for y in range(6):
                            for x in range(6):
                                var here := Vector2i(x, y)
                                if here == actual["pos"]:
                                    continue
                                var safe := false
                                for offset in [Vector2i.ZERO, Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
                                    var target: Vector2i = here + offset
                                    if Shapes.inside(target) and target != actual["pos"] and not cells.has(target):
                                        safe = true
                                        break
                                if not safe:
                                    errors.append("Room %d turn %d forced direct strike at %s" % [r, t, str(here)])

    # If an old Hanger drip slows next movement, the warning two patterns
    # later must not strike that same immobile tile.
    for t in range(4):
        var old_drips: Array[Vector2i] = Encounters.pattern(1, t)["cells"]
        var later_warning: Array[Vector2i] = Encounters.pattern(1, t + 2)["cells"]
        for cell in old_drips:
            if later_warning.has(cell):
                errors.append("Hanger drip creates forced direct-hit tile %s on turn %d" % [str(cell), t])

    # Second-room rewards cannot offer a modifier made inert by the first.
    for owned_id in ["numb", "comfort"]:
        for seed in range(32):
            var generator := RandomNumberGenerator.new()
            generator.seed = seed
            var owned_mods: Array[String] = [str(owned_id)]
            var choices: Array[Dictionary] = Mods.choices(owned_mods, generator)
            if choices.size() != 3:
                errors.append("Reward set is not three distinct choices")
            var offered: Array[String] = []
            for choice in choices:
                var chosen := str(choice["id"])
                if offered.has(chosen) or owned_mods.has(chosen):
                    errors.append("Duplicate/owned reward: " + chosen)
                offered.append(chosen)
                if (owned_id == "numb" and chosen == "comfort") or (owned_id == "comfort" and chosen == "numb"):
                    errors.append("Inert Numb/Comfort modifier pairing offered")
    if errors.is_empty():
        print("PASS: Godot geometry and encounter checks")
        quit(0)
    else:
        for error in errors:
            push_error(error)
        quit(1)