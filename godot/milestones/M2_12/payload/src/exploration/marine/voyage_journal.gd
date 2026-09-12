extends RefCounted
## Optional profile extension: first-arrival journal, not radio passport stamps.
const Extensions = preload("res://src/core/profile_extensions.gd")

static func record(profile: Dictionary, snapshot: Dictionary, event: Dictionary = {}) -> Dictionary:
	var next: Dictionary = profile.duplicate(true)
	var region := str(snapshot.get("region_id", ""))
	if region.is_empty(): return next
	var voyages: Dictionary = Extensions.voyages(next.get("voyages", {}))
	var existing: Dictionary = voyages.get(region, {"history": []})
	var history: Array = existing.get("history", []).duplicate(true)
	if event.get("first_visit", false):
		var repeated := false
		for entry in history:
			if entry.id == event.id: repeated = true; break
		if not repeated:
			history.append({"id": str(event.id), "label": str(event.label), "at": Time.get_datetime_string_from_system(true) + "Z"})
	var saved := snapshot.duplicate(true)
	saved["history"] = history
	if not voyages.has(region) and voyages.size() >= 16: voyages.erase(voyages.keys()[0])
	voyages[region] = saved
	next["voyages"] = Extensions.voyages(voyages)
	return next

static func history_text(profile: Dictionary, region: String) -> String:
	var row: Dictionary = Extensions.voyages(profile.get("voyages", {})).get(region, {})
	var lines := PackedStringArray()
	for event in row.get("history", []): lines.append("%s  ·  %s" % [event.at, event.label])
	return "No recorded arrivals in this harbor yet. Select a waypoint and approach it." if lines.is_empty() else "\n".join(lines)
