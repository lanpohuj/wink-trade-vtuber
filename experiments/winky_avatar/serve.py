"""Read-only avatar laboratory. Never starts the bot, SpeechController or TikTok."""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import re
import tarfile
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BACKUP = ROOT / 'artifacts/avatar-backups/20261114-140151'
SNAPSHOT = HERE / '.runtime/baseline'


def prepare_snapshot():
    info = json.loads((BACKUP / 'backup.json').read_text())
    archive = BACKUP / 'avatar-before.tgz'
    if hashlib.sha256(archive.read_bytes()).hexdigest() != info['archive_sha256']:
        raise RuntimeError('Backup archive checksum mismatch')
    SNAPSHOT.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as tar:
        for name, expected in info['files'].items():
            # Extract only declared regular files, never symlinks or arbitrary paths.
            target = (SNAPSHOT / name).resolve()
            if not target.is_relative_to(SNAPSHOT.resolve()):
                raise RuntimeError('Invalid archive path')
            member = tar.getmember(name)
            if member.issym():
                linked = (Path(name).parent / member.linkname).as_posix()
                if linked not in info['files']:
                    raise RuntimeError('Undeclared archive symlink target')
                member = tar.getmember(linked)
            if not member.isfile():
                raise RuntimeError('Non-regular backup member')
            payload = tar.extractfile(member).read()
            if hashlib.sha256(payload).hexdigest() != expected:
                raise RuntimeError(f'Backup member checksum mismatch: {name}')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
    return info


def build_library():
    # Read only active banks. Do not instantiate VoiceBank: the live rotation and
    # acceptance history must never be written by this laboratory.
    voice_root = ROOT / 'assets/voices'
    def read_json(path, default):
        try:
            return json.loads(path.read_text())
        except (OSError, ValueError):
            return default
    defects = read_json(ROOT / 'voice_cache/speech-review/defects.json', [])
    replacements = read_json(voice_root / 'recording-replacements.json', {})
    base = voice_root / 'lumean'
    overlay = voice_root / 'commentary_v1'
    for pointer, fallback, is_overlay in [('active-bank.json', base, False), ('commentary-bank.json', overlay, True)]:
        selected = fallback
        try:
            candidate = (voice_root / json.loads((voice_root / pointer).read_text())['path']).resolve()
            if candidate.is_relative_to(voice_root.resolve()):
                manifest = json.loads((candidate / 'manifest.json').read_text())
                if not is_overlay or (manifest.get('activated') is True and manifest.get('review_accepted') is True and manifest.get('bank_type') == 'commentary_v1'):
                    selected = candidate
        except (OSError, ValueError, KeyError, TypeError):
            pass
        if is_overlay:
            overlay = selected
        else:
            base = selected
    rows, audio, seen = [], {}, set()
    for bank in [overlay, base]:
        manifest = json.loads((bank / 'manifest.json').read_text())
        eligibility = read_json(bank / 'legacy-eligibility.json', {})
        for category, records in manifest.get('categories', {}).items():
            for source_record in records:
                record = dict(source_record)
                record.update(eligibility.get(record['id'], {}))
                sampled = (manifest.get('review_method') == 'owner_sampled' and manifest.get('review_accepted') is True
                           and record.get('review_method') == 'owner_sampled' and record.get('review_accepted') is True
                           and record.get('automatic_qc_passed') is True and record.get('text_version', 1) <= 1)
                reviewed = record.get('auditory_verified') is True or sampled
                if bank == overlay and (not reviewed or not (record.get('automatic_qc_passed') is True or record.get('qc_override_accepted') is True)):
                    continue
                path = (bank / record.get('file', '')).resolve()
                key = f'{bank.name}:{record["id"]}'
                if key in seen or not path.is_relative_to(bank.resolve()) or not path.is_file() or record.get('status', 'ready') != 'ready':
                    continue
                replacement = replacements.get(record['id'], {})
                if replacement:
                    alternate = (ROOT / replacement.get('file', '')).resolve()
                    if (alternate.is_relative_to((voice_root / 'lively_retakes').resolve()) and alternate.is_file()
                            and all(replacement.get(k) is True for k in ['accepted', 'listened', 'automatic_qc_passed'])
                            and hashlib.sha256(alternate.read_bytes()).hexdigest() == replacement.get('sha256')
                            and hashlib.sha256(path.read_bytes()).hexdigest() == replacement.get('source_sha256')):
                        path = alternate
                        record.update({k: replacement[k] for k in ['text', 'duration'] if k in replacement})
                excluded = [r for r in defects if r.get('status') == 'excluded'
                            and (r.get('id') == record['id'] or r.get('path') == str(path))]
                if excluded and any(r.get('sha256') == hashlib.sha256(path.read_bytes()).hexdigest() for r in excluded):
                    continue
                seen.add(key)
                rows.append({k: record.get(k) for k in ['text', 'lang', 'duration', 'conditions', 'tone', 'auditory_verified']}
                            | dict(id=key, category=category, bank=bank.name, audio=f'/audio/{len(rows)}', review='owner_sampled' if sampled else 'legacy_or_individual'))
                audio[f'/audio/{len(rows)-1}'] = path
    return rows, audio


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_error(405)

    def do_GET(self):
        route = unquote(urlsplit(self.path).path)
        path = None
        if route == '/library.json':
            return self.reply(json.dumps(self.server.library, ensure_ascii=False).encode(), 'application/json')
        if route == '/health':
            return self.reply(json.dumps({'isolated': True, 'snapshot_sha256': self.server.info['archive_sha256'], 'recordings': len(self.server.library)}).encode(), 'application/json')
        if route == '/frame.html':
            candidate = 'candidate=1' in urlsplit(self.path).query
            html = (SNAPSHOT / 'winky/web/avatar.html').read_text()
            html = re.sub(r'<script type="module" src="[^"]*avatar.js[^"]*"></script>', '', html)
            # Remove the obsolete cache tokens, then load the untouched baseline.
            html = html.replace('</body>', '''<script type="module">
import '/avatar.js';
while (!window.vtuber) await new Promise(r => setTimeout(r, 50));
window.addEventListener('message', e => {
 if(e.origin!==location.origin||e.source!==parent||e.data?.scope!=='winky-avatar-lab')return;
 const m=e.data;
 if(new URLSearchParams(location.search).get('candidate')==='1')return;
 if(m.type==='begin'){window.winkySpeak('',m.event.emotion||'happy',0);}
 if(m.type==='clock')window.setAvatarSpeechVolume(m.rms);
 if(m.type==='end')window.setAvatarSpeechVolume(0);
 if(m.type==='legacy')m.action==='wave'?window.winkyWave():window.winkyTriggerAction(m.action,3.2);
 if(m.type==='cancel'){vtuber.actionMode=null;vtuber.actionTimer=0;vtuber.waveTimer=0;vtuber.speechHoldTimer=0;vtuber.currentEmotion='idle';window.setAvatarSpeechVolume(0);}
 if(m.type==='park'){vtuber.actionMode=null;vtuber.actionTimer=0;vtuber.waveTimer=0;vtuber.speechHoldTimer=0;vtuber.currentEmotion='idle';vtuber.idleFlirtTimer=Infinity;window.setAvatarSpeechVolume(0);}
});
if (CANDIDATE) await import('/candidate.mjs');
window.labReady=true;
parent.postMessage({scope:'winky-avatar-lab',type:'ready',candidate:CANDIDATE},location.origin);
</script></body>'''.replace('CANDIDATE', 'true' if candidate else 'false'))
            return self.reply(html.encode(), 'text/html; charset=utf-8')
        if route in self.server.audio:
            path = self.server.audio[route]
        elif route == '/':
            path = HERE / 'index.html'
        elif route in ['/candidate.mjs', '/policy.mjs', '/ui.mjs', '/motion-tracks.mjs', '/extra-motions.mjs']:
            path = HERE / route[1:]
        else:
            static = (SNAPSHOT / 'winky/web' / route.lstrip('/')).resolve()
            if static.is_relative_to((SNAPSHOT / 'winky/web').resolve()):
                path = static
        if path is None or not path.is_file():
            return self.send_error(404)
        return self.reply(path.read_bytes(), mimetypes.guess_type(path)[0] or 'application/octet-stream')

    def reply(self, payload, content_type):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8794)
    parser.add_argument('--open', action='store_true', help='Open the isolated comparison in a browser')
    args = parser.parse_args()
    info = prepare_snapshot()
    if args.open:
        try:
            with urlopen(f'http://127.0.0.1:{args.port}/health', timeout=1) as response:
                health = json.load(response)
            if health.get('isolated') is True and health.get('snapshot_sha256') == info['archive_sha256']:
                webbrowser.open(f'http://127.0.0.1:{args.port}')
                return
        except (OSError, ValueError):
            pass
    library, audio = build_library()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.info, server.library, server.audio = info, library, audio
    print(f'Winky avatar laboratory: http://127.0.0.1:{args.port} ({len(library)} local recordings)', flush=True)
    if args.open:
        threading.Timer(.3, lambda: webbrowser.open(f'http://127.0.0.1:{args.port}')).start()
    server.serve_forever()


if __name__ == '__main__':
    main()
