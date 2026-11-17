extends RefCounted
## Symbolic encounter data — no literal depictions of real-world harm.
const Pattern = preload("res://scripts/attack_patterns.gd")

static func room(index: int) -> Dictionary:
    match index:
        0:
            return {"name":"THE HALLWAY", "enemy":"RUSTED PIPE", "glyph":"PIPE", "hp":7, "pos":Vector2i(4,2), "start":Vector2i(1,2), "tell":0.95, "damage":2, "effect":"rust", "effect_damage":1, "intro":"The corridor remembers the sound of something dragged across the floor.", "subtitle":"A straight line is a warning. Look. Remember. Step aside."}
        1:
            return {"name":"THE WINDOW ROOM", "enemy":"MELTED HANGER", "glyph":"HANGER", "hp":10, "pos":Vector2i(4,1), "start":Vector2i(1,4), "tell":0.70, "damage":2, "effect":"drip", "effect_damage":0, "intro":"Sunlight leaves a crooked shadow where a coat should be.", "subtitle":"The drips slow your steps. Diagonals can cross without touching."}
        _:
            return {"name":"THE ROOM THAT RINGS", "enemy":"THE UNANSWERED CALL", "glyph":"RING", "hp":15, "pos":Vector2i(4,2), "start":Vector2i(1,4), "tell":0.60, "damage":3, "effect":"echo", "effect_damage":1, "intro":"A phone rings in a room where no one speaks.", "subtitle":"The pattern keeps repeating. There may be another way to answer."}

static func pattern(room_index: int, turn: int) -> Dictionary:
    ## Repeatable sets — the flash and the actual strike use this SAME cell list.
    var i := turn % 4
    var cells: Array[Vector2i] = []
    var name := ""
    match room_index:
        0:
            match i:
                0:
                    name = "PIPE / HORIZONTAL"
                    cells = Pattern.line_row(2)
                1:
                    name = "PIPE / VERTICAL"
                    cells = Pattern.line_col(1)
                2:
                    name = "PIPE / HORIZONTAL"
                    cells = Pattern.line_row(4)
                _:
                    name = "PIPE / VERTICAL"
                    cells = Pattern.line_col(4)
        1:
            match i:
                0:
                    name = "HANGER / DIAGONAL"
                    cells = Pattern.diagonal(true, 5)
                1:
                    name = "HANGER / DIAGONAL"
                    cells = Pattern.diagonal(false, 0)
                2:
                    name = "HANGER / DIAGONAL"
                    cells = Pattern.diagonal(true, 3)
                _:
                    name = "HANGER / DIAGONAL"
                    cells = Pattern.diagonal(false, 2)
        _:
            match i:
                0:
                    name = "CALL / CROSS"
                    cells = Pattern.unique_cells(Pattern.line_row(2) + Pattern.line_col(2))
                    cells.erase(Vector2i(2, 2))
                1:
                    name = "CALL / DIAGONAL"
                    cells = Pattern.unique_cells(Pattern.diagonal(true, 5) + Pattern.diagonal(false, 0))
                2:
                    name = "CALL / NEAR RING"
                    cells = Pattern.ring(Vector2i(3, 2), 2)
                _:
                    name = "CALL / FAR RING"
                    cells = Pattern.ring(Vector2i(3, 2), 3)
    return {"name": name, "cells": cells}