extends Node3D
## One non-colliding marker, positioned from region coordinates every frame (including rebases).
var explorer: Node
var guide: RefCounted
var enabled := true
var label: Label3D
var last_region_position := Vector3.ZERO

func _ready() -> void:
	name = "HarborWaypointMarker"
	var mesh := MeshInstance3D.new()
	var beam := CylinderMesh.new()
	beam.top_radius = 0.4
	beam.bottom_radius = 1.0
	beam.height = 18.0
	beam.radial_segments = 12
	mesh.mesh = beam
	mesh.position.y = 9.0
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.albedo_color = Color("ffd178")
	mesh.material_override = material
	mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mesh)
	label = Label3D.new()
	label.position.y = 22.0
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 42
	label.outline_size = 10
	label.pixel_size = 0.06
	label.modulate = Color("ffe4aa")
	label.no_depth_test = false
	add_child(label)
	hide()

func _process(_delta: float) -> void:
	if not enabled or not is_instance_valid(explorer) or guide == null:
		hide(); return
	var s: Node = explorer.session
	if s.state not in ["WALKING", "SAILING", "SWIMMING"] or s.frame == null or s.marine.coastal == null:
		hide(); return
	var point: Dictionary = guide.target()
	if point.is_empty(): hide(); return
	var p: Vector3 = point.position
	var coast: Node = s.marine.coastal
	p.y = coast.dock.land_height if point.kind == "berth" else coast.environment.height_at(p.x, p.z)
	last_region_position = p
	position = s.frame.region_to_local(p.x, p.y, p.z)
	var actor_position: Vector3 = s.frame.local_to_region(s.marine.actor().position)
	var distance := Vector2(actor_position.x - p.x, actor_position.z - p.z).length()
	visible = distance <= 1500.0
	# Keep text readable across the harbor without scaling collision or the world beam.
	label.scale = Vector3.ONE * clampf(distance / 45.0, 0.15, 30.0)
	label.text = "%s · %.0f m\nGAMEPLAY TARGET" % [point.label, distance]
