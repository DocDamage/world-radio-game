class_name GeoMath
extends RefCounted
## Longitude zero faces +Z; north is +Y. Used by mesh UVs AND markers.

static func valid(lat: Variant, lon: Variant) -> bool:
	if not (lat is float or lat is int) or not (lon is float or lon is int):
		return false
	return is_finite(float(lat)) and is_finite(float(lon)) and absf(lat) <= 90.0 and absf(lon) <= 180.0

static func unit(lat: float, lon: float) -> Vector3:
	var a := deg_to_rad(lat)
	var b := deg_to_rad(lon)
	return Vector3(cos(a) * sin(b), sin(a), cos(a) * cos(b))

static func coordinates(point: Vector3) -> Vector2:
	var n := point.normalized()
	return Vector2(rad_to_deg(asin(clampf(n.y, -1.0, 1.0))), rad_to_deg(atan2(n.x, n.z)))

static func distance_km(a: Vector2, b: Vector2) -> float:
	var lat1 := deg_to_rad(float(a.x))
	var lat2 := deg_to_rad(float(b.x))
	var dlat := lat2 - lat1
	var dlon := deg_to_rad(float(b.y) - float(a.y))
	var h := sin(dlat / 2.0) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2.0) ** 2
	return 12742.0176 * asin(sqrt(clampf(h, 0.0, 1.0)))
