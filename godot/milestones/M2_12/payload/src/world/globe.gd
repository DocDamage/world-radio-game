extends Node3D
signal location_picked(lat: float, lon: float)
signal station_picked(id: String)
signal location_changed(lat: float, lon: float)
const Geo = preload("res://src/core/geo_math.gd")
@onready var earth_visual = $EarthVisual
@onready var map_visual: MeshInstance3D = $Earth
var visual_style := "earth"
@onready var camera: Camera3D = $Camera3D
@onready var markers: MultiMeshInstance3D = $StationMarkers
@onready var selected: MeshInstance3D = $SelectedMarker
@onready var halo: MeshInstance3D = $SelectedHalo
var stations: Array[Dictionary] = []
var selected_station_id := ""
var positions: Array[Vector3] = []
var longitude := 12.0
var latitude := 25.0
var distance := 3.2
var target_longitude := 12.0
var target_latitude := 25.0
var target_distance := 3.2
var input_enabled := true
var auto_rotate := false
var _dragging := false
var _travel := 0.0
var _clock := 0.0
var _last_coords := Vector2.ZERO

func _ready() -> void:
	update_camera()

func set_stations(rows: Array[Dictionary]) -> void:
	stations.clear()
	positions.clear()
	var unique := {}
	for station in rows:
		var key := "%.3f,%.3f" % [station.geo_lat, station.geo_long]
		if unique.has(key):
			continue
		unique[key] = true
		stations.append(station)
		positions.append(Geo.unit(station.geo_lat, station.geo_long) * 1.012)
		if stations.size() >= 25000:
			break
	var multi := MultiMesh.new()
	multi.transform_format = MultiMesh.TRANSFORM_3D
	var sphere := SphereMesh.new()
	sphere.radius = 0.006
	sphere.height = 0.012
	sphere.radial_segments = 8
	sphere.rings = 4
	multi.mesh = sphere
	multi.instance_count = positions.size()
	for i in range(positions.size()):
		multi.set_instance_transform(i, Transform3D(Basis.IDENTITY, positions[i]))
	markers.multimesh = multi

func focus_station(station: Dictionary, instant: bool = false) -> void:
	if station.is_empty():
		return
	selected_station_id = str(station.id)
	var p := Geo.unit(station.geo_lat, station.geo_long)
	selected.position = p * 1.024
	halo.position = p * 1.027
	halo.quaternion = Quaternion(Vector3.UP, p)
	selected.show()
	halo.show()
	target_longitude = float(station.geo_long)
	target_latitude = clampf(float(station.geo_lat), -78.0, 78.0)
	target_distance = 3.2
	if instant:
		longitude = target_longitude
		latitude = target_latitude
		distance = target_distance
		update_camera()

func _process(delta: float) -> void:
	_clock += delta
	if input_enabled:
		var axis := Input.get_vector("orbit_left", "orbit_right", "orbit_up", "orbit_down")
		target_longitude += axis.x * delta * 60.0
		target_latitude = clampf(target_latitude + axis.y * delta * 45.0, -82.0, 82.0)
		var zoom_axis := Input.get_axis("zoom_in", "zoom_out")
		target_distance = clampf(target_distance + zoom_axis * delta * 1.5, 2.05, 7.0)
	if auto_rotate and input_enabled and not _dragging:
		target_longitude += delta * 2.2
	longitude = rad_to_deg(lerp_angle(deg_to_rad(longitude), deg_to_rad(target_longitude), 1.0 - exp(-delta * 8.0)))
	latitude = lerpf(latitude, target_latitude, 1.0 - exp(-delta * 8.0))
	distance = lerpf(distance, target_distance, 1.0 - exp(-delta * 8.0))
	halo.scale = Vector3.ONE * (1.0 + sin(_clock * 2.2) * 0.08)
	update_camera()
	var coords := Vector2(latitude, longitude)
	if coords.distance_to(_last_coords) > 0.05:
		_last_coords = coords
		location_changed.emit(latitude, longitude)

func update_camera() -> void:
	camera.position = Geo.unit(latitude, longitude) * distance
	camera.look_at(Vector3.ZERO, Vector3.UP)
	earth_visual.update_lighting(camera.position)

func handle_input(event: InputEvent) -> void:
	if not input_enabled:
		_dragging = false
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_dragging = true
				_travel = 0.0
			else:
				if _dragging and _travel < 6.0:
					pick_at(event.position)
				_dragging = false
		elif event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			var direction := -1.0 if event.button_index == MOUSE_BUTTON_WHEEL_UP else 1.0
			target_distance = clampf(target_distance + direction * 0.25, 2.05, 7.0)
	elif event is InputEventMouseMotion and _dragging:
		_travel += event.relative.length()
		target_longitude -= event.relative.x * 0.28
		target_latitude = clampf(target_latitude + event.relative.y * 0.22, -82.0, 82.0)

func cancel_drag() -> void:
	_dragging = false

func pick_at(pixel: Vector2) -> void:
	var nearest_id := ""
	var best := 18.0 * 18.0
	# A city beacon can represent several stations. Preserve the explicitly chosen
	# station when clicking its visible highlight; compare all other cities fairly.
	if selected.visible and not selected_station_id.is_empty() and selected.position.normalized().dot(camera.position.normalized()) >= 1.0 / distance:
		var selected_distance := camera.unproject_position(selected.position).distance_squared_to(pixel)
		if selected_distance < best:
			best = selected_distance
			nearest_id = selected_station_id
	for i in range(positions.size()):
		var p := positions[i]
		if p.normalized().dot(camera.position.normalized()) < 1.0 / distance:
			continue
		var at := camera.unproject_position(p)
		var d := at.distance_squared_to(pixel)
		if d < best - 0.000001:
			best = d
			nearest_id = stations[i].id
	if not nearest_id.is_empty():
		station_picked.emit(nearest_id)
	else:
		var geo := surface_at(pixel)
		if not geo.is_empty():
			location_picked.emit(geo[0], geo[1])

func home() -> void:
	target_latitude = 25.0
	target_longitude = 12.0
	target_distance = 3.2

func set_visual_options(style: String, clouds: bool, night: bool) -> void:
	visual_style = style if style in ["earth", "map"] else "earth"
	earth_visual.visible = visual_style == "earth"
	map_visual.visible = visual_style == "map"
	earth_visual.set_options(clouds, night)
	earth_visual.update_lighting(camera.position)

func surface_at(pixel: Vector2) -> PackedFloat64Array:
	# Analytic ray/unit-sphere intersection; map and Earth share GeoMath's convention.
	var origin := camera.project_ray_origin(pixel)
	var ray := camera.project_ray_normal(pixel)
	var b := origin.dot(ray)
	var discriminant := b * b - (origin.length_squared() - 1.0)
	if discriminant < 0.0:
		return PackedFloat64Array()
	var t := -b - sqrt(discriminant)
	if t < 0.0:
		return PackedFloat64Array()
	var geo := Geo.coordinates(origin + ray * t)
	return PackedFloat64Array([geo.x, geo.y, 0.0])

func focus_location(lat: float, lon: float, instant: bool = false) -> void:
	target_latitude = clampf(lat, -78.0, 78.0)
	target_longitude = lon
	target_distance = 3.2
	if instant:
		latitude = target_latitude
		longitude = lon
		distance = target_distance
		update_camera()
