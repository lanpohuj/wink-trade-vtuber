"""Verify or restore only avatar files from the checked local backup. Never touches Git or trading code."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import tarfile
import tempfile


def restore(backup: Path, apply=False):
    root=Path(__file__).resolve().parent.parent
    manifest=json.loads((backup/'backup.json').read_text())
    archive=backup/'avatar-before.tgz'
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=manifest['archive_sha256']:
        raise ValueError('Backup archive checksum mismatch')
    allowed={'winky/app.py','winky/tts.py','winky/chat_router.py','winky/director.py','winky/voice_bank.py','winky/scenarios.py'}
    with tempfile.TemporaryDirectory() as tmp:
        with tarfile.open(archive) as t:t.extractall(tmp,filter='data')
        for name,digest in manifest['files'].items():
            target=(root/name).resolve()
            if not target.is_relative_to(root) or not (name.startswith('winky/web/') or name in allowed):
                raise ValueError('Unexpected restore destination')
            src=Path(tmp)/name
            if hashlib.sha256(src.read_bytes()).hexdigest()!=digest:raise ValueError('Corrupt backup file: '+name)
        if apply:
            for name in manifest['files']:
                dest=root/name;dest.parent.mkdir(parents=True,exist_ok=True)
                staged=dest.with_suffix(dest.suffix+'.restore-tmp');shutil.copy2(Path(tmp)/name,staged);staged.replace(dest)
    return {'verified_files':len(manifest['files']),'restored':bool(apply),'original_commit':manifest['commit']}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('backup',type=Path);p.add_argument('--restore',action='store_true')
    a=p.parse_args();print(json.dumps(restore(a.backup,a.restore)))
