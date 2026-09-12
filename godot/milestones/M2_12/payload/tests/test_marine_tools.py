"""Offline geometric and source-integrity checks; NOT native-runtime acceptance."""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import unittest
from shapely.geometry import Point, Polygon
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import marine_geometry_oracle as geo

class MarineGeometryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.triangles,cls.manifest=geo.load_water(ROOT/'data/new_haven_harbor')
        cls.water=geo.union(cls.triangles)

    def test_hull_is_circumscribed(self):
        disk=Polygon(geo.swept_hull((0,0),(0,0)))
        self.assertGreaterEqual(disk.boundary.distance(Point(0,0)),2.55-1e-10)

    def test_clear_water(self):
        self.assertEqual(geo.clip(geo.swept_hull((-3,0),(3,0)),geo.rectangle((-20,-20),(20,20))),[])

    def test_tile_seam_is_traversable(self):
        triangles=geo.rectangle((-20,-20),(0,20))+geo.rectangle((0,-20),(20,20))
        self.assertEqual(geo.clip(geo.swept_hull((-3,0),(3,0)),triangles),[])

    def test_submeter_unknown_gap_blocks(self):
        triangles=geo.rectangle((-20,-20),(-.1,20))+geo.rectangle((.1,-20),(20,20))
        self.assertTrue(geo.clip(geo.swept_hull((-3,0),(3,0)),triangles))

    def test_tiny_island_between_clear_endpoints(self):
        t=geo.rectangle((-20,-20),(-.1,20))+geo.rectangle((.1,-20),(20,20))
        t+=geo.rectangle((-.1,-20),(.1,-.1))+geo.rectangle((-.1,.1),(.1,20))
        for p in [(-3.5,0),(3.5,0)]: self.assertFalse(geo.clip(geo.swept_hull(p,p),t))
        self.assertTrue(geo.clip(geo.swept_hull((-3.5,0),(3.5,0)),t))

    def test_concave_land_blocks(self):
        t=geo.rectangle((-20,-20),(-.2,20))+geo.rectangle((.2,-20),(20,20))
        t+=geo.rectangle((-.2,5),(.2,20))
        self.assertTrue(geo.clip(geo.swept_hull((-3,0),(3,0)),t))

    def test_empty_coverage_fails_closed(self):
        self.assertTrue(geo.clip(geo.swept_hull((0,0),(0,0)),[]))

    def test_unloaded_neighbor_fails_closed(self):
        t=geo.rectangle((-20,-20),(0,20))
        self.assertTrue(geo.clip(geo.swept_hull((-3,0),(3,0)),t))

    def test_real_water_has_positive_triangles(self):
        self.assertGreater(len(self.triangles),0)
        self.assertTrue(all(geo.signed_area(p)>0 for p in self.triangles))

    def test_real_launch_footprint_found(self):
        p=geo.find_launch(self.triangles,self.manifest)
        self.assertIsNotNone(p)
        hull=Polygon(geo.swept_hull(p,p))
        self.assertLess(hull.difference(self.water).area,1e-6)
        self.assertLessEqual(math.dist(p,(self.manifest['spawn'][0],self.manifest['spawn'][2])),40.001)

    def test_launch_with_only_original_neighborhood(self):
        x,z=(math.floor(self.manifest['spawn'][i]/250) for i in [0,2])
        keys={f'{i},{j}' for i in range(x-2,x+3) for j in range(z-2,z+3)}
        triangles,_=geo.load_water(ROOT/'data/new_haven_harbor',keys)
        self.assertIsNotNone(geo.find_launch(triangles,self.manifest))

    def test_shore_checkpoint_is_dry(self):
        p=self.manifest['spawn']
        self.assertFalse(self.water.covers(Point(p[0],p[2])))

    def test_water_level_not_tide_or_depth(self):
        m=self.manifest
        self.assertFalse(m['water_level']['water_level_measured'])
        self.assertFalse(m['water_level']['tides_simulated'])
        self.assertAlmostEqual(m['water_level']['value_m']-m['terrain']['datum_base_m']+.03,-2.9454)

    def test_rebase_does_not_change_region_hull(self):
        p=geo.find_launch(self.triangles,self.manifest)
        shift=(-500.,250.)
        local=(p[0]-shift[0],p[1]-shift[1])
        restored=(local[0]+shift[0],local[1]+shift[1])
        self.assertLess(math.dist(p,restored),1e-10)
        self.assertFalse(geo.clip(geo.swept_hull(restored,restored),self.triangles))

    def test_port_matches_independent_geos_for_160_sweeps(self):
        rng=random.Random(29)
        counts=[0,0]
        for i in range(160):
            p=(rng.uniform(-850,850),rng.uniform(-850,850))
            a=rng.uniform(-math.pi,math.pi);d=rng.uniform(0,8)
            q=(p[0]+math.cos(a)*d,p[1]+math.sin(a)*d)
            hull=geo.swept_hull(p,q)
            expected=Polygon(hull).difference(self.water).area>geo.EPS
            actual=bool(geo.clip(hull,self.triangles))
            self.assertEqual(expected,actual,(i,p,q))
            counts[int(actual)]+=1
        self.assertGreater(min(counts),20)

class MarineSourceTests(unittest.TestCase):
    def test_all_protected_originals(self):
        receipt=json.loads((ROOT/'docs/M2_9_PROTECTED_FILES.json').read_text())
        approved=json.loads((ROOT/'docs/M2_10R_APPROVED_BASE_CHANGES.json').read_text())['changes']
        self.assertEqual(set(approved),{'addons/terrawave_earth/world/walker.gd','tests/integration/native_test_support.gd','tests/integration/harbor_checks.gd','tests/pack_smoke.gd','tools/validate_pack.py','tools/build_windows.py'})
        regional=json.loads((ROOT/'docs/M2_12_APPROVED_BASE_CHANGES.json').read_text())['changes']
        self.assertEqual(set(regional),{'tests/test_ui.gd', 'src/ui/station_browser.gd', 'src/audio/radio_player.gd', 'src/core/station_catalog.gd', 'src/core/geo_math.gd', 'src/ui/main.gd', 'src/core/catalog_codec.gd', 'tests/test_import.gd', 'src/core/save_store.gd', 'src/world/globe.gd', 'src/ui/station_inspector.gd', 'tests/test_terrain.gd'})
        windows=json.loads((ROOT/'docs/M2_13_APPROVED_BASE_CHANGES.json').read_text())['changes']
        self.assertEqual(set(windows), {'src/audio/radio_player.gd'})
        for relative,expected in receipt['files'].items():
            with self.subTest(path=relative):
                if relative in approved:
                    self.assertEqual(approved[relative]['m2_8_sha256'],expected)
                    self.assertTrue(approved[relative]['reason'])
                    expected=approved[relative]['m2_10r_sha256']
                if relative in regional:
                    self.assertEqual(regional[relative]['previous_sha256'],expected)
                    self.assertTrue(regional[relative]['reason'])
                    expected=regional[relative]['m2_12_sha256']
                if relative in windows:
                    self.assertEqual(windows[relative]['previous_sha256'], expected)
                    self.assertTrue(windows[relative]['reason'])
                    expected=windows[relative]['m2_13_sha256']
                self.assertEqual(hashlib.sha256((ROOT/relative).read_bytes()).hexdigest(),expected)

    def test_all_supplied_marine_models(self):
        receipt=json.loads((ROOT/'docs/M2_9_ASSET_RECEIPT.json').read_text())
        self.assertEqual(len(receipt['files']),11)
        for relative,expected in receipt['files'].items():
            self.assertEqual(hashlib.sha256((ROOT/relative).read_bytes()).hexdigest(),expected)

    def test_catalog_has_16_resolvable_wrappers(self):
        catalog=json.loads((ROOT/'addons/terrawave_marine/catalog.json').read_text())
        self.assertEqual(len(catalog),16)
        for item in catalog:
            for name in ['scene','model']:
                self.assertTrue((ROOT/item[name].removeprefix('res://')).is_file())

    def test_synthetic_basin_not_used_by_harbor(self):
        for p in (ROOT/'addons/terrawave_marine/harbor').glob('*.gd'):
            text=p.read_text()
            self.assertNotIn('basin.gd',text)
            self.assertNotIn('PlaneMesh',text)
            self.assertNotIn('change_scene',text)

    def test_no_radio_or_profile_writes_in_marine_code(self):
        paths=list((ROOT/'addons/terrawave_marine/harbor').glob('*.gd'))
        paths+=list((ROOT/'src/exploration/marine').glob('*.gd'))
        for p in paths:
            text=p.read_text()
            for token in ['RadioPlayer.', 'AppState.', 'get_tree().paused', 'FileAccess.WRITE']:
                self.assertNotIn(token,text)

    def test_export_includes_catalog(self):
        lines=(ROOT/'export_presets.cfg').read_text().splitlines()
        filters=[x for x in lines if x.startswith('include_filter=')]
        self.assertEqual(len(filters),2)
        self.assertTrue(all('addons/terrawave_marine/catalog.json' in x for x in filters))

    def test_new_scripts_stay_bounded(self):
        for folder in ['addons/terrawave_marine/harbor','src/exploration/marine']:
            for path in (ROOT/folder).glob('*.gd'):
                self.assertLessEqual(len(path.read_text().splitlines()),300)

if __name__=='__main__': unittest.main()
