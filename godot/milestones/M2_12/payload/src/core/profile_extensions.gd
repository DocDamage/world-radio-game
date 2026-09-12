extends RefCounted
## Bounded, optional v1 extensions. Never trust saved or remote shapes implicitly.
const Codec = preload("res://src/core/catalog_codec.gd")

static func streams(value: Variant) -> Dictionary:
	var result := {}
	if not value is Dictionary: return result
	for id in value:
		if result.size() >= 64: break
		if not id is String or not id.begins_with("ct-") or not value[id] is Dictionary: continue
		var row: Dictionary = value[id]
		if not Codec.valid_url(row.get("streamUrl")): continue
		result[id] = {"streamUrl": row.streamUrl, "checked_on": str(row.get("checked_on", "")).left(32),
			"provider": str(row.get("provider", "Radio Browser")).left(128)}
	return result

static func voyages(value: Variant) -> Dictionary:
	var result := {}
	if not value is Dictionary: return result
	for region in value:
		if result.size() >= 16: break
		if not region is String or region.is_empty() or region.length() > 256 or not value[region] is Dictionary: continue
		var row: Dictionary = value[region]
		var visited: Array[String] = []
		if row.get("visited") is Array:
			for id in row.visited:
				if visited.size() >= 128: break
				if id is String and id.length() <= 256 and not visited.has(id): visited.append(id)
		var history: Array[Dictionary] = []
		if row.get("history") is Array:
			for event in row.history.slice(maxi(0, row.history.size() - 128)):
				if not event is Dictionary or not event.get("id") is String: continue
				history.append({"id": event.id.left(256), "label": str(event.get("label", "")).left(256),
					"at": str(event.get("at", "")).left(40)})
		result[region] = {"region_id": region, "target_id": str(row.get("target_id", "")).left(256),
			"visited": visited, "history": history}
	return result
