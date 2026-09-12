#!/usr/bin/env python3
"""Generate deterministic gameplay depths and curated scenery over the existing harbor.
The source shoreline, terrain, manifests and provenance are never rewritten.
Requires Shapely. No network services, survey or real-tide claims.
"""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
from shapely.affinity import rotate, translate
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union, nearest_points
ROOT = Path(__file__).resolve().parents[1]
REGION = ROOT / 'data/new_haven_harbor'
OUTPUT = ROOT / 'addons/terrawave_marine/coastal/data'

def read(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))

def geometry():
    water, buildings, roads = [], [], []
    for path in sorted((REGION / 'chunks').glob('*.json')):
        data = read(path)
        x, z = (250 * int(v) for v in data['key'].split(','))
        for target, field in [(water, 'water'), (buildings, 'buildings')]:
            for feature in data.get(field, []):
                target.append(Polygon([(p[0]+x, p[1]+z) for p in feature['footprint']],
                    [[(p[0]+x, p[1]+z) for p in ring] for ring in feature.get('holes', [])]))
        for road in data.get('roads', []):
            roads.append(LineString([(p[0]+x,p[1]+z) for p in road['points']]).buffer((road['width']+4.6)/2))
    return unary_union(water), unary_union(buildings), unary_union(roads)

def geography(x: float, z: float, anchor: list[float]) -> list[float]:
    # ECEF tangent coordinates: east, up, south. Iterative ellipsoid inverse.
    lat, lon = map(math.radians, anchor[:2])
    e2 = 6.6943799901413165e-3
    n = 6378137.0 / math.sqrt(1-e2*math.sin(lat)**2)
    xx = n*math.cos(lat)*math.cos(lon) - x*math.sin(lon) + z*math.sin(lat)*math.cos(lon)
    yy = n*math.cos(lat)*math.sin(lon) + x*math.cos(lon) + z*math.sin(lat)*math.sin(lon)
    zz = n*(1-e2)*math.sin(lat) - z*math.cos(lat)
    horizontal = math.hypot(xx, yy)
    phi = math.atan2(zz, horizontal*(1-e2))
    for _ in range(8):
        n = 6378137.0/math.sqrt(1-e2*math.sin(phi)**2)
        phi = math.atan2(zz+e2*n*math.sin(phi), horizontal)
    return [round(math.degrees(phi),9),round(math.degrees(math.atan2(yy,xx)),9)]

def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = read(REGION/'manifest.json')
    water, buildings, roads = geometry()
    base = manifest['water_level']['value_m'] - manifest['terrain']['datum_base_m'] + .03
    values = []
    for iz in range(129):
        for ix in range(129):
            p = Point(-1000+ix*15.625,-1000+iz*15.625)
            distance = p.distance(water.boundary) if water.covers(p) else 0
            depth = .35 + 11.5 * (1 - math.exp(-distance/85))
            values.append(round(base-depth,6))
    bathy = {'schema':1, 'region_id':manifest['id'], 'mode':'modeled_gameplay',
        'surveyed':False, 'horizontal_reference':'WGS84_EAST_SOUTH_TANGENT',
        'vertical_reference':'region_local_y_metres', 'positive':'up',
        'reference_surface_y':base, 'origin':[-1000,-1000], 'spacing':15.625,
        'width':129,'height':129,'samples':values,
        'provenance':{'source':'Authored shoreline-distance depth model; NOT a bathymetric survey',
            'formula':'depth = 0.35 + 11.5 * (1-exp(-shore_distance/85))',
            'land_samples':'Shallow interpolation support only; mapped-water containment is separately mandatory',
            'water_source_sha256':manifest['water_source']['source_sha256'],
            'land_dem_sha256':manifest['terrain']['source_sha256'],
            'license':'Project-authored model over attributed existing geographic water',
            'warning':'Not for navigation. No live or calibrated tide observations.'}}
    (OUTPUT/'bathymetry.json').write_text(json.dumps(bathy,separators=(',',':'))+'\n', encoding='utf-8', newline='\n')
    spawn = Point(manifest['spawn'][0],manifest['spawn'][2])
    shore = nearest_points(spawn,water.boundary)[1]
    d = ((shore.x-spawn.x)/spawn.distance(shore),(shore.y-spawn.y)/spawn.distance(shore))
    land = [shore.x-d[0]*1.25,shore.y-d[1]*1.25]
    yaw = math.atan2(-d[0],-d[1])
    dock = {'id':'visitor-dock', 'land_xz':land, 'yaw':yaw, 'pontoon_z':-15.0,
        'berth_local':[2.95,-15.0], 'ladder_local':[-2.65,-15.0],
        'source':'Authored gameplay dock on the existing mapped bank, not a surveyed real structure'}
    items = []
    used = []
    def add(key, x, z, sx, sz, mode, yaw=0.0, extent=12., label=''):
        # Shapely x/z rotation has the opposite sign to Godot Y rotation.
        envelope = translate(rotate(box(-sx/2,-sz/2,sx/2,sz/2),-math.degrees(yaw)),xoff=x,yoff=z)
        if mode in ['floating','seabed']:
            assert water.covers(envelope), (key,'outside mapped water')
        else:
            assert not water.intersects(envelope) and not buildings.intersects(envelope), (key,'wet/building')
            assert not roads.intersects(envelope), (key,'road encroachment')
        assert not any(p.intersects(envelope) for p in used), (key,'placement overlap')
        used.append(envelope)
        minx,minz,maxx,maxz=envelope.bounds
        keys = [f'{xx},{zz}' for zz in range(math.floor(minz/250),math.floor(maxz/250)+1)
                for xx in range(math.floor(minx/250),math.floor(maxx/250)+1)]
        items.append({'id':key+'-'+str(len(items)), 'asset':key, 'xz':[x,z],
            'yaw':yaw, 'extent':extent, 'mode':mode, 'label':label or key.replace('_',' ').title(),
            'geographic_lat_lon':geography(x,z,manifest['anchor']),
            'footprint_size':[sx,sz], 'resident_keys':keys, 'authored':True})
    add('carrier',-220,490,330,90,'floating',math.pi/2,330,'Carrier • authored moored exhibit')
    items[-1]['waterline_y_normalized'] = .026
    items[-1]['waterline_source'] = 'Authored visual waterline; ignores low detached scan fragments'
    add('swift',-493,302,20,9,'floating',0,16,'Swift workboat • moored exhibit')
    add('underwater',-470,268,10,10,'seabed',0,6,'Submerged exploration exhibit')
    # Select dry clear parcels deterministically; never put props on source roads/buildings.
    candidates = [(x,z) for x in range(-720,-540,5) for z in range(140,360,5)]
    candidates.sort(key=lambda p:(math.hypot(p[0]-spawn.x,p[1]-spawn.y),p))
    dry_specs=[('crane',40,40,36),('wooden_boat',14,7,12)]
    dry_specs += [(f'container_{i}',14,6,12.2) for i in range(1,7)]
    dry_specs += [('cannon',4,4,2.5),('map',4,4,2.8)]
    for key,sx,sz,extent in dry_specs:
        found = False
        for x,z in candidates:
            envelope=box(x-sx/2,z-sz/2,x+sx/2,z+sz/2)
            if envelope.distance(spawn)<8 or envelope.distance(Point(*land))<7: continue
            if water.intersects(envelope) or buildings.intersects(envelope) or roads.intersects(envelope): continue
            if any(p.buffer(2).intersects(envelope) for p in used): continue
            add(key,x,z,sx,sz,'ground',0,extent)
            found=True;break
        if not found: raise ValueError(f'No clear parcel for {key}; do not silently place in water/roads')
    layout={'schema':1,'region_id':manifest['id'],'source_manifest_sha256':hashlib.sha256((REGION/'manifest.json').read_bytes()).hexdigest(),
        'placement_policy':'Authored scenery, not surveyed real-world asset locations',
        'max_resident':24, 'view_radius_m':900,'dock':dock,'items':items}
    (OUTPUT/'harbor_layout.json').write_text(json.dumps(layout,indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Wrote modeled 129x129 bathymetry and',len(items),'validated authored placements')
    for item in items: print(item['asset'],item['xz'],item['resident_keys'])

if __name__=='__main__': main()
