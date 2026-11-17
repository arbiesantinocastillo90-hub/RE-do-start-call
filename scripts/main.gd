extends Control
## RE:(do)(start)(call) — self-contained Godot 4 vertical-slice demo.
## The child does NOT stop time. Each warning flash is a remembered danger pattern.

const Pattern = preload("res://scripts/attack_patterns.gd")
const Encounters = preload("res://scripts/encounter_data.gd")
const Mods = preload("res://scripts/modifiers.gd")
const SIZE := 6
const CELL := Vector2(74, 74)

var rng := RandomNumberGenerator.new()
var room_index := 0
var room: Dictionary = {}
var player := Vector2i(1, 2)
var enemy := Vector2i(4, 2)
var hp := 14
var max_hp := 14
var enemy_hp := 7
var enemy_max_hp := 7
var round_turn := 0
var phase := "TELL"
var attack := "Jab"
var ground: Dictionary = {} # Vector2i -> Array of {kind, source, turns, power}.
var warned: Array[Vector2i] = []
var tell_visible := false
var owned: Array[String] = []
var log_lines: Array[String] = []
var phase_generation := 0
var skip_move := false
var slowed := false
var freeze_armed := false
var freeze_ready := false
var flinch_ready := false
var longer_tells := false
var retain_warnings := false
var tell_duration := 0.0
var aim := Vector2i(-1, -1)

var tiles: Array[Button] = []
var title_label: Label
var subtitle_label: Label
var stats_label: Label
var phase_label: Label
var instructions_label: Label
var log_label: Label
var modifiers_label: Label
var attack_buttons: Dictionary = {}
var hold_button: Button
var heal_button: Button
var freeze_button: Button
var restart_button: Button
var reward_box: VBoxContainer
var overlay_label: Label
var options: Array[Dictionary] = []

func _ready() -> void:
    rng.randomize()
    _build_ui()
    _start_run()

func _start_run() -> void:
    phase_generation += 1
    max_hp = 14
    hp = max_hp
    owned.clear()
    log_lines.clear()
    attack = "Jab"
    _log("You open your eyes. A house made of remembered rooms waits ahead.")
    _start_room(0)

func _start_room(index: int) -> void:
    phase_generation += 1
    room_index = index
    room = Encounters.room(index)
    player = room["start"]
    enemy = room["pos"]
    enemy_max_hp = int(room["hp"])
    enemy_hp = enemy_max_hp
    round_turn = 0
    ground.clear()
    warned.clear()
    freeze_ready = owned.has("freeze")
    flinch_ready = owned.has("flinch")
    freeze_armed = false
    skip_move = false
    slowed = false
    aim = player
    reward_box.visible = false
    overlay_label.visible = false
    _log("ROOM %d · %s" % [index + 1, room["name"]])
    _log(str(room["intro"]))
    _announce_tell()

func _announce_tell() -> void:
    if hp <= 0:
        _on_death()
        return
    phase = "TELL"
    var attack_info = Encounters.pattern(room_index, round_turn)
    warned = attack_info["cells"]
    tell_visible = true
    phase_generation += 1
    var ticket := phase_generation
    var duration := float(room["tell"])
    if owned.has("hyper"):
        duration += 0.45
    if owned.has("tunnel"):
        duration -= 0.18
    duration = maxf(duration, 0.30)
    if longer_tells:
        # A 3-second baseline preserves both +/- time modifiers and remains readable.
        duration = maxf(2.5, 3.0 + (0.45 if owned.has("hyper") else 0.0) - (0.18 if owned.has("tunnel") else 0.0))
    tell_duration = duration
    _log("STATIC: %s. Watch the threatened squares." % str(attack_info["name"]))
    _refresh()
    await get_tree().create_timer(duration).timeout
    if ticket != phase_generation or phase != "TELL":
        return
    tell_visible = false
    phase = "MOVE"
    _log("The warning remains outlined." if retain_warnings else "The warning disappears. Remember the squares before you step.")
    _refresh()

func _tile_pressed(cell: Vector2i) -> void:
    if phase == "MOVE":
        _try_move(cell)
    elif phase == "ATTACK":
        _try_attack(cell)

func _try_move(cell: Vector2i) -> void:
    # Enforce the turn lock at the mutation boundary, not only in input handlers.
    if phase != "MOVE":
        return
    if not Pattern.inside(cell):
        return
    if skip_move or slowed:
        _log("Your feet won't move this turn. Use HOLD to continue.")
        _refresh()
        return
    if cell == enemy:
        _log("That square is occupied. Choose a free adjacent square.")
        _refresh()
        return
    if Pattern.distance(player, cell) != 1:
        _log("Move one orthogonal square. Diagonals aren't legal moves.")
        _refresh()
        return
    player = cell
    phase = "ATTACK"
    aim = player
    _log("You steady yourself. Choose an attack and its target.")
    _refresh()

func _hold() -> void:
    if phase != "MOVE":
        return
    skip_move = false
    slowed = false
    phase = "ATTACK"
    aim = player
    _log("You keep your footing.")
    _refresh()

func _select_attack(name: String) -> void:
    if phase != "ATTACK" and phase != "MOVE":
        return
    if not ["Jab", "Sweep", "Burst"].has(name):
        return
    attack = name
    _refresh()

func _try_attack(target: Vector2i) -> void:
    if phase != "ATTACK":
        return
    var cells: Array[Vector2i] = Pattern.cells_for(attack, player, target)
    if cells.is_empty():
        _log("Out of range. JAB: adjacent · SWEEP: cardinal ray · BURST: near cross.")
        _refresh()
        return
    var amount := 3 if attack == "Jab" else 2
    if owned.has("fight"):
        amount += 1
    if owned.has("tunnel") and attack == "Sweep":
        amount += 2
    if owned.has("flinch"):
        amount = maxi(1, amount - 1)
    if cells.has(enemy):
        enemy_hp -= amount
        _log("%s lands for %d damage." % [attack.to_upper(), amount])
    else:
        _log("%s touches empty space. The floor remembers it anyway." % attack.to_upper())
    var kind := "splinter" if attack == "Jab" else ("spark" if attack == "Sweep" else "burn")
    for c in cells:
        _add_ground(c, kind, "player", 2, 1)
    _finish_player_action()

func _comfort_heal() -> void:
    if not owned.has("comfort") or phase != "ATTACK":
        return
    if owned.has("numb"):
        _log("Numbness makes it impossible to receive comfort.")
        _refresh()
        return
    if warned.has(player) or _is_harmful_tile(player):
        _log("This is not a safe tile. You cannot use Comfort here.")
        _refresh()
        return
    var old := hp
    hp = mini(max_hp, hp + 2)
    _log("You hold something familiar. +%d HP; your attack is spent." % (hp - old))
    _finish_player_action()

func _use_freeze() -> void:
    if phase != "MOVE" and phase != "ATTACK":
        return
    if not owned.has("freeze") or not freeze_ready:
        return
    freeze_armed = true
    freeze_ready = false
    _log("FREEZE armed: the next strike is blocked; no movement next turn.")
    _refresh()

func _finish_player_action() -> void:
    phase = "RESOLVE"
    _refresh()
    if enemy_hp > 0:
        _enemy_resolution()
    else:
        _room_cleared()

func _enemy_resolution() -> void:
    # Ground from previous turns ticks BEFORE today's new enemy marks are added.
    _tick_ground()
    if hp <= 0:
        _on_death()
        return
    if enemy_hp <= 0:
        _room_cleared()
        return
    var vulnerable := warned.has(player)
    if vulnerable and flinch_ready:
        var escape := _find_flinch_tile()
        if escape != Vector2i(-1,-1):
            player = escape
            vulnerable = false
            flinch_ready = false
            _log("FLINCH: you stumble onto a safer square.")
    if vulnerable:
        if freeze_armed:
            _log("FREEZE: the moment passes without hitting you.")
        else:
            var damage := int(room["damage"])
            if owned.has("hyper"):
                damage += 1
            if owned.has("bracing"):
                damage = maxi(0, damage - 1)
            hp -= damage
            _log("The memory strikes. -%d HP." % damage)
    else:
        _log("You remembered correctly. The attack missed.")
    if freeze_armed:
        skip_move = true
        freeze_armed = false
    for c in warned:
        _add_ground(c, str(room["effect"]), "enemy", 2, int(room["effect_damage"]))
    if hp <= 0:
        _on_death()
        return
    round_turn += 1
    _announce_tell()

func _find_flinch_tile() -> Vector2i:
    for delta in [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]:
        var candidate: Vector2i = player + delta
        if Pattern.inside(candidate) and candidate != enemy and not warned.has(candidate) and not _is_harmful_tile(candidate):
            return candidate
    return Vector2i(-1, -1)

func _add_ground(cell: Vector2i, kind: String, source: String, turns: int, power: int) -> void:
    if not ground.has(cell):
        ground[cell] = []
    var entries: Array = ground[cell]
    # Reapplication by the same source and kind refreshes instead of multiplying.
    for e in entries:
        if e["kind"] == kind and e["source"] == source:
            e["turns"] = maxi(int(e["turns"]), turns)
            e["power"] = maxi(int(e["power"]), power)
            return
    entries.append({"kind":kind, "source":source, "turns":turns, "power":power})

func _is_harmful_tile(cell: Vector2i) -> bool:
    if not ground.has(cell):
        return false
    for e in ground[cell]:
        if e["source"] == "enemy" or (e["source"] == "player" and owned.has("fight")):
            return true
    return false

func _tick_ground() -> void:
    var expired: Array = []
    for cell in ground.keys():
        var entries: Array = ground[cell]
        var remaining: Array = []
        for e in entries:
            var source: String = e["source"]
            if cell == player and (source == "enemy" or owned.has("fight")):
                if str(e["kind"]) == "drip":
                    slowed = true
                    _log("The melted drips slow your next step.")
                elif not owned.has("numb"):
                    hp -= int(e["power"])
                    _log("The marked tile stings. -%d HP." % int(e["power"]))
            if cell == enemy and source == "player":
                enemy_hp -= int(e["power"])
                _log("The enemy remains on your damaged tile. -%d HP." % int(e["power"]))
            e["turns"] = int(e["turns"]) - 1
            if e["turns"] > 0:
                remaining.append(e)
        if remaining.is_empty():
            expired.append(cell)
        else:
            ground[cell] = remaining
    for cell in expired:
        ground.erase(cell)

func _room_cleared() -> void:
    phase_generation += 1
    enemy_hp = 0
    warned.clear()
    tell_visible = false
    _log("Silence. The room is yours to leave.")
    if room_index >= 2:
        phase = "WIN"
        overlay_label.visible = true
        overlay_label.text = "DEMO COMPLETE\n\nThe phone falls silent.\nReaching out is not the same as giving in.\n\nYou survived the house.\nPress RESTART to play again."
        reward_box.visible = false
        _refresh()
        return
    phase = "REWARD"
    reward_box.visible = true
    options = Mods.choices(owned, rng)
    for child in reward_box.get_children():
        child.queue_free()
    var header := Label.new()
    header.text = "A COPING MECHANISM\nChoose one. Every survival habit has a cost."
    header.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    reward_box.add_child(header)
    var first_choice: Button = null
    for entry in options:
        var b := Button.new()
        if first_choice == null:
            first_choice = b
        b.custom_minimum_size.y = 88
        b.text = "%s\nBENEFIT: %s\nCOST: %s" % [entry["name"], entry["boon"], entry["cost"]]
        b.add_theme_font_size_override("font_size", 14)
        b.pressed.connect(_take_modifier.bind(str(entry["id"])))
        reward_box.add_child(b)
    _refresh()
    if first_choice != null:
        first_choice.call_deferred("grab_focus")

func _take_modifier(id: String) -> void:
    if phase != "REWARD" or owned.has(id):
        return
    var offered := false
    for entry in options:
        if str(entry["id"]) == id:
            offered = true
            break
    if not offered:
        return
    owned.append(id)
    if id == "bracing":
        max_hp = maxi(4, max_hp - 2)
        hp = mini(hp, max_hp)
    _log("You accept %s. It helps, but it changes you." % str(Mods.find(id).get("name", id)))
    _start_room(room_index + 1)

func _on_death() -> void:
    phase_generation += 1
    hp = 0
    phase = "DEAD"
    tell_visible = false
    reward_box.visible = false
    overlay_label.visible = true
    overlay_label.text = "THE LOOP RESTARTS\n\nA room goes quiet. You wake in the hallway.\nThere is still another attempt.\n\nPress RESTART."
    _refresh()

func _log(message: String) -> void:
    log_lines.append(message)
    if log_lines.size() > 6:
        log_lines.pop_front()

func _build_ui() -> void:
    var bg := ColorRect.new()
    bg.color = Color("#0b101b")
    bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(bg)

    var margin := MarginContainer.new()
    margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    for edge in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
        margin.add_theme_constant_override(edge, 26)
    add_child(margin)

    var columns := HBoxContainer.new()
    columns.add_theme_constant_override("separation", 24)
    margin.add_child(columns)

    var left := VBoxContainer.new()
    left.custom_minimum_size.x = 500
    left.add_theme_constant_override("separation", 14)
    columns.add_child(left)

    title_label = Label.new()
    title_label.text = "RE:(do)(start)(call)"
    title_label.add_theme_font_size_override("font_size", 31)
    title_label.add_theme_color_override("font_color", Color("#e7eafa"))
    left.add_child(title_label)

    subtitle_label = Label.new()
    subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    subtitle_label.custom_minimum_size = Vector2(0, 72)
    subtitle_label.add_theme_font_size_override("font_size", 16)
    subtitle_label.add_theme_color_override("font_color", Color("#b4b9cb"))
    left.add_child(subtitle_label)

    var board := GridContainer.new()
    board.columns = SIZE
    board.add_theme_constant_override("h_separation", 7)
    board.add_theme_constant_override("v_separation", 7)
    left.add_child(board)
    for y in range(SIZE):
        for x in range(SIZE):
            var button := Button.new()
            button.custom_minimum_size = CELL
            button.add_theme_font_size_override("font_size", 15)
            var cell := Vector2i(x, y)
            button.pressed.connect(_tile_pressed.bind(cell))
            board.add_child(button)
            tiles.append(button)

    instructions_label = Label.new()
    instructions_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    instructions_label.custom_minimum_size = Vector2(0, 90)
    instructions_label.add_theme_font_size_override("font_size", 16)
    instructions_label.add_theme_color_override("font_color", Color("#e6d9b0"))
    left.add_child(instructions_label)

    var right_scroll := ScrollContainer.new()
    right_scroll.custom_minimum_size.x = 430
    right_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    right_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
    right_scroll.follow_focus = true
    columns.add_child(right_scroll)
    var right := VBoxContainer.new()
    right.custom_minimum_size.x = 416
    right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    right.add_theme_constant_override("separation", 13)
    right_scroll.add_child(right)

    stats_label = Label.new()
    stats_label.add_theme_font_size_override("font_size", 20)
    stats_label.add_theme_color_override("font_color", Color("#c7e5e1"))
    right.add_child(stats_label)

    phase_label = Label.new()
    phase_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    phase_label.custom_minimum_size = Vector2(0, 50)
    phase_label.add_theme_font_size_override("font_size", 19)
    phase_label.add_theme_color_override("font_color", Color("#fbbe88"))
    right.add_child(phase_label)

    var accessibility_row := VBoxContainer.new()
    right.add_child(accessibility_row)
    var longer_toggle := CheckBox.new()
    longer_toggle.text = "LONGER WARNINGS (AT LEAST 2.5 S)"
    longer_toggle.tooltip_text = "Applies from the next warning phase."
    longer_toggle.button_pressed = longer_tells
    longer_toggle.toggled.connect(_set_longer_tells)
    accessibility_row.add_child(longer_toggle)
    var retain_toggle := CheckBox.new()
    retain_toggle.text = "KEEP THREAT OUTLINES"
    retain_toggle.tooltip_text = "Retain the exact threatened tiles during movement and attack."
    retain_toggle.button_pressed = retain_warnings
    retain_toggle.toggled.connect(_set_retain_warnings)
    accessibility_row.add_child(retain_toggle)

    var attacks := HBoxContainer.new()
    attacks.add_theme_constant_override("separation", 8)
    right.add_child(attacks)
    for name in ["Jab", "Sweep", "Burst"]:
        var button := Button.new()
        button.text = name.to_upper()
        button.custom_minimum_size = Vector2(124, 45)
        button.pressed.connect(_select_attack.bind(name))
        attacks.add_child(button)
        attack_buttons[name] = button

    hold_button = Button.new()
    hold_button.text = "HOLD / SKIP MOVEMENT  [SPACE]"
    hold_button.pressed.connect(_hold)
    right.add_child(hold_button)

    heal_button = Button.new()
    heal_button.text = "COMFORT / HEAL  [E]"
    heal_button.pressed.connect(_comfort_heal)
    right.add_child(heal_button)

    freeze_button = Button.new()
    freeze_button.text = "FREEZE / BLOCK ONCE  [F]"
    freeze_button.pressed.connect(_use_freeze)
    right.add_child(freeze_button)

    modifiers_label = Label.new()
    modifiers_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    modifiers_label.add_theme_font_size_override("font_size", 15)
    modifiers_label.add_theme_color_override("font_color", Color("#a5d5cf"))
    right.add_child(modifiers_label)

    log_label = Label.new()
    log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    log_label.custom_minimum_size = Vector2(0, 165)
    log_label.add_theme_font_size_override("font_size", 14)
    log_label.add_theme_color_override("font_color", Color("#b9bcd0"))
    right.add_child(log_label)

    reward_box = VBoxContainer.new()
    reward_box.add_theme_constant_override("separation", 7)
    reward_box.visible = false
    right.add_child(reward_box)

    overlay_label = Label.new()
    overlay_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    overlay_label.add_theme_font_size_override("font_size", 20)
    overlay_label.add_theme_color_override("font_color", Color("#b3eece"))
    overlay_label.visible = false
    right.add_child(overlay_label)

    restart_button = Button.new()
    restart_button.text = "RESTART THE LOOP  [R]"
    restart_button.pressed.connect(_start_run)
    right.add_child(restart_button)

    var footer := Label.new()
    footer.text = "Arrows move / aim · Enter or click target · 1/2/3 attack"
    footer.add_theme_font_size_override("font_size", 12)
    footer.add_theme_color_override("font_color", Color("#67728a"))
    right.add_child(footer)

func _set_longer_tells(value: bool) -> void:
    longer_tells = value
    _refresh()

func _set_retain_warnings(value: bool) -> void:
    retain_warnings = value
    _refresh()

func _aim(delta: Vector2i) -> void:
    var next := aim + delta
    if Pattern.inside(next):
        aim = next
        _refresh()

func _refresh() -> void:
    if tiles.is_empty():
        return
    subtitle_label.text = "HOUSE  /  %d OF 3  —  %s\n%s" % [room_index + 1, room["name"], room["subtitle"]]
    stats_label.text = "YOU  %d/%d HP     %s  %d/%d HP\nROUND %d" % [hp, max_hp, room["enemy"], maxi(0, enemy_hp), enemy_max_hp, round_turn + 1]
    match phase:
        "TELL":
            phase_label.text = "[ STATIC / WARNING ]"
            instructions_label.text = "Watch the amber danger tiles for %.2f seconds. %s" % [tell_duration, "Outlines will remain." if retain_warnings else "The flash disappears before movement."]
        "MOVE":
            phase_label.text = "[ HYPERVIGILANCE / MOVE ]"
            instructions_label.text = "Step one cardinal tile, or hold with SPACE. " + ("Amber outlines show the next strike." if retain_warnings else "Remember the danger flash.")
        "ATTACK":
            phase_label.text = "[ FIGHT / ATTACK ]"
            instructions_label.text = "Choose JAB, SWEEP or BURST. Arrows aim; Enter or click attacks. White outlines preview your attack shape."
        "RESOLVE":
            phase_label.text = "[ THE MEMORY STRIKES ]"
            instructions_label.text = "Your action resolves. Danger tiles are the ones you saw during the flash."
        "REWARD":
            phase_label.text = "[ A CHOICE / A COST ]"
            instructions_label.text = "Pick a coping mechanism to carry into the next room."
        "WIN":
            phase_label.text = "[ THE SOUND STOPS ]"
            instructions_label.text = "This completes the house demo. The full story continues elsewhere."
        _:
            phase_label.text = "[ LOOP INTERRUPTED ]"
            instructions_label.text = "You can try again. Press R or RESTART THE LOOP."
    var preview: Array[Vector2i] = []
    if phase == "ATTACK" and Pattern.inside(aim):
        preview = Pattern.cells_for(attack, player, aim)
    for y in range(SIZE):
        for x in range(SIZE):
            var cell := Vector2i(x,y)
            var button: Button = tiles[y * SIZE + x]
            var paint := Color("#253248") if (x+y)%2==0 else Color("#303d54")
            var text := ""
            if ground.has(cell):
                var last: Dictionary = ground[cell][ground[cell].size() - 1]
                paint = Color("#704745") if last["source"] == "enemy" else Color("#405e65")
                text = "."
            if phase == "TELL" and tell_visible and warned.has(cell):
                paint = Color("#e8a45d")
                text = "!"
            if cell == enemy and enemy_hp > 0:
                paint = Color("#7d587a")
                text = str(room["glyph"])
                if phase == "TELL" and tell_visible and warned.has(cell):
                    paint = Color("#e8a45d")
                    text += "\n!"
            if cell == player:
                paint = Color("#81c6b3")
                text = "YOU"
                if phase == "TELL" and tell_visible and warned.has(cell):
                    paint = Color("#e8a45d")
                    text = "YOU\n!"
            if retain_warnings and (phase == "MOVE" or phase == "ATTACK") and warned.has(cell):
                text += (" !" if text != "" else "!")
            button.text = text
            button.disabled = phase != "MOVE" and phase != "ATTACK"
            var tile_description := "Tile %s%d" % ["ABCDEF".substr(x, 1), y + 1]
            if cell == player:
                tile_description += ": you"
            elif cell == enemy and enemy_hp > 0:
                tile_description += ": " + str(room["enemy"])
            else:
                tile_description += ": empty"
            if warned.has(cell) and (phase == "TELL" or retain_warnings):
                tile_description += "; next strike warning"
            if ground.has(cell):
                for effect in ground[cell]:
                    tile_description += "; %s %s lingering effect" % [str(effect["source"]), str(effect["kind"])]
            if phase == "MOVE" and Pattern.distance(player, cell) == 1 and cell != enemy:
                tile_description += "; legal move, not necessarily safe"
            button.tooltip_text = tile_description
            var ink := Color("#101827") if cell == player or paint == Color("#e8a45d") else Color("#f8f8ff")
            button.add_theme_color_override("font_color", ink)
            button.add_theme_color_override("font_disabled_color", ink)
            var normal := StyleBoxFlat.new()
            normal.bg_color = paint
            normal.set_corner_radius_all(5)
            normal.border_width_bottom = 2
            normal.border_color = paint.lightened(0.18)
            if phase == "MOVE" and Pattern.distance(player, cell) == 1 and cell != enemy:
                normal.set_border_width_all(2)
                normal.border_color = Color("#8cbecd")
            if phase == "ATTACK" and preview.has(cell):
                normal.set_border_width_all(3)
                normal.border_color = Color("#d7f1f2")
            if retain_warnings and (phase == "MOVE" or phase == "ATTACK") and warned.has(cell):
                normal.set_border_width_all(4)
                normal.border_color = Color("#ffd09a")
            button.add_theme_stylebox_override("normal", normal)
            button.add_theme_stylebox_override("hover", normal)
            button.add_theme_stylebox_override("pressed", normal)
            button.add_theme_stylebox_override("disabled", normal)
    for name in attack_buttons.keys():
        var b: Button = attack_buttons[name]
        b.disabled = phase != "MOVE" and phase != "ATTACK"
        b.text = ("● " if name == attack else "") + str(name).to_upper()
    hold_button.disabled = phase != "MOVE"
    heal_button.visible = owned.has("comfort")
    heal_button.disabled = phase != "ATTACK" or owned.has("numb")
    freeze_button.visible = owned.has("freeze")
    freeze_button.disabled = (phase != "MOVE" and phase != "ATTACK") or not freeze_ready
    var names: Array[String] = []
    for id in owned:
        names.append(str(Mods.find(id).get("name", id)))
    var mod_text := "none yet"
    if not names.is_empty():
        mod_text = ""
        for i in range(names.size()):
            mod_text += (", " if i > 0 else "") + names[i]
    modifiers_label.text = "COPING: " + mod_text
    var history_text := ""
    for line in log_lines:
        history_text += str(line) + "\n"
    log_label.text = "MEMORY LOG\n" + history_text

func _input(event: InputEvent) -> void:
    # Focused GUI Buttons can consume keys before _unhandled_key_input.
    # Capture gameplay keys first; leave other keys to normal GUI navigation.
    var key := event as InputEventKey
    if key == null or not key.pressed or key.echo:
        return
    if key.ctrl_pressed or key.alt_pressed or key.meta_pressed:
        return
    # A future/native pre-game setup owns all keys until PLAY is chosen.
    if phase == "SETUP":
        return
    # Preserve Space activation for focused HUD controls (including settings).
    # Enter remains the explicit attack-aim key during ATTACK.
    var focused := get_viewport().gui_get_focus_owner()
    if focused is LineEdit or focused is TextEdit:
        return
    if key.keycode == KEY_SPACE and focused is BaseButton and not tiles.has(focused):
        return

    var handled := true
    match key.keycode:
        KEY_R:
            # C's native setup flow opens the menu; old builds restart directly.
            if has_method("_open_setup"):
                call("_open_setup")
            else:
                _start_run()
        KEY_SPACE:
            if phase == "MOVE":
                _hold()
            else:
                handled = false
        KEY_1:
            if phase == "MOVE" or phase == "ATTACK":
                _select_attack("Jab")
            else:
                handled = false
        KEY_2:
            if phase == "MOVE" or phase == "ATTACK":
                _select_attack("Sweep")
            else:
                handled = false
        KEY_3:
            if phase == "MOVE" or phase == "ATTACK":
                _select_attack("Burst")
            else:
                handled = false
        KEY_E:
            if phase == "ATTACK":
                _comfort_heal()
            else:
                handled = false
        KEY_F:
            if phase == "MOVE" or phase == "ATTACK":
                _use_freeze()
            else:
                handled = false
        KEY_UP:
            if phase == "MOVE":
                _try_move(player + Vector2i.UP)
            elif phase == "ATTACK":
                _aim(Vector2i.UP)
            else:
                handled = false
        KEY_DOWN:
            if phase == "MOVE":
                _try_move(player + Vector2i.DOWN)
            elif phase == "ATTACK":
                _aim(Vector2i.DOWN)
            else:
                handled = false
        KEY_LEFT:
            if phase == "MOVE":
                _try_move(player + Vector2i.LEFT)
            elif phase == "ATTACK":
                _aim(Vector2i.LEFT)
            else:
                handled = false
        KEY_RIGHT:
            if phase == "MOVE":
                _try_move(player + Vector2i.RIGHT)
            elif phase == "ATTACK":
                _aim(Vector2i.RIGHT)
            else:
                handled = false
        KEY_ENTER, KEY_KP_ENTER:
            if phase == "ATTACK":
                _try_attack(aim)
            else:
                handled = false
        _:
            handled = false

    if handled:
        get_viewport().set_input_as_handled()
