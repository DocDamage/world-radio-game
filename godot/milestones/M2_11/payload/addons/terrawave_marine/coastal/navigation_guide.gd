extends RefCounted
## Lightweight harbor exploration guidance. Gameplay aid only; never navigation data.
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
	if region_id.is_empty(): return false
	var dock: Dictionary = layout.get("dock", {})
	var land: Array = dock.get("land_xz", [])
	if land.size() == 2:
		points.append(_point("visitor-dock", "Visitor Dock", float(land[0]), float(land[1]), "berth"))
	for item in layout.get("items", []):
		if not item is Dictionary: continue
		var mode := str(item.get("mode", ""))
		if mode not in ["floating", "seabed"]: continue
		var xz: Array = item.get("xz", [])
		if xz.size() != 2: continue
		points.append(_point(str(item.get("id", "poi")), str(item.get("label", item.get("asset", "Harbor point"))), float(xz[0]), float(xz[1]), mode))
	return not points.is_empty()

func _point(id: String, label: String, x: float, z: float, kind: String) -> Dictionary:
	return {"id":id, "label":label, "position":Vector3(x,0,z), "kind":kind}

func select(index: int) -> bool:
	if index < 0 or index >= points.size(): return false
	target_index = index
	_last_inside = false
	return true

func next_target() -> void:
	if points.is_empty(): return
	target_index = (target_index + 1) % points.size()
	_last_inside = false

func target() -> Dictionary:
	if points.is_empty(): return {}
	return points[target_index]

func telemetry(position: Vector3, heading_rad: float, speed_mps: float) -> Dictionary:
	var current := target()
	if current.is_empty(): return {"valid":false}
	var target_position: Vector3 = current.position
	var dx := target_position.x - position.x
	var dz := target_position.z - position.z
	var distance := Vector2(dx,dz).length()
	var bearing := fposmod(rad_to_deg(atan2(dx,-dz)),360.0)
	var heading := fposmod(rad_to_deg(heading_rad),360.0)
	var turn := wrapf(bearing-heading,-180.0,180.0)
	var inside := distance <= arrival_radius_m
	var arrived := inside and not _last_inside
	_last_inside = inside
	if arrived: visited[current.id] = true
	var eta := -1.0
	if speed_mps > 0.25: eta = distance/speed_mps
	return {
		"valid":true,
		"id":current.id,
		"label":current.label,
		"kind":current.kind,
		"distance_m":distance,
		"bearing_deg":bearing,
		"heading_deg":heading,
		"turn_deg":turn,
		"eta_s":eta,
		"arrived":arrived,
		"visited":visited.has(current.id),
		"progress":visited.size(),
		"total":points.size()
	}

func guidance_line(position: Vector3, heading_rad: float, speed_mps: float) -> String:
	var t := telemetry(position,heading_rad,speed_mps)
	if not t.valid: return "No harbor waypoint"
	var side := "ahead"
	if absf(t.turn_deg) >= 8.0: side = "right" if t.turn_deg > 0 else "left"
	var eta := ""
	if t.eta_s >= 0.0: eta = " · ETA %s" % _format_eta(t.eta_s)
	return "%s · %.0f m · %03.0f° · %s%s · %d/%d visited" % [t.label,t.distance_m,t.bearing_deg,side,eta,t.progress,t.total]

func _format_eta(seconds: float) -> String:
	if seconds < 60.0: return "%ds" % ceili(seconds)
	return "%dm %02ds" % [floori(seconds/60.0), ceili(fmod(seconds,60.0))]

func snapshot() -> Dictionary:
	return {"region_id":region_id,"target_index":target_index,"visited":visited.keys()}

func restore(data: Dictionary) -> bool:
	if str(data.get("region_id", "")) != region_id: return false
	var index := int(data.get("target_index",0))
	if index >= 0 and index < points.size(): target_index = index
	visited.clear()
	for id in data.get("visited",[]):
		for p in points:
			if p.id == str(id): visited[str(id)] = true
	_last_inside = false
	return true
