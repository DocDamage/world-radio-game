"""Hermetic tests: python -m unittest -v test_update"""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from apply_update import build, UpdateError


def meta(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.base, self.patch, self.out = [self.root / n for n in ('base', 'patch', 'result')]
        self.base.mkdir(); (self.patch / 'payload').mkdir(parents=True)
        (self.base / 'project.godot').write_bytes(b'base')
        (self.base / 'unchanged.txt').write_bytes(b'keep')
        (self.patch / 'payload' / 'project.godot').write_bytes(b'new')
        (self.patch / 'payload' / 'added.txt').write_bytes(b'added')
        self.manifest = {'schema': 2, 'from_version': '0.2.11-dev', 'to_version': '0.2.12-dev',
            'base_files': {'project.godot': meta(b'base'), 'unchanged.txt': meta(b'keep')},
            'payload': {'project.godot': meta(b'new'), 'added.txt': meta(b'added')}}
        self.manifest['output_files'] = dict(self.manifest['base_files'], **self.manifest['payload'])
        self.save()

    def save(self):
        (self.patch / 'PATCH_MANIFEST.json').write_text(json.dumps(self.manifest))

    def refused(self):
        with self.assertRaises((UpdateError, OSError)):
            build(self.base, self.out, self.patch)
        self.assertFalse(self.out.exists())
        self.assertFalse(list(self.root.glob('.terrawave-m212-*')))

    def test_success_and_base_unchanged(self):
        receipt = build(self.base, self.out, self.patch)
        self.assertEqual(receipt['verified_files'], 3)
        self.assertEqual((self.out/'project.godot').read_bytes(), b'new')
        self.assertEqual((self.out/'unchanged.txt').read_bytes(), b'keep')
        self.assertEqual((self.base/'project.godot').read_bytes(), b'base')
        self.assertFalse((self.base/'added.txt').exists())

    def test_missing_base(self):
        (self.base/'unchanged.txt').unlink(); self.refused()

    def test_modified_base(self):
        (self.base/'project.godot').write_bytes(b'fail'); self.refused()

    def test_corrupt_payload(self):
        (self.patch/'payload/added.txt').write_bytes(b'wrong'); self.refused()

    def test_missing_payload(self):
        (self.patch/'payload/added.txt').unlink(); self.refused()

    def test_extra_source_files_untouched_not_copied(self):
        (self.base/'personal.txt').write_text('private')
        build(self.base, self.out, self.patch)
        self.assertEqual((self.base/'personal.txt').read_text(), 'private')
        self.assertFalse((self.out/'personal.txt').exists())

    def test_new_path_collision(self):
        (self.base/'added.txt').write_text('user change'); self.refused()

    def test_path_traversal(self):
        self.manifest['payload']['../escape.txt'] = meta(b'bad'); self.save(); self.refused()

    def test_windows_path(self):
        self.manifest['payload']['C:\\bad.txt'] = meta(b'bad'); self.save(); self.refused()

    def test_case_collision(self):
        self.manifest['payload']['ADDED.TXT'] = meta(b'added'); self.save(); self.refused()

    def test_output_inventory_tamper(self):
        self.manifest['output_files']['added.txt'] = meta(b'tamper'); self.save(); self.refused()

    def test_symlink_base(self):
        (self.base/'unchanged.txt').unlink()
        (self.root/'real.txt').write_bytes(b'keep')
        (self.base/'unchanged.txt').symlink_to(self.root/'real.txt'); self.refused()

    def test_symlink_payload(self):
        (self.patch/'payload/added.txt').unlink()
        (self.root/'real.txt').write_bytes(b'added')
        (self.patch/'payload/added.txt').symlink_to(self.root/'real.txt'); self.refused()

    def test_existing_output_unchanged(self):
        self.out.mkdir(); (self.out/'user.txt').write_text('safe')
        with self.assertRaises(UpdateError): build(self.base, self.out, self.patch)
        self.assertEqual((self.out/'user.txt').read_text(), 'safe')

    def test_output_inside_base(self):
        with self.assertRaises(UpdateError): build(self.base, self.base/'result', self.patch)
        self.assertFalse((self.base/'result').exists())


if __name__ == '__main__': unittest.main()
