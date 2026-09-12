extends RefCounted
## Geographic, straight-line gameplay guidance; not a route planner or navigation chart.
const DEFAULT_ARRIVAL_M := 22.0
var region_id := ""
var points: Array[Dictionary] = []
var target_index := 0
var visited: Dictionary = {}
var arrival_radius_m := DEFAULT_ARRIVAL_M
var _last_inside := false

func configure(layout: Dictionary) -> bool:
	points.clear()
	visited.clear()
	target_index = 0
	_last_inside = false
	region_id = str(layout.get("region_id", ""))
	if region_id.is_empty() or region_id.length() > 256: return false
	var dock: Variant = layout.get("dock", {})
	if dock is Dictionary: _append("visitor-dock", "Visitor Dock", dock.get("land_xz", []), "berth")
	var items: Variant = layout.get("items", [])
	if not items is Array or items.size() > 128: return false
	for item in items:
		if not item is Dictionary: continue
		var mode := str(item.get("mode", ""))
		if mode not in ["floating", "seabed"]: continue
		_append(str(item.get("id", "")), str(item.get("label", item.get("asset", "Harbor point"))), item.get("xz", []), mode)
	return not points.is_empty()

func _append(id: String, label: String, xz: Variant, kind: String) -> void:
	if id.is_empty() or id.length() > 256 or not xz is Array or xz.size() != 2: return
	for v in xz:
		if not (v is float or v is int) or not is_finite(float(v)): return
	for p in points:
		if p.id == id: return
	points.append({"id": id, "label": label.left(256), "position": Vector3(float(xz[0]), 0, float(xz[1])), "kind": kind})

func select(index: int) -> bool:
	if index < 0 or index >= points.size(): return false
	if target_index != index: _last_inside = false
	target_index = index
	return true

func next_target() -> void:
	if not points.is_empty(): select((target_index + 1) % points.size())

func target() -> Dictionary:
	return points[target_index] if not points.is_empty() else {}

static func heading_for_basis(basis: Basis) -> float:
	var forward := -basis.z
	return atan2(forward.x, -forward.z)

func telemetry(position: Vector3, heading_rad: float, speed_mps: float,
		velocity: Vector3 = Vector3.INF, record_arrival: bool = true) -> Dictionary:
	var current := target()
	if current.is_empty() or not position.is_finite() or not is_finite(heading_rad): return {"valid": false}
	var delta: Vector3 = current.position - position
	var planar := Vector2(delta.x, delta.z)
	var distance := planar.length()
	var bearing := fposmod(rad_to_deg(atan2(delta.x, -delta.z)), 360.0)
	var heading := fposmod(rad_to_deg(heading_rad), 360.0)
	var turn := wrapf(bearing - heading, -180.0, 180.0)
	var inside: bool = is_finite(arrival_radius_m) and arrival_radius_m > 0 and distance <= arrival_radius_m
	var arrived := record_arrival and inside and not _last_inside
	if record_arrival: _last_inside = inside
	var first_visit := arrived and not visited.has(current.id)
	if first_visit: visited[current.id] = true
	var closing := speed_mps
	if velocity.is_finite(): closing = Vector2(velocity.x, velocity.z).dot(planar.normalized())
	var eta := -1.0
	if is_finite(closing) and closing > 0.25: eta = distance / closing
	return {"valid": true, "id": current.id, "label": current.label, "kind": current.kind,
		"distance_m": distance, "bearing_deg": bearing, "heading_deg": heading, "turn_deg": turn,
		"eta_s": eta, "arrived": arrived, "first_visit": first_visit, "visited": visited.has(current.id),
		"progress": visited.size(), "total": points.size()}

func guidance_line(position: Vector3, heading_rad: float, speed_mps: float) -> String:
	return describe(telemetry(position, heading_rad, speed_mps))

func describe(t: Dictionary) -> String:
	if not t.get("valid", false): return "No harbor waypoint"
	var side := "ahead"
	if absf(t.turn_deg) >= 8.0: side = "right" if t.turn_deg > 0 else "left"
	var eta := " · ETA " + _format_eta(t.eta_s) if t.eta_s >= 0.0 else " · ETA —"
	return "%s · %.0f m · %03.0f° · %s%s · %d/%d visited" % [t.label, t.distance_m, t.bearing_deg, side, eta, t.progress, t.total]

func _format_eta(seconds: float) -> String:
	var rounded := ceili(maxf(0.0, seconds))
	if rounded < 60: return "%ds" % rounded
	if rounded >= 86400: return ">24h"
	return "%dm %02ds" % [rounded / 60, rounded % 60]

func snapshot() -> Dictionary:
	return {"region_id": region_id, "target_index": target_index, "target_id": target().get("id", ""), "visited": visited.keys()}

func restore(data: Dictionary) -> bool:
	if str(data.get("region_id", "")) != region_id or not data.get("visited", []) is Array: return false
	var restored := {}
	for id in data.get("visited", []):
		if not id is String: continue
		for point in points:
			if point.id == id: restored[id] = true
	var index := target_index
	if data.get("target_id") is String:
		for i in range(points.size()):
			if points[i].id == data.target_id: index = i; break
	elif data.get("target_index") is float or data.get("target_index") is int:
		index = clampi(int(data.target_index), 0, maxi(0, points.size() - 1))
	visited = restored
	target_index = index
	_last_inside = false
	return true
