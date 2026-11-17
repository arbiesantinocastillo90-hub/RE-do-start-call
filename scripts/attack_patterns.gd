extends RefCounted
## Pure combat geometry; coordinate origin is top-left and tiles are 0..5.
const SIZE := 6

static func inside(cell: Vector2i) -> bool:
    return cell.x >= 0 and cell.x < SIZE and cell.y >= 0 and cell.y < SIZE

static func distance(a: Vector2i, b: Vector2i) -> int:
    return absi(a.x - b.x) + absi(a.y - b.y)

static func cells_for(attack: String, origin: Vector2i, target: Vector2i) -> Array[Vector2i]:
    var out: Array[Vector2i] = []
    if not inside(target) or origin == target:
        return out
    var delta := target - origin
    match attack:
        "Jab":
            if distance(origin, target) == 1:
                out.append(target)
        "Sweep":
            if (delta.x == 0 and delta.y != 0) or (delta.y == 0 and delta.x != 0):
                var step := Vector2i(_sign(delta.x), _sign(delta.y))
                for i in range(1, 4):
                    var cell := origin + step * i
                    if inside(cell):
                        out.append(cell)
        "Burst":
            if distance(origin, target) <= 2:
                for offset in [Vector2i.ZERO, Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
                    var cell := target + offset
                    if inside(cell):
                        out.append(cell)
    return out

static func _sign(n: int) -> int:
    if n < 0:
        return -1
    if n > 0:
        return 1
    return 0

static func line_row(y: int) -> Array[Vector2i]:
    var out: Array[Vector2i] = []
    for x in range(SIZE):
        out.append(Vector2i(x, y))
    return out

static func line_col(x: int) -> Array[Vector2i]:
    var out: Array[Vector2i] = []
    for y in range(SIZE):
        out.append(Vector2i(x, y))
    return out

static func diagonal(sum_axis: bool, value: int) -> Array[Vector2i]:
    var out: Array[Vector2i] = []
    for y in range(SIZE):
        for x in range(SIZE):
            var matched := (x + y == value) if sum_axis else (x - y == value)
            if matched:
                out.append(Vector2i(x, y))
    return out

static func ring(center: Vector2i, radius: int) -> Array[Vector2i]:
    var out: Array[Vector2i] = []
    for y in range(SIZE):
        for x in range(SIZE):
            var p := Vector2i(x, y)
            if distance(p, center) == radius:
                out.append(p)
    return out

static func unique_cells(cells: Array) -> Array[Vector2i]:
    var out: Array[Vector2i] = []
    for cell in cells:
        if inside(cell) and not out.has(cell):
            out.append(cell)
    return out