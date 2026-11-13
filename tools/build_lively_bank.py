"""Staged 1500-record release. Twelve pilots gate paid 100-record batches."""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from tools.lively_catalog import DOCS, ROOT, preflight, pilot_rows
from tools import build_commentary_bank as build

BANK = ROOT / 'assets/voices/lively_v3'
APPROVAL = DOCS / 'acceptance.json'


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)


def configure():
    build.BANK = BANK
    build.CATALOG = DOCS / 'catalog-1000.json'
    build.QC_OUTPUT = DOCS / 'qc.json'
    build.MAX_DURATION_SEC = 10


def prepare():
    rows = preflight()
    write_json(DOCS / 'catalog-1000.json', dict(version=1, records=rows))
    write_json(DOCS / 'pilot-selection.json', dict(ids=[r['id'] for r in pilot_rows()]))
    if not APPROVAL.exists():
        write_json(APPROVAL, dict(method='owner_sampled', voice_samples_accepted=False,
                                 delivery_samples=[], records=[]))
    return rows


def verify_pilots():
    approval = json.loads(APPROVAL.read_text())
    if approval.get('voice_samples_accepted') is not True or approval.get('method') != 'owner_sampled':
        raise ValueError('The owner must accept the twelve delivery samples first')
    accepted = {r['id']: r for r in approval.get('delivery_samples', [])}
    manifest = json.loads((BANK / 'manifest.json').read_text())
    staged = {r['id']: r for v in manifest['categories'].values() for r in v}
    for source in pilot_rows():
        row = staged[source['id']]
        if row.get('text_sha256') != source['text_sha256'] or row.get('tts_text') != source['tts_text']:
            raise ValueError('Pilot script or delivery changed: ' + row['id'])
        heard = accepted.get(row['id'], {})
        sha = hashlib.sha256((BANK / row['file']).read_bytes()).hexdigest()
        if not (heard.get('accepted') is True and heard.get('listened') is True
                and heard.get('sha256') == sha and row.get('automatic_qc_passed') is True):
            raise ValueError('Missing or changed pilot acceptance: ' + row['id'])


def estimate(rows):
    from config import settings
    from winky.fish_tts import FishAudioTTS
    engine = FishAudioTTS()
    try:
        pending = [r for r in rows if not engine.is_cached(r['tts_text'], r['lang'])]
        ledger = engine.root / 'budget.json'
        spent = json.loads(ledger.read_text()).get('reserved_usd', 0) if ledger.exists() else 0
        amount = sum(len(r['tts_text'].encode()) for r in pending) * 15 / 1_000_000
        result = dict(new_requests=len(pending), estimate_usd=round(amount, 6),
                      reserved_usd=spent, limit_usd=settings.FISHAUDIO_BUDGET_USD)
        if spent + amount > min(7, settings.FISHAUDIO_BUDGET_USD):
            raise ValueError('Approved cumulative $7 budget would be exceeded: ' + str(result))
        return result
    finally:
        engine._client.close()


def generate(pilots=False):
    rows = prepare()
    configure()
    if pilots:
        selected = pilot_rows()
    else:
        verify_pilots()
        manifest = json.loads((BANK / 'manifest.json').read_text())
        existing = {r['id'] for v in manifest['categories'].values() for r in v}
        selected = [r for r in rows if r['id'] not in existing][:100]
    if not selected:
        return {'complete': True}
    quote = estimate(selected)
    print(json.dumps(quote), flush=True)
    build.generate([r['id'] for r in selected])
    return quote


def review_page():
    import html
    manifest = json.loads((BANK / 'manifest.json').read_text())
    rows = [r for v in manifest['categories'].values() for r in v]
    cards = []
    for r in rows:
        sha = hashlib.sha256((BANK / r['file']).read_bytes()).hexdigest()
        cards.append(f'''<article data-id="{html.escape(r['id'])}" data-sha="{sha}">
<h3>{html.escape(r['id'])}</h3><p>{html.escape(r['text'])}</p>
<audio controls preload="none" src="../../../assets/voices/lively_v3/{html.escape(r['file'])}"></audio>
<label>Место хрипа, сек <input class="offset" type="number" min="0" step="0.1"></label>
<label>Заметка <input class="note" placeholder="Хрип, обрыв, неестественная подача"></label>
<button class="accept">Подходит</button><button class="reject">Дефект</button><span class="decision"></span></article>''')
    page = '''<!doctype html><meta charset="utf-8"><title>Winky: приёмка подачи</title>
<style>body{font:16px system-ui;background:#121521;color:#eef;max-width:950px;margin:auto;padding:24px}article{padding:18px;margin:12px 0;border:1px solid #667;border-radius:12px}audio{display:block;width:100%}button,input{font:inherit;margin:8px;padding:7px}label{display:block}</style>
<h1>Winky: прослушивание проб</h1><p>Прослушайте запись, затем отметьте качество. Звуки играют по одному. Решения привязаны к SHA256.</p>
<button id="export">Скачать решения</button>''' + '\n'.join(cards) + '''
<script>
const decisions={};
document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>document.querySelectorAll('audio').forEach(b=>{if(b!==a)b.pause()})));
document.querySelectorAll('article').forEach(a=>{
 let heard=false; a.querySelector('audio').addEventListener('ended',()=>heard=true);
 function decide(accepted){if(!heard){a.querySelector('.decision').textContent='Сначала прослушайте до конца';return;}
 decisions[a.dataset.id]={id:a.dataset.id,sha256:a.dataset.sha,accepted,listened:true,offset_sec:a.querySelector('.offset').value||null,note:a.querySelector('.note').value};
 a.querySelector('.decision').textContent=accepted?'Принято':'Отмечен дефект';}
 a.querySelector('.accept').onclick=()=>decide(true);a.querySelector('.reject').onclick=()=>decide(false);
});
document.getElementById('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({method:'owner_sampled',records:Object.values(decisions)},null,2)],{type:'application/json'}));a.download='winky-listening-decisions.json';a.click();URL.revokeObjectURL(a.href);};
</script>'''
    (DOCS / 'review.html').write_text(page)


def pilot_albums():
    import subprocess
    import tempfile
    manifest = json.loads((BANK / 'manifest.json').read_text())
    staged = {r['id']: r for v in manifest['categories'].values() for r in v}
    gap = DOCS / 'pilot-gap.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i',
                    'anullsrc=r=44100:cl=mono', '-t', '0.45', str(gap)], check=True)
    albums = []
    for lang in ('ru', 'en'):
        rows = [staged[r['id']] for r in pilot_rows() if r['lang'] == lang]
        revision = hashlib.sha256(''.join(r['sha256'] for r in rows).encode()).hexdigest()[:8]
        output = DOCS / f'pilot-{lang}-{revision}.wav'
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            pieces = []
            for index, row in enumerate(rows):
                wav = work / f'{index}.wav'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(BANK / row['file']),
                                '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', str(wav)], check=True)
                pieces.extend((wav, gap))
            playlist = work / 'concat.txt'
            playlist.write_text('\n'.join("file '" + str(p) + "'" for p in pieces) + '\n')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0',
                            '-i', str(playlist), '-c:a', 'pcm_s16le', str(output)], check=True)
        albums.append(dict(lang=lang, file=output.relative_to(ROOT).as_posix(),
                           sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                           records=[dict(id=r['id'], sha256=r['sha256'], text=r['text']) for r in rows]))
    gap.unlink()
    write_json(DOCS / 'pilot-albums.json', albums)


def import_decisions(path):
    incoming = json.loads(path.read_text())['records']
    manifest = json.loads((BANK / 'manifest.json').read_text())
    rows = {r['id']: r for v in manifest['categories'].values() for r in v}
    approval = json.loads(APPROVAL.read_text())
    records = {r['id']: r for r in approval.get('records', [])}
    for heard in incoming:
        row = rows[heard['id']]
        if hashlib.sha256((BANK / row['file']).read_bytes()).hexdigest() != heard['sha256'] or heard.get('listened') is not True:
            raise ValueError('Unverified decision: ' + heard['id'])
        records[heard['id']] = heard
    approval['records'] = list(records.values())
    pilot_ids = {r['id'] for r in pilot_rows()}
    approval['delivery_samples'] = [r for r in records.values() if r['id'] in pilot_ids]
    approval['voice_samples_accepted'] = pilot_ids.issubset(records) and all(
        records[i].get('accepted') is True for i in pilot_ids)
    write_json(APPROVAL, approval)


def activate():
    from winky.voice_bank import active_commentary_root, recording_reviewed
    from winky.voice_review import VoiceReview
    verify_pilots()
    verify_listening_shortlist()
    configure()
    staged = json.loads((BANK / 'manifest.json').read_text())
    if sum(len(v) for v in staged['categories'].values()) != 1000:
        raise ValueError('All 1000 new files must exist before activation')
    for group in staged['categories'].values():
        for row in group:
            if VoiceReview().blocked(row, BANK / row['file']):
                raise ValueError('Owner-excluded recording must be replaced: ' + row['id'])
    build.activate(APPROVAL)
    manifest = json.loads((BANK / 'manifest.json').read_text())
    if manifest['active_count'] != 1000:
        raise ValueError('All 1000 new files must pass before activation')
    old_root = active_commentary_root()
    if old_root == BANK:
        raise ValueError('Bank already active')
    old = json.loads((old_root / 'manifest.json').read_text())
    legacy = [r for v in old['categories'].values() for r in v]
    if len(legacy) != 500 or not all(recording_reviewed(old, r) for r in legacy):
        raise ValueError('Expected the accepted 500-record source bank')
    review = VoiceReview()
    replacement_path = DOCS / 'replacement-decisions.json'
    replacements = json.loads(replacement_path.read_text()) if replacement_path.exists() else []
    for r in legacy:
        src = old_root / r['file']
        if hashlib.sha256(src.read_bytes()).hexdigest() != r['sha256']:
            raise ValueError('Source recording changed after acceptance: ' + r['id'])
        if review.blocked(r, src):
            replacement = next((x for x in replacements if x['id'] == r['id']), None)
            if not replacement:
                raise ValueError('Replace and accept the excluded source recording first: ' + r['id'])
            new_path = (ROOT / replacement['file']).resolve()
            if (not new_path.is_relative_to((ROOT / 'assets/voices/lively_retakes').resolve())
                    or replacement.get('accepted') is not True or replacement.get('listened') is not True
                    or hashlib.sha256(new_path.read_bytes()).hexdigest() != replacement['sha256']):
                raise ValueError('Replacement acceptance must match the heard waveform')
            qc = json.loads(new_path.with_suffix('.qc.json').read_text())
            if qc.get('sha256') != replacement['sha256'] or qc.get('issues'):
                raise ValueError('Replacement QC failed')
            src = new_path
            r = dict(r, sha256=replacement['sha256'], duration=qc['metrics']['duration'],
                     transcript=qc['transcript'], auditory_verified=True, automatic_qc_passed=True)
        dst = BANK / 'preserved' / r['file']
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        row = dict(r, file=dst.relative_to(BANK).as_posix(), phrase_id=r.get('phrase_id', r['id']))
        if row['category'] == 'NARRATE_PAIR' and row['id'].rsplit('_', 1)[-1] in ('03', '05', '06', '08', '12', '14', '15', '16'):
            # Preserve the old audio, but keep jokes out of informational switches.
            row['delivery_role'] = 'banter'
        manifest['categories'].setdefault(r['category'], []).append(row)
    manifest.update(version='1.0', bank_type='commentary_v1', active_count=1500, activated=True)
    write_json(BANK / 'manifest.json', manifest)
    pointer = ROOT / 'assets/voices/commentary-bank.json'
    write_json(DOCS / 'previous-pointer.json', json.loads(pointer.read_text()))
    write_json(pointer, {'path': 'lively_v3'})


def verify_listening_shortlist():
    audit = json.loads((DOCS / 'live-audit.json').read_text())
    decisions = DOCS / 'live-listening.json'
    heard = json.loads(decisions.read_text()).get('records', []) if decisions.exists() else []
    replacements = DOCS / 'replacement-decisions.json'
    corrected = json.loads(replacements.read_text()) if replacements.exists() else []
    for row in audit['records']:
        if not row['listening_reasons']:
            continue
        if any(r['id'] == row['id'] and r.get('sha256') == row['metrics']['sha256']
               and r.get('accepted') is True and r.get('listened') is True for r in heard):
            continue
        if any(r['id'] == row['id'] and r.get('accepted') is True and r.get('listened') is True for r in corrected):
            continue
        raise ValueError('Listening shortlist not reviewed: ' + row['id'])


def retake(item_id, new_text=None):
    """One explicitly requested paid take; never overwrite an original or cache."""
    from winky.voice_bank import VoiceBank
    from winky.fish_tts import FishAudioTTS
    bank = VoiceBank()
    choices = []
    roots = [bank.overlay_root, bank.root]
    if item_id.startswith('lively3_') and (BANK / 'manifest.json').exists() and BANK not in roots:
        roots.append(BANK)
    for root in roots:
        manifest = json.loads((root / 'manifest.json').read_text())
        choices.extend(r for v in manifest['categories'].values() for r in v if r['id'] == item_id)
    if len(choices) != 1:
        raise ValueError('Expected exactly one source recording')
    source = choices[0]
    # New cache key from a new delivery request; originals remain untouched.
    row = dict(source)
    if new_text:
        row['text'] = new_text
        row['text_sha256'] = hashlib.sha256(new_text.encode()).hexdigest()
    row['tts_text'] = '[conversational] ' + row['text']
    estimate([row])
    engine = FishAudioTTS()
    try:
        cached = engine.get_cache_path(row['tts_text'], row['lang'])
        if cached.exists():
            raise ValueError('A retake already exists for review; no blind paid repeat')
        path = engine.synthesize(row['tts_text'], row['lang'])
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        out = ROOT / 'assets/voices/lively_retakes' / row['lang'] / (item_id + '-' + sha[:12] + '.mp3')
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, out)
        row.update(file=out.relative_to(ROOT).as_posix(), sha256=sha, phrase_id=source.get('phrase_id', source['id']),
                   request_payload=engine.payload(row['tts_text'], row['lang']),
                   auditory_verified=False, status='review_pending')
        write_json(out.with_suffix('.review.json'), row)
        print(json.dumps(dict(id=item_id, file=row['file'], sha256=sha)))
    finally:
        engine._client.close()


def qc_retakes():
    import difflib
    import subprocess
    import numpy as np
    from faster_whisper import WhisperModel
    from tools.audit_voice_bank import measure
    model = WhisperModel('small', device='cpu', compute_type='int8', download_root='/private/tmp/winky-models')
    for path in sorted((ROOT / 'assets/voices/lively_retakes').glob('*/*.review.json')):
        row = json.loads(path.read_text())
        audio = ROOT / row['file']
        metrics = measure(audio)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(audio), '-f', 'f32le', '-ar', '16000', '-ac', '1', 'pipe:1'],
                             capture_output=True, check=True).stdout
        segments, _ = model.transcribe(np.frombuffer(raw, dtype=np.float32), language=row['lang'], beam_size=3)
        transcript = ' '.join(s.text.strip() for s in segments)
        similarity = difflib.SequenceMatcher(None, build.normalize(row['text'], row['lang']), build.normalize(transcript, row['lang'])).ratio()
        issues = []
        if not metrics.get('decode_ok') or metrics.get('rms', 0) < .005: issues.append('decode_or_silence')
        if metrics.get('clipped_fraction', 0) > .001: issues.append('clipping')
        if metrics.get('duration', 99) > 10: issues.append('too_long')
        if similarity < .9: issues.append('transcript_mismatch')
        write_json(audio.with_suffix('.qc.json'), dict(sha256=metrics['sha256'], metrics=metrics,
            transcript=transcript, similarity=similarity, issues=issues, auditory_verified=False))
        print(row['id'], issues)


def accept_retakes(path):
    decisions = json.loads(path.read_text())['records']
    existing_path = DOCS / 'replacement-decisions.json'
    approved = json.loads(existing_path.read_text()) if existing_path.exists() else []
    registry_path = ROOT / 'assets/voices/recording-replacements.json'
    registry = json.loads(registry_path.read_text()) if registry_path.exists() else {}
    sources = [json.loads(p.read_text()) for p in (ROOT / 'assets/voices/lively_retakes').glob('*/*.review.json')]
    staged = json.loads((BANK / 'manifest.json').read_text()) if (BANK / 'manifest.json').exists() else None
    staged_changed = False
    for heard in decisions:
        row = next(r for r in sources if r['id'] == heard['id'] and r['sha256'] == heard['sha256'])
        audio = ROOT / row['file']
        qc = json.loads(audio.with_suffix('.qc.json').read_text())
        if (heard.get('accepted') is not True or heard.get('listened') is not True
                or hashlib.sha256(audio.read_bytes()).hexdigest() != heard['sha256'] or qc['issues']):
            raise ValueError('Retake requires clean QC and explicit listening acceptance')
        staged_row = next((r for v in staged['categories'].values() for r in v if r['id'] == row['id']), None) if staged else None
        if staged_row:
            staged_changed = True
            target = BANK / 'retakes' / audio.name
            target.parent.mkdir(exist_ok=True)
            shutil.copy2(audio, target)
            shutil.copy2(audio.with_suffix('.qc.json'), target.with_suffix('.qc.json'))
            staged_row.update(file=target.relative_to(BANK).as_posix(), sha256=row['sha256'],
                              text=row['text'], text_sha256=row['text_sha256'], tts_text=row['tts_text'],
                              request_payload=row['request_payload'],
                              transcript=qc['transcript'], duration=qc['metrics']['duration'],
                              automatic_qc_passed=True, status='review_pending')
            approval = json.loads(APPROVAL.read_text())
            approval['records'] = [r for r in approval['records'] if r['id'] != row['id']] + [heard]
            approval['delivery_samples'] = [r for r in approval['delivery_samples'] if r['id'] != row['id']]
            if row['id'] in {r['id'] for r in pilot_rows()}:
                approval['delivery_samples'].append(heard)
            write_json(APPROVAL, approval)
        else:
            approved = [r for r in approved if r['id'] != row['id']]
            approved.append(dict(heard, file=row['file']))
            from winky.voice_bank import active_root, active_commentary_root
            original = None
            for original_root in (active_root(), active_commentary_root()):
                original_manifest = json.loads((original_root / 'manifest.json').read_text())
                for group in original_manifest['categories'].values():
                    for record in group:
                        if record['id'] == row['id']:
                            original = original_root / record['file']
            if original is None:
                raise ValueError('Replacement has no active source identity')
            registry[row['id']] = dict(id=row['id'], source_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),
                file=row['file'], sha256=row['sha256'], text=row['text'], transcript=qc['transcript'],
                duration=qc['metrics']['duration'], accepted=True, listened=True, automatic_qc_passed=True)
    write_json(existing_path, approved)
    write_json(registry_path, registry)
    if staged_changed: write_json(BANK / 'manifest.json', staged)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('command', choices=('catalog', 'estimate', 'pilots', 'batch', 'qc', 'review', 'accept', 'activate', 'retake', 'qc-retakes', 'accept-retakes'))
    p.add_argument('--decisions', type=Path)
    p.add_argument('--id')
    p.add_argument('--text')
    a = p.parse_args()
    if a.command == 'catalog': prepare()
    elif a.command == 'estimate': print(json.dumps(estimate(preflight())))
    elif a.command in ('pilots', 'batch'): generate(a.command == 'pilots')
    elif a.command == 'qc': configure(); build.qc()
    elif a.command == 'review': review_page(); pilot_albums()
    elif a.command == 'accept': import_decisions(a.decisions)
    elif a.command == 'retake': retake(a.id, a.text)
    elif a.command == 'qc-retakes': qc_retakes()
    elif a.command == 'accept-retakes': accept_retakes(a.decisions)
    else: activate()


if __name__ == '__main__':
    main()
