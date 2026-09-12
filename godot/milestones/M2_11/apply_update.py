#!/usr/bin/env python3
import argparse, hashlib, json, shutil, sys
from pathlib import Path

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser(description='Apply TerraWave M2.11-dev navigation update to a complete M2.10R source tree.')
    ap.add_argument('--base',required=True)
    args=ap.parse_args()
    root=Path(args.base).resolve()
    here=Path(__file__).resolve().parent
    manifest=json.loads((here/'PATCH_MANIFEST.json').read_text())
    for rel,expected in manifest['required_base_sha256'].items():
        path=root/rel
        if not path.is_file(): raise SystemExit(f'Missing required M2.10R file: {rel}')
        actual=sha(path)
        if actual!=expected: raise SystemExit(f'Refusing modified/wrong base file: {rel}\nexpected {expected}\nactual   {actual}')
    for rel,meta in manifest['payload'].items():
        src=here/'payload'/rel
        if sha(src)!=meta['sha256']: raise SystemExit(f'Patch payload hash mismatch: {rel}')
    for rel in manifest['payload']:
        src=here/'payload'/rel; dst=root/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(src,dst)
    for rel,meta in manifest['payload'].items():
        if sha(root/rel)!=meta['sha256']: raise SystemExit(f'Post-copy verification failed: {rel}')
    print('TerraWave updated to 0.2.11-dev. Run the full native suite on this complete source tree.')
if __name__=='__main__': main()
