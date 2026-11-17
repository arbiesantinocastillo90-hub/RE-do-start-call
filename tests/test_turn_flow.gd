extends SceneTree
## Headless turn-lock regression checks for the real Godot Control scene.
## Run after project import:
## godot --headless --path . --script res://tests/test_turn_flow.gd

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


func _press(game: Node, code: int) -> void:
    var event := InputEventKey.new()
    event.keycode = code
    event.pressed = true
    game.call("_input", event)


func _run() -> void:
    var game: Node = MAIN_SCENE.instantiate()
    root.add_child(game)

    # Native pre-game UX (Agent C) opens SETUP first; older main opens TELL.
    if game.get("phase") == "SETUP":
        var before_setup_position: Vector2i = game.get("player")
        _press(game, KEY_RIGHT)
        _check(game.get("player") == before_setup_position, "Setup locks battle movement")
        game.call("_begin_from_setup")
    _check(game.get("phase") == "TELL", "New run starts with a warning")
    var warned_initial: Array = game.get("warned").duplicate()
    _check(warned_initial.size() == 6, "First pipe warning covers six tiles")

    # Direct API calls must not bypass the phase lock, even if UI dispatch changes.
    game.call("_try_move", Vector2i(2, 2))
    _check(game.get("player") == Vector2i(1, 2), "Direct movement rejected during TELL")
    _press(game, KEY_RIGHT)
    _check(game.get("phase") == "TELL", "Keyboard movement rejected during TELL")

    await create_timer(1.15).timeout
    _check(game.get("phase") == "MOVE", "Tell timer unlocks movement")
    _check(not game.get("tell_visible"), "Warning flash hides before movement")
    _check(game.get("warned") == warned_initial, "Hidden strike coordinates stay locked")

    # The board itself is keyboard focusable. Space must not secretly HOLD.
    # _press tests _input ownership; GUI activation is a separate manual check.
    var board_tiles: Array = game.get("tiles")
    var focused_move_tile: Button = board_tiles[14] # (2,2)
    focused_move_tile.grab_focus()
    _press(game, KEY_SPACE)
    _check(game.get("phase") == "MOVE", "Space on focused board tile does not HOLD")
    focused_move_tile.release_focus()

    game.call("_try_move", Vector2i(2, 3))
    _check(game.get("phase") == "MOVE", "Diagonal attempt cannot spend movement")
    game.call("_select_attack", "Unknown")
    _check(game.get("attack") == "Jab", "Unknown attack cannot replace selected type")

    _press(game, KEY_RIGHT)
    _check(game.get("player") == Vector2i(2, 2), "Arrow moves exactly one tile")
    _check(game.get("phase") == "ATTACK", "Move advances to ATTACK")
    game.call("_try_move", Vector2i(3, 2))
    _check(game.get("player") == Vector2i(2, 2), "Direct second movement is rejected")
    game.call("_hold")
    _check(game.get("phase") == "ATTACK", "HOLD cannot spend another action")

    # Invalid target preserves attack phase; valid keyboard aiming commits once.
    game.call("_try_attack", Vector2i(5, 5))
    _check(game.get("phase") == "ATTACK", "Invalid attack does not end the turn")
    game.call("_select_attack", "Sweep")
    _press(game, KEY_RIGHT)
    _press(game, KEY_RIGHT)
    _check(game.get("aim") == Vector2i(4, 2), "Arrows aim during ATTACK")
    # A focused HUD button must receive Enter itself, not trigger a hidden attack.
    var action_buttons: Dictionary = game.get("attack_buttons")
    var focused_action: Button = action_buttons["Jab"]
    focused_action.grab_focus()
    _press(game, KEY_ENTER)
    _check(game.get("phase") == "ATTACK", "Enter on focused HUD button does not fire")
    _check(game.get("round_turn") == 0, "Focused control cannot spend a combat turn")
    focused_action.release_focus()
    var focused_attack_tile: Button = board_tiles[16] # (4,2), current enemy
    focused_attack_tile.grab_focus()
    _press(game, KEY_ENTER)
    _check(game.get("phase") == "ATTACK", "Enter on focused board tile is GUI-owned")
    _check(game.get("round_turn") == 0, "Focused board tile cannot spend hidden turn")
    focused_attack_tile.release_focus()
    _press(game, KEY_ENTER)

    _check(game.get("round_turn") == 1, "Valid attack resolves one enemy turn")
    _check(game.get("phase") == "TELL", "Resolution returns to next TELL")
    _check(game.get("enemy_hp") == 4, "Sweep damage and first trace tick preserved")
    _check(game.get("hp") == 12, "Locked threatened tile strikes for two damage")

    var ground: Dictionary = game.get("ground")
    var all_warned_marked := true
    for cell in warned_initial:
        var found_enemy_mark := false
        for effect in ground.get(cell, []):
            if effect["source"] == "enemy":
                found_enemy_mark = true
                break
        if not found_enemy_mark:
            all_warned_marked = false
    _check(all_warned_marked, "Every warned tile receives its matching enemy effect")

    # An old coroutine must not unlock a newly restarted warning.
    game.call("_start_run")
    await create_timer(0.30).timeout
    game.call("_start_run")
    await create_timer(0.73).timeout
    _check(game.get("phase") == "TELL", "Stale tell timer cannot unlock a new run")
    await create_timer(0.38).timeout
    _check(game.get("phase") == "MOVE", "Current tell timer still unlocks MOVE")

    # A lethal strike must end combat before enemy retaliation or a second turn.
    # Put the player beside the fixed pipe only to isolate the terminal ordering.
    var hp_before_kill: int = game.get("hp")
    game.set("player", Vector2i(3, 2))
    game.set("enemy_hp", 1)
    game.call("_hold")
    _check(game.get("phase") == "ATTACK", "Hold spends movement before lethal attack")
    game.call("_try_attack", Vector2i(4, 2))
    _check(game.get("phase") == "REWARD", "Lethal Jab goes directly to reward")
    _check(game.get("hp") == hp_before_kill, "Lethal Jab prevents enemy retaliation")
    _check(game.get("round_turn") == 0, "Lethal Jab does not start another enemy turn")
    _check(game.get("warned").is_empty(), "Terminal clear invalidates the warning")
    _check(game.get("phase") == "REWARD", "Room clear opens modifier selection")
    var choices: Array = game.get("options")
    _check(choices.size() == 3, "Three reward choices are available")
    game.call("_take_modifier", "not-offered")
    _check(game.get("phase") == "REWARD", "Unoffered modifier cannot skip reward phase")
    game.call("_take_modifier", str(choices[0]["id"]))
    _check(game.get("room_index") == 1, "Offered modifier advances one room")
    _check(game.get("phase") == "TELL", "Next room starts with its own tell")

    game.call("_on_death")
    _check(game.get("phase") == "DEAD", "Death locks actions")
    var previous_position: Vector2i = game.get("player")
    game.call("_try_move", previous_position + Vector2i.RIGHT)
    _check(game.get("player") == previous_position, "Direct movement rejected after death")

    _press(game, KEY_R)
    if game.get("phase") == "SETUP":
        _check(true, "Restart opens pre-game menu when available")
        game.call("_begin_from_setup")
    _check(game.get("room_index") == 0, "Keyboard restart resets room index")
    _check(game.get("hp") == 14, "Keyboard restart restores starting HP")
    var owned: Array = game.get("owned")
    _check(owned.is_empty(), "Keyboard restart discards prior modifiers")
    _check(game.get("round_turn") == 0, "Keyboard restart resets turn counter")

    # On UI-enabled branches, opening SETUP must invalidate an in-flight TELL.
    if game.has_method("_open_setup"):
        game.call("_open_setup")
        _check(game.get("phase") == "SETUP", "Setup takes ownership of input immediately")
        var setup_position: Vector2i = game.get("player")
        _press(game, KEY_RIGHT)
        _check(game.get("player") == setup_position, "Setup rejects gameplay shortcuts")
        await create_timer(1.10).timeout
        _check(game.get("phase") == "SETUP", "Old tell timer cannot exit setup")
        game.call("_begin_from_setup")
        _check(game.get("phase") == "TELL", "Leaving setup starts a fresh warning")

    game.queue_free()
    if failures == 0:
        print("PASS: Godot turn-flow regression suite")
    quit(0 if failures == 0 else 1)
