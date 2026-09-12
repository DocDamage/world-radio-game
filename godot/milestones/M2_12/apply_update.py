#!/usr/bin/env python3
"""Build a verified M2.12 source tree in a NEW directory. Never modify the base."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tempfile


class UpdateError(ValueError):
    """The source, patch, or destination failed verification."""


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def safe_name(value: str) -> str:
    if not isinstance(value, str) or not value or any(c in value for c in ('\\', ':', '\x00', '\n', '\r')):
        raise UpdateError(f'Invalid inventory path: {value!r}')
    path = PurePosixPath(value)
    if path.is_absolute() or any(p in ('', '.', '..') for p in value.split('/')):
        raise UpdateError(f'Unsafe inventory path: {value!r}')
    return value


def source_path(root: Path, name: str) -> Path:
    path = root
    for part in safe_name(name).split('/'):
        path = path / part
        if path.is_symlink():
            raise UpdateError(f'Refusing symlink: {path}')
    return path


def inventory(value: object) -> dict:
    if not isinstance(value, dict) or not value:
        raise UpdateError('Empty or invalid inventory')
    result, folded = {}, set()
    for name, meta in value.items():
        safe_name(name)
        if name.casefold() in folded:
            raise UpdateError(f'Case-insensitive duplicate: {name}')
        folded.add(name.casefold())
        if not isinstance(meta, dict) or not isinstance(meta.get('bytes'), int) or meta['bytes'] < 0:
            raise UpdateError(f'Invalid size: {name}')
        sha = meta.get('sha256', '')
        if len(sha) != 64 or any(c not in '0123456789abcdef' for c in sha):
            raise UpdateError(f'Invalid hash: {name}')
        result[name] = {'bytes': meta['bytes'], 'sha256': sha}
    return result


def verify(root: Path, files: dict, label: str) -> None:
    for name, meta in files.items():
        path = source_path(root, name)
        if not path.is_file():
            raise UpdateError(f'{label}: missing file {name}')
        if path.stat().st_size != meta['bytes'] or digest(path) != meta['sha256']:
            raise UpdateError(f'{label}: changed or corrupt file {name}')


def load_manifest(here: Path) -> dict:
    manifest = json.loads((here / 'PATCH_MANIFEST.json').read_text(encoding='utf-8'))
    if manifest.get('schema') != 2 or manifest.get('from_version') != '0.2.11-dev' or manifest.get('to_version') != '0.2.12-dev':
        raise UpdateError('Not a supported M2.11 -> M2.12 patch')
    manifest['base_files'] = inventory(manifest['base_files'])
    manifest['payload'] = inventory(manifest['payload'])
    manifest['output_files'] = inventory(manifest['output_files'])
    expected = dict(manifest['base_files'])
    expected.update(manifest['payload'])
    if expected != manifest['output_files']:
        raise UpdateError('Output inventory does not match base plus patch')
    return manifest


def build(base: Path, output: Path, here: Path) -> dict:
    here, base = here.resolve(), base.resolve()
    if output.exists() or output.is_symlink():
        raise UpdateError('Output already exists; choose a NEW directory')
    output = output.absolute()
    if not output.parent.is_dir():
        raise UpdateError('Output parent does not exist')
    output = output.parent.resolve() / output.name
    for source in (base, here):
        if output == source or source in output.parents or output in source.parents:
            raise UpdateError('Output must be separate from the base and update directories')
    manifest = load_manifest(here)
    verify(base, manifest['base_files'], 'M2.11 base')
    verify(here / 'payload', manifest['payload'], 'Patch payload')
    # Extras in the base are not deleted or copied. This excludes editor caches and user data.
    for name in manifest['payload']:
        if name not in manifest['base_files'] and source_path(base, name).exists():
            raise UpdateError(f'New patch file conflicts with an extra base file: {name}')
    stage = Path(tempfile.mkdtemp(prefix='.terrawave-m212-', dir=output.parent))
    try:
        for name in manifest['output_files']:
            origin = here / 'payload' if name in manifest['payload'] else base
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path(origin, name), target)
        verify(stage, manifest['output_files'], 'Reconstructed M2.12')
        verify(base, manifest['base_files'], 'M2.11 base after copy')
        if output.exists() or output.is_symlink():
            raise UpdateError('Output appeared during reconstruction; nothing overwritten')
        os.rename(stage, output)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return {'version': manifest['to_version'], 'output': str(output),
            'verified_files': len(manifest['output_files']), 'base_unchanged': True}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True, type=Path, help='Complete, unmodified M2.11 source directory')
    parser.add_argument('--output', required=True, type=Path, help='New output directory (must not exist)')
    args = parser.parse_args()
    try:
        result = build(args.base, args.output, Path(__file__).resolve().parent)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'Refused: {error}', file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    print('Open output/project.godot in Godot 4.7.2 and allow its first import to finish.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
