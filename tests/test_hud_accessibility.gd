extends SceneTree
## Agent C native-HUD accessibility regression, no gameplay-balance changes.
## godot --headless --path . --script res://tests/test_hud_accessibility.gd
const MAIN_SCENE = preload("res://scenes/main.tscn")
var failures: int = 0

func _initialize() -> void:
    call_deferred("_run")

func _check(condition: bool, message: String) -> void:
    if condition:
        print("PASS: ", message)
    else:
        failures += 1
        push_error("FAIL: " + message)

func _run() -> void:
    var game: Node = MAIN_SCENE.instantiate()
    root.add_child(game)
    _check(game.get("phase") == "SETUP", "Native run is setup-gated")
    var tiles: Array = game.get("tiles")
    _check(tiles.size() == 36, "All 36 board squares exist")
    game.call("_begin_from_setup")
    _check(game.get("phase") == "TELL", "Opening a run displays a tell")
    var warned: Array = game.get("warned")
    var cell: Vector2i = warned[0]
    var tile: Button = tiles[cell.y * 6 + cell.x]
    _check(not tile.disabled, "Live warning tiles can receive keyboard focus")
    _check(tile.tooltip_text.contains("enemy strike"), "Visible threat has non-color text")
    var before: Vector2i = game.get("player")
    tile.emit_signal("pressed")
    _check(game.get("phase") == "TELL", "Warning-tile click never skips memory phase")
    _check(game.get("player") == before, "Warning-tile click does not move the player")
    await create_timer(1.10).timeout
    _check(game.get("phase") == "MOVE", "Tell ends before movement")
    _check(not tile.tooltip_text.contains("enemy strike"), "Hidden warning is not spoiled by tooltip")
    game.set("retain_warnings", true)
    game.call("_refresh")
    _check(tile.tooltip_text.contains("retained warning"), "Opt-in retained warning has non-color text")
    game.call("_open_setup")
    _check(game.get("phase") == "SETUP", "Opening setup locks the battle state")
    tile.emit_signal("pressed")
    _check(game.get("phase") == "SETUP", "Tile activation cannot bypass pregame setup")
    game.queue_free()
    if failures == 0:
        print("PASS: Native quiet-HUD accessibility regression suite")
    quit(0 if failures == 0 else 1)
