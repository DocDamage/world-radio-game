extends RefCounted
## Additive regional coverage. Imported IDs/streams win; no favorite IDs are rewritten.
const Codec = preload("res://src/core/catalog_codec.gd")
const Geo = preload("res://src/core/geo_math.gd")
const PATH := "res://data/regional_stations.json"

static func rows() -> Array:
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
	var parsed := Codec.parse(data)
	return parsed.get("stations", []) if parsed.get("error", "").is_empty() else []

static func merge(primary: Array, supplement: Array) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	var ids := {}
	var identities := {}
	for row in primary:
		result.append(row.duplicate(true))
		ids[row.id] = true
		var key := identity(row)
		if not key.is_empty(): identities[key] = result.size() - 1
	for row in supplement:
		if ids.has(row.id): continue
		var key := identity(row)
		if not key.is_empty() and identities.has(key):
			var old: Dictionary = result[identities[key]]
			old.search += " " + row.search
			for field in ["homepage", "source_url", "region", "location_precision", "callsign"]:
				if str(old.get(field, "")).is_empty(): old[field] = row.get(field, "")
			continue
		result.append(row.duplicate(true))
		ids[row.id] = true
		if not key.is_empty(): identities[key] = result.size() - 1
	return result

static func identity(row: Dictionary) -> String:
	var call := str(row.get("callsign", "")).strip_edges().to_upper()
	return str(row.get("countryCode", "")) + ":" + call if not call.is_empty() else ""

static func nearby(rows_to_search: Array, lat: float, lon: float, radius_km: float,
		query: String = "", favorites: Variant = null, limit: int = 60, offset: int = 0) -> Dictionary:
	var result: Array[Dictionary] = []
	if not Geo.valid(lat, lon) or not is_finite(radius_km) or radius_km <= 0:
		return {"stations": result, "total": 0}
	var center := Vector2(lat, lon)
	var terms := query.strip_edges().to_lower().split(" ", false)
	for row in rows_to_search:
		if favorites != null and not favorites.has(row.id): continue
		var matches := true
		for term in terms:
			if not term in row.search: matches = false; break
		if not matches: continue
		var distance := Geo.distance_km(center, Vector2(row.geo_lat, row.geo_long))
		if distance > radius_km: continue
		var item: Dictionary = row.duplicate()
		item["distance_km"] = distance
		result.append(item)
	result.sort_custom(func(a, b):
		if a.distance_km != b.distance_km: return a.distance_km < b.distance_km
		return str(a.id) < str(b.id))
	var count := result.size()
	var first := clampi(offset, 0, count)
	return {"stations": result.slice(first, mini(count, first + clampi(limit, 0, 1000))), "total": count}
