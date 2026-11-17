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
    # Active-run reset is a confirm/cancel transaction, not a destructive R.
    var hp_before_attack_reset: int = game.get("hp")
    var enemy_before_attack_reset: int = game.get("enemy_hp")
    _press(game, KEY_R)
    _check(game.get("phase") == "RESET_CONFIRM", "R prompts instead of resetting during ATTACK")
    game.call("_try_attack", Vector2i(4, 2))
    _check(game.get("enemy_hp") == enemy_before_attack_reset, "Reset dialog blocks a direct attack")
    game.call("_cancel_reset")
    _check(game.get("phase") == "ATTACK", "Cancel resumes pending attack")
    _check(game.get("hp") == hp_before_attack_reset, "Cancel preserves HP during attack")
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

    var pending_position: Vector2i = game.get("player")
    var pending_hp: int = game.get("hp")
    var pending_warned: Array = game.get("warned").duplicate()
    _press(game, KEY_R)
    _check(game.get("phase") == "RESET_CONFIRM", "R prompts instead of discarding MOVE state")
    var reset_dialog: ConfirmationDialog = game.get("reset_confirmation")
    _check(reset_dialog.visible, "Native reset offers a confirmation dialog")
    game.call("_try_move", Vector2i(2, 2))
    game.call("_hold")
    _press(game, KEY_RIGHT)
    _check(game.get("phase") == "RESET_CONFIRM", "Confirmation phase locks move, hold and keys")
    _check(game.get("player") == pending_position, "Reset dialog cannot move player")
    game.call("_cancel_reset")
    _check(game.get("phase") == "MOVE", "Cancel returns to MOVE without spending turn")
    _check(game.get("hp") == pending_hp, "Cancel preserves current HP")
    _check(game.get("warned") == pending_warned, "Cancel preserves exact warned cells")

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
    var original_offers: Array = choices.duplicate(true)
    _press(game, KEY_R)
    _check(game.get("phase") == "RESET_CONFIRM", "R prompts before discarding offered reward")
    game.call("_take_modifier", str(choices[0]["id"]))
    _check(game.get("phase") == "RESET_CONFIRM", "Reset confirmation blocks a reward choice")
    game.call("_cancel_reset")
    _check(game.get("phase") == "REWARD", "Cancel resumes same reward screen")
    _check(game.get("options") == original_offers, "Cancel never rerolls offered modifiers")
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

    # An R prompt during TELL invalidates the old timer and MUST replay
    # the same warning in full after cancel, without moving the clock forward.
    var warning_on_reset: Array = game.get("warned").duplicate()
    _press(game, KEY_R)
    _check(game.get("phase") == "RESET_CONFIRM", "R prompts during visible TELL")
    await create_timer(1.07).timeout
    _check(game.get("phase") == "RESET_CONFIRM", "Covered tell expiry cannot advance gameplay")
    game.call("_cancel_reset")
    _check(game.get("phase") == "TELL", "Cancel replays full warning before MOVE")
    _check(game.get("tell_visible"), "Canceled reset restores visible threat flash")
    _check(game.get("warned") == warning_on_reset, "Replay uses identical threat coordinates")
    await create_timer(0.35).timeout
    _check(game.get("phase") == "TELL", "Old timer cannot shorten resumed warning")
    await create_timer(0.72).timeout
    _check(game.get("phase") == "MOVE", "Resumed tell eventually unlocks movement")
    _press(game, KEY_R)
    _check(game.get("phase") == "RESET_CONFIRM", "Confirm requires explicit acceptance")
    game.call("_confirm_reset")
    _check(game.get("phase") == "SETUP", "Only DISCARD RUN returns active game to setup")
    game.call("_begin_from_setup")
    _check(game.get("room_index") == 0, "Confirmed reset returns to Hallway")
    _check(game.get("hp") == 14, "Confirmed reset restores starting health")


    # Numb must not make a harmless rust/echo floor block a Flinch escape.
    game.call("_start_run")
    game.set("player", Vector2i(2, 2))
    game.set("enemy", Vector2i(4, 2))
    var flinch_warning: Array[Vector2i] = game.get("warned")
    flinch_warning.clear()
    flinch_warning.append_array([Vector2i(2, 2), Vector2i(3, 2), Vector2i(2, 3), Vector2i(1, 2)])
    game.call("_add_ground", Vector2i(2, 1), "echo", "enemy", 2, 1)
    var flinch_owned: Array[String] = game.get("owned")
    flinch_owned.clear()
    flinch_owned.append("flinch")
    _check(game.call("_find_flinch_tile") == Vector2i(-1, -1), "Flinch refuses damaging echo floor without Numb")
    flinch_owned.append("numb")
    _check(game.call("_find_flinch_tile") == Vector2i(2, 1), "Numb makes echo-marked escape safe for Flinch")
    game.call("_add_ground", Vector2i(2, 1), "drip", "enemy", 2, 1)
    _check(game.call("_find_flinch_tile") == Vector2i(-1, -1), "Drip slow remains dangerous even with Numb")

    game.queue_free()
    if failures == 0:
        print("PASS: Godot turn-flow regression suite")
    quit(0 if failures == 0 else 1)
