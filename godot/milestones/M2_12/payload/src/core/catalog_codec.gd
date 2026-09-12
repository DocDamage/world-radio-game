class_name CatalogCodec
extends RefCounted
const Geo = preload("res://src/core/geo_math.gd")
const MAX_STATIONS := 100000

static func valid_url(value: Variant) -> bool:
	if not value is String or value.length() > 4096:
		return false
	if not (value.begins_with("https://") or value.begins_with("http://")):
		return false
	var host: String = value.substr(value.find("://") + 3).split("/")[0].split("?")[0].split("#")[0]
	if host.is_empty() or "@" in host:
		return false
	for c in value:
		if c.unicode_at(0) <= 32 or c.unicode_at(0) == 127:
			return false
	return true

static func parse(data: Variant) -> Dictionary:
	var rows: Variant = data
	if data is Dictionary:
		var version: Variant = data.get("schema_version", 0)
		if not (version is int or version is float) or version != 1:
			return {"stations": [], "error": "Unsupported catalog version."}
		rows = data.get("stations")
	if not rows is Array or rows.size() > MAX_STATIONS:
		return {"stations": [], "error": "Expected a station array (maximum 100,000)."}
	var accepted: Array[Dictionary] = []
	var ids := {}
	var rejected := 0
	for raw in rows:
		if not raw is Dictionary:
			rejected += 1
			continue
		var id := str(raw.get("id", "")).strip_edges()
		var title := str(raw.get("name", "")).strip_edges()
		if id.is_empty() or id.length() > 256 or title.is_empty() or ids.has(id):
			rejected += 1
			continue
		var native_stream := valid_url(raw.get("streamUrl"))
		var website_only: bool = raw.get("playback_mode", "") == "website" and valid_url(raw.get("homepage"))
		if not Geo.valid(raw.get("geo_lat"), raw.get("geo_long")) or not (native_stream or website_only):
			rejected += 1
			continue
		var station := {"id": id.left(256), "name": title.left(256),
			"place": str(raw.get("place", "")).left(256),
			"country": str(raw.get("country", "")).left(256),
			"countryCode": str(raw.get("countryCode", "")).left(8),
			"streamUrl": raw.get("streamUrl", "") if native_stream else "", "geo_lat": float(raw.geo_lat),
			"geo_long": float(raw.geo_long), "tags": str(raw.get("tags", "")).left(512)}
		for key in ["callsign", "region", "location_precision", "checked_on", "stream_status"]:
			station[key] = str(raw.get(key, "")).left(256)
		for key in ["homepage", "source_url"]:
			station[key] = raw.get(key, "") if valid_url(raw.get(key)) else ""
		station["playback_mode"] = "stream" if native_stream else "website"
		station["search"] = (station.name + " " + station.place + " " + station.country + " " + station.tags + " " + station.region + " " + station.callsign).to_lower()
		accepted.append(station)
		ids[id] = true
	return {"stations": accepted, "rejected": rejected, "error": ""}

static func from_web(raw_stations: Variant, raw_places: Variant) -> Dictionary:
	if not raw_stations is Array or not raw_places is Array:
		return {"stations": [], "error": "Web snapshots must both contain JSON arrays."}
	if raw_stations.size() > MAX_STATIONS or raw_places.size() > MAX_STATIONS:
		return {"stations": [], "error": "Web snapshot exceeds the 100,000-row safety limit."}
	var places := {}
	for place in raw_places:
		if place is Dictionary and place.get("id") is String:
			places[place.id] = place
	var rows := []
	var missing_geo := 0
	for row in raw_stations:
		if not row is Dictionary:
			missing_geo += 1
			continue
		var place: Dictionary = places.get(str(row.get("placeId", "")), {})
		var geo: Variant = place.get("geo", [])
		var lat: Variant = row.get("geo_lat")
		var lon: Variant = row.get("geo_long")
		if not Geo.valid(lat, lon) and geo is Array and geo.size() == 2:
			lon = geo[0]
			lat = geo[1]
		if not Geo.valid(lat, lon):
			missing_geo += 1
			continue
		var id := str(row.get("id", ""))
		var url := str(row.get("streamUrl", ""))
		if url.is_empty() and not id.is_empty():
			url = "https://radio.garden/api/ara/content/listen/%s/channel.mp3" % id.uri_encode()
		rows.append({"id": id, "name": row.get("name", ""),
			"place": row.get("place", place.get("title", "")),
			"country": row.get("country", place.get("country", "")),
			"countryCode": row.get("countryCode", ""), "streamUrl": url,
			"geo_lat": lat, "geo_long": lon, "tags": row.get("tags", "")})
	var result := parse(rows)
	result["missing_geo"] = missing_geo
	return result
