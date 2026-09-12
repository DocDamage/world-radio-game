#!/usr/bin/env python3
"""Run M2.12 radio/voyage checks with isolated profile, catalog and output paths."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--godot', required=True)
    parser.add_argument('--output', required=True, type=Path,
                        help='NEW output directory outside the project; real user profiles are never used')
    args = parser.parse_args()
    godot = shutil.which(args.godot) or args.godot
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents or output.exists():
        parser.error('Choose a new output directory outside the source tree')
    if not Path(godot).is_file():
        parser.error('Godot executable not found')
    version = subprocess.check_output([godot, '--version'], text=True, timeout=15).strip()
    if not version.startswith('4.7.2'):
        parser.error(f'Expected Godot 4.7.2; got {version}')
    if sys.platform.startswith('linux') and not shutil.which('xvfb-run'):
        parser.error('Rendered checks require xvfb-run on headless Linux')
    output.mkdir(parents=True)
    results = {}
    failures = []

    def run(name: str, script: str, prefix: str, render=False, tail=None, folder=None):
        directory = output / (folder or name)
        directory.mkdir(exist_ok=True)
        env = dict(os.environ, GODOT_SILENCE_ROOT_WARNING='1', LP_NUM_THREADS='4',
                   TERRAWAVE_PROFILE=str(directory/'profile.json'),
                   TERRAWAVE_CATALOG=str(directory/'catalog.json'),
                   TERRAWAVE_REGION_LIBRARY=str(directory/'library'),
                   TERRAWAVE_QA_OUTPUT=str(directory))
        command = [godot, '--audio-driver', 'Dummy', '--path', str(ROOT), '--script', script]
        if not render:
            command.insert(1, '--headless')
        elif sys.platform.startswith('linux'):
            command = ['xvfb-run', '-a', '-s', '-screen 0 1440x900x24'] + command
        if tail:
            command += ['--'] + tail
        log = output / f'{name}.log'
        try:
            with log.open('w', encoding='utf-8') as handle:
                result = subprocess.run(command, env=env, stdout=handle,
                                        stderr=subprocess.STDOUT, timeout=180)
            text = log.read_text(encoding='utf-8', errors='replace')
            engine_errors = any(s in text for s in ('SCRIPT ERROR:', '\nERROR:', 'ObjectDB instances were leaked'))
            lines = [s[len(prefix):] for s in text.splitlines() if s.startswith(prefix)]
            report = json.loads(lines[-1]) if lines else {}
            if result.returncode or engine_errors or not report or report.get('failed', 0):
                failures.append(name)
            results[name] = {'exit': result.returncode, 'unexpected_engine_errors': engine_errors, 'result': report}
        except (subprocess.TimeoutExpired, ValueError, OSError) as error:
            failures.append(name)
            results[name] = {'error': str(error)}
        print(name, 'FAIL' if name in failures else 'PASS', flush=True)

    run('regional', 'res://tests/test_regional_radio.gd', 'REGIONAL_RADIO_RESULT ')
    run('voyage', 'res://tests/test_voyage_navigation.gd', 'VOYAGE_NAVIGATION_RESULT ')
    restart = output/'restart'
    restart.mkdir()
    shutil.copy2(ROOT/'data/catalog.json', restart/'catalog.json')
    run('restart_seed', 'res://tests/test_m212_restart.gd', 'M212_RESTART_RESULT ',
        tail=['--seed'], folder='restart')
    run('restart_verify', 'res://tests/test_m212_restart.gd', 'M212_RESTART_RESULT ', folder='restart')
    run('native', 'res://tests/test_m212_native.gd', 'NATIVE_EARTH_RESULT ', render=True)
    summary = {'version': '0.2.12-dev', 'engine': version, 'failed_suites': failures,
               'checks': sum(row.get('result', {}).get('checks', 0) for row in results.values()),
               'suites': results, 'public_radio_audio_tested': False,
               'physical_devices_tested': False}
    (output/'radio-voyages-summary.json').write_text(json.dumps(summary, indent=2)+'\n', encoding='utf-8')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
