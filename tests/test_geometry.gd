extends SceneTree
## Run: godot --headless --path . --script res://tests/test_geometry.gd
const Shapes = preload("res://scripts/attack_patterns.gd")
const Encounters = preload("res://scripts/encounter_data.gd")

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
    if errors.is_empty():
        print("PASS: Godot geometry and encounter checks")
        quit(0)
    else:
        for error in errors:
            push_error(error)
        quit(1)