"""Signal evidence and cached ASR for every currently eligible local recording.

Noise/flux rankings are a listening shortlist, never a diagnosis of hoarseness.
"""
from __future__ import annotations
import argparse
import concurrent.futures
import difflib
import hashlib
import html
import json
import subprocess
from pathlib import Path
import numpy as np
from tools.audit_voice_bank import measure
from tools.build_commentary_bank import normalize
from tools.lively_catalog import DOCS, ROOT


def live_rows():
    from winky.voice_bank import VoiceBank
    bank = VoiceBank()
    found = {}
    for root in (bank.root, bank.overlay_root):
        if not root:
            continue
        manifest = json.loads((root / 'manifest.json').read_text())
        for category, rows in manifest['categories'].items():
            for row in rows:
                event = dict(category=category, lang=row.get('lang', 'ru'), **row.get('conditions', {}))
                for eligible in bank.candidates(event):
                    found[str(eligible['path'])] = dict(eligible, category=category)
    return list(found.values())


def inspect(row):
    path = Path(row['path'])
    metrics = measure(path)
    result = {k: v for k, v in row.items() if k != 'path'}
    result.update(path=str(path), metrics=metrics, auditory_verified=False, listening_reasons=[])
    if not metrics.get('decode_ok'):
        result['listening_reasons'].append('decode_failed')
        return result
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le',
                          '-ar', '16000', '-ac', '1', 'pipe:1'], capture_output=True, check=True).stdout
    pcm = np.frombuffer(raw, dtype=np.float32)
    frames = np.lib.stride_tricks.sliding_window_view(pcm, 320)[::160]
    rms = np.sqrt(np.mean(frames ** 2, axis=1))
    voiced = rms > max(.008, float(np.max(rms)) * .08)
    spec = np.abs(np.fft.rfft(frames * np.hanning(320), axis=1)) ** 2
    freqs = np.fft.rfftfreq(320, 1 / 16000)
    ratio = spec[:, freqs >= 4000].sum(axis=1) / np.maximum(spec.sum(axis=1), 1e-12)
    crossings = np.mean(np.diff(np.signbit(frames), axis=1), axis=1)
    rms_diff = np.abs(np.diff(rms))
    pop_at = int(np.argmax(rms_diff)) if len(rms_diff) else 0
    metrics.update(high_frequency_ratio=round(float(np.mean(ratio[voiced])), 5) if voiced.any() else 0,
                   zero_crossing_rate=round(float(np.mean(crossings[voiced])), 5) if voiced.any() else 0,
                   largest_rms_jump=round(float(np.max(rms_diff)), 5) if len(rms_diff) else 0,
                   candidate_offset_sec=round(pop_at * .01, 2))
    if metrics['clipped_fraction'] > .001:
        result['listening_reasons'].append('clipping')
    if metrics['leading_silence'] > .8 or metrics['trailing_silence'] > 1:
        result['listening_reasons'].append('long_silence')
    if metrics['rms'] < .005:
        result['listening_reasons'].append('very_quiet')
    saved = path.with_suffix('.qc.json')
    qc = json.loads(saved.read_text()) if saved.exists() else {}
    result['transcript'] = qc.get('transcript') if qc.get('sha256') == metrics['sha256'] else row.get('transcript')
    result['transcript_source'] = 'hash_verified_qc' if qc.get('sha256') == metrics['sha256'] else 'manifest_pending_refresh'
    return result


def audit():
    rows = live_rows()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        reports = list(pool.map(inspect, rows))
    # Compare voices separately. Roughness cannot be inferred from these values.
    for lang in ('ru', 'en'):
        group = [r for r in reports if r['lang'] == lang and r['metrics'].get('decode_ok')]
        for feature in ('high_frequency_ratio', 'zero_crossing_rate', 'largest_rms_jump'):
            values = np.array([r['metrics'][feature] for r in group])
            median = np.median(values)
            scale = max(float(np.median(np.abs(values - median))) * 1.4826, .0001)
            for row in group:
                z = (row['metrics'][feature] - median) / scale
                row.setdefault('listening_rank', 0)
                row['listening_rank'] = round(max(row['listening_rank'], float(z)), 3)
                if z >= 3.5:
                    row['listening_reasons'].append('signal_outlier:' + feature)
    missing_asr = [r for r in reports if r['metrics'].get('decode_ok') and r['transcript_source'] != 'hash_verified_qc']
    if missing_asr:
        from faster_whisper import WhisperModel
        model = WhisperModel('small', device='cpu', compute_type='int8', download_root='/private/tmp/winky-models')
        for row in missing_asr:
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', row['path'], '-f', 'f32le',
                                  '-ar', '16000', '-ac', '1', 'pipe:1'], capture_output=True, check=True).stdout
            segments, _ = model.transcribe(np.frombuffer(raw, dtype=np.float32), language=row['lang'], beam_size=3)
            row['transcript'] = ' '.join(s.text.strip() for s in segments)
            row['transcript_source'] = 'fresh_whisper'
    for row in reports:
        if row.get('transcript'):
            row['text_similarity'] = round(difflib.SequenceMatcher(None, normalize(row['text'], row['lang']),
                                            normalize(row['transcript'], row['lang'])).ratio(), 3)
            if row['text_similarity'] < .9:
                row['listening_reasons'].append('transcript_mismatch')
    reports.sort(key=lambda r: (bool(r['listening_reasons']), r.get('listening_rank', 0)), reverse=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    (DOCS / 'live-audit.json').write_text(json.dumps(dict(auditory_review_complete=False,
         warning='Signal outliers are a listening shortlist, not confirmed hoarseness.', records=reports), ensure_ascii=False, indent=2) + '\n')
    cards = []
    for r in reports:
        src = '../../../' + Path(r['path']).relative_to(ROOT).as_posix()
        cards.append(f'<article data-id="{html.escape(r["id"])}" data-sha="{r["metrics"].get("sha256", "")}"><h3>{html.escape(r["id"])}</h3><p>{html.escape(r["text"])}</p>'
                     f'<p>{html.escape(", ".join(r["listening_reasons"]) or "Без автоматических замечаний")}</p>'
                     f'<p>Место для проверки: {r["metrics"].get("candidate_offset_sec", 0)} сек; SHA256 {r["metrics"].get("sha256", "")}</p>'
                     f'<audio controls preload="none" src="{html.escape(src)}"></audio>'
                     '<input class="offset" type="number" min="0" step="0.1" placeholder="Место хрипа, сек"><input class="note" placeholder="Что не так">'
                     '<button class="accept">Подходит</button><button class="reject">Дефект</button><span class="decision"></span></article>')
    (DOCS / 'live-review.html').write_text('''<!doctype html><meta charset="utf-8"><title>Winky: аудит действующих записей</title>
<style>body{font:16px system-ui;max-width:950px;margin:auto;background:#121521;color:#eef;padding:24px}article{border:1px solid #667;padding:16px;margin:10px 0}audio{width:100%}</style>
<h1>Действующие записи: очередь прослушивания</h1><p>Сначала подозрительные по метрикам. Это не подтверждённый хрип. Прослушайте запись и отметьте качество; решения скачиваются отдельно.</p><button id="export">Скачать решения</button>'''
        + '\n'.join(cards) + '''<script>
const decisions={};
document.querySelectorAll('audio').forEach(a=>a.onplay=()=>document.querySelectorAll('audio').forEach(b=>{if(a!==b)b.pause()}));
document.querySelectorAll('article').forEach(a=>{
 let heard=false;a.querySelector('audio').addEventListener('ended',()=>heard=true);
 function decide(accepted){if(!heard){a.querySelector('.decision').textContent='Сначала прослушайте запись';return;}
 decisions[a.dataset.id]={id:a.dataset.id,sha256:a.dataset.sha,accepted,listened:true,offset_sec:a.querySelector('.offset').value||null,note:a.querySelector('.note').value};
 a.querySelector('.decision').textContent=accepted?'Подходит':'Отмечен дефект';}
 a.querySelector('.accept').onclick=()=>decide(true);a.querySelector('.reject').onclick=()=>decide(false);
});
document.getElementById('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({records:Object.values(decisions)},null,2)],{type:'application/json'}));a.download='winky-live-listening.json';a.click();URL.revokeObjectURL(a.href);};
</script>''')
    print(json.dumps(dict(eligible=len(reports), flagged=sum(bool(r['listening_reasons']) for r in reports), fresh_asr=len(missing_asr))))


def import_decisions(path):
    from winky.voice_review import VoiceReview
    decisions = json.loads(path.read_text())['records']
    rows = {r['id']: r for r in json.loads((DOCS / 'live-audit.json').read_text())['records']}
    for decision in decisions:
        row = rows[decision['id']]
        if decision.get('listened') is not True or hashlib.sha256(Path(row['path']).read_bytes()).hexdigest() != decision['sha256']:
            raise ValueError('Listening decision does not match the current recording')
    for decision in decisions:
        if decision.get('accepted') is False:
            VoiceReview().report(rows[decision['id']], decision.get('note') or 'Owner-reported defect', decision.get('offset_sec'))
    (DOCS / 'live-listening.json').write_text(json.dumps(dict(records=decisions), ensure_ascii=False, indent=2))


def listening_albums():
    import tempfile
    from tools.build_lively_bank import write_json
    rows = [r for r in json.loads((DOCS / 'live-audit.json').read_text())['records'] if r['listening_reasons']]
    albums = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        gap = work / 'gap.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
                        '-t', '0.5', str(gap)], check=True)
        for lang in ('ru', 'en'):
            group = [r for r in rows if r['lang'] == lang]
            for batch, start in enumerate(range(0, len(group), 8), 1):
                playlist, index, elapsed = [], [], 0.0
                for n, row in enumerate(group[start:start + 8], 1):
                    # Decode each recording first: old files may use a different
                    # MP3 format. A listening album must not introduce artifacts.
                    wav = work / f'{lang}-{batch}-{n}.wav'
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', row['path'], '-ar', '44100', '-ac', '1', str(wav)], check=True)
                    duration = float(row['metrics']['duration'])
                    index.append(dict(number=n, id=row['id'], sha256=row['metrics']['sha256'],
                                      at_sec=round(elapsed, 3), duration=duration, path=row['path']))
                    elapsed += duration + .5
                    playlist.extend((wav, gap))
                listing = work / 'concat.txt'
                listing.write_text('\n'.join("file '" + str(p) + "'" for p in playlist))
                out = DOCS / f'listening-{lang}-{batch}.wav'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing),
                                '-c:a', 'pcm_s16le', str(out)], check=True)
                albums.append(dict(lang=lang, batch=batch, file=out.relative_to(ROOT).as_posix(), records=index))
    write_json(DOCS / 'listening-albums.json', albums)
    print(json.dumps(dict(albums=len(albums), records=len(rows))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--decisions', type=Path)
    parser.add_argument('--albums', action='store_true')
    args = parser.parse_args()
    if args.albums:
        listening_albums()
    elif args.decisions:
        import_decisions(args.decisions)
    else:
        audit()
