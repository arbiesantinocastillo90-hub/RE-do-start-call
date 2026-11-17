extends RefCounted
## Eight coping mechanisms. Every boon has a drawback; effects stack only once.
const DEFINITIONS := [
    {"id":"hyper", "name":"Hypervigilance", "boon":"+0.45 s to each warning flash", "cost":"+1 incoming strike damage"},
    {"id":"numb", "name":"Numb", "boon":"Ignore harmful floor effects", "cost":"Cannot heal during this run"},
    {"id":"comfort", "name":"Comfort Object", "boon":"Spend your attack to heal 2 HP while safe", "cost":"You cannot attack when you choose to heal"},
    {"id":"fight", "name":"Fight Response", "boon":"+1 damage on every attack", "cost":"Your attack traces can also hurt you"},
    {"id":"freeze", "name":"Freeze", "boon":"Block one strike each room with Freeze", "cost":"Lose movement next turn when used"},
    {"id":"bracing", "name":"Bracing", "boon":"-1 damage from strikes", "cost":"-2 maximum HP"},
    {"id":"tunnel", "name":"Tunnel Vision", "boon":"+2 damage when using Sweep", "cost":"-0.18 s from warning flashes"},
    {"id":"flinch", "name":"Flinch", "boon":"Auto-evade one incoming hit per room", "cost":"-1 base attack damage"}
]

static func find(id: String) -> Dictionary:
    for item in DEFINITIONS:
        if item["id"] == id:
            return item
    return {}

static func choices(owned: Array[String], randomizer: RandomNumberGenerator) -> Array[Dictionary]:
    var pool: Array[Dictionary] = []
    for item in DEFINITIONS:
        if owned.has(item["id"]):
            continue
        # A healing-only boon cannot function with Numb; never offer that inert pairing.
        if (owned.has("numb") and item["id"] == "comfort") or (owned.has("comfort") and item["id"] == "numb"):
            continue
        pool.append(item)
    var result: Array[Dictionary] = []
    while result.size() < 3 and not pool.is_empty():
        var i := randomizer.randi_range(0, pool.size() - 1)
        result.append(pool.pop_at(i))
    return result