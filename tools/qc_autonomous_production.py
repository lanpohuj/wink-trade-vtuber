"""Local, waveform-bound production QC. Never buys speech or approves delivery."""
import argparse
import difflib
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,ORDER,DOCS
from tools.audit_voice_bank import measure,normalize
from tools.autonomous_voice_probe import save


def qc(only_ids=None):
    import numpy as np
    from faster_whisper import WhisperModel
    manifest=json.loads((BANK/'manifest.json').read_text())
    if manifest.get('activated'):raise ValueError('Do not rewrite an active bank')
    source={r['id']:r for r in json.loads(ORDER.read_text())['records']}
    rows=[r for group in manifest['categories'].values() for r in group]
    if set(source)!={r['id'] for r in rows} or len(rows)!=len(source):raise ValueError('Incomplete production bank')
    model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,download_root='/private/tmp/winky-models')
    checked={};reports=[]
    previous_path=DOCS/'autonomous-production-qc-v1.json'
    previous={r['id']:r for r in json.loads(previous_path.read_text())['records']} if only_ids else {}
    for row in rows:
        if row['text_sha256']!=source[row['id']]['text_sha256']:raise ValueError('Changed text')
        path=BANK/row['file'];digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest!=row['sha256']:raise ValueError('Changed waveform')
        if only_ids and row['id'] not in only_ids:
            prior=previous[row['id']]
            if prior['sha256']!=digest:raise ValueError('Unselected waveform changed')
            reports.append(prior)
            continue
        strict=row['category'].startswith('OPEN_')
        key=(digest,row['text_sha256'],strict)
        if key not in checked:
            metrics=measure(path)
            pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ar','16000','-ac','1','pipe:1'])
            data=np.frombuffer(pcm,dtype=np.float32)
            segments,_=model.transcribe(data,language='ru',beam_size=5,condition_on_previous_text=False,word_timestamps=True)
            parts=[dict(start=s.start,end=s.end,text=s.text,words=[dict(start=w.start,end=w.end,word=w.word,probability=w.probability) for w in s.words or []]) for s in segments]
            transcript=' '.join(s['text'].strip() for s in parts)
            ratio=difflib.SequenceMatcher(None,normalize(row['text']),normalize(transcript)).ratio()
            issues=[]
            if not metrics['decode_ok'] or metrics['rms']<.005:issues.append('decode_or_silence')
            maximum=min(row.get('max_duration_sec',15),2.5 if strict else 15)
            if metrics['duration']>maximum:issues.append('too_long')
            if metrics['clipped_fraction']>.001:issues.append('possible_clipping')
            if ratio<(1 if strict else .9):issues.append('strict_direction_mismatch' if strict else 'transcript_mismatch')
            words=[word for part in parts for word in part['words']]
            speech_end=max((w['end'] for w in words),default=metrics['duration'])
            tail=data[int((speech_end+.25)*16000):]
            tail_rms=float(np.sqrt(np.mean(tail*tail))) if len(tail) else 0
            tail_peak=float(np.max(np.abs(tail))) if len(tail) else 0
            if metrics['duration']-speech_end>.65 and (tail_rms>.015 or tail_peak>.25):issues.append('post_speech_audio')
            checked[key]=dict(sha256=digest,expected=row['text'],transcript=transcript,similarity=round(ratio,3),
                metrics=metrics,segments=parts,tail_rms=round(tail_rms,5),tail_peak=round(tail_peak,5),issues=issues,
                auditory_verified=False)
        report={**checked[key],'id':row['id']};reports.append(report)
        row.update(automatic_qc_passed=not report['issues'],transcript=report['transcript'])
        save(path.with_suffix('.qc.json'),report)
        print('production_qc',len(reports),row['id'],report['issues'],flush=True)
    save(BANK/'manifest.json',manifest)
    result=dict(version=1,records=reports,checked_recording_slots=len(rows),unique_waveforms=len({r['sha256'] for r in reports}),
                failed=sum(bool(r['issues']) for r in reports),paid_asr_requests=0,auditory_review_complete=False)
    save(DOCS/'autonomous-production-qc-v1.json',result)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--only-failed',action='store_true');args=parser.parse_args()
    failed=[r['id'] for r in json.loads((DOCS/'autonomous-production-qc-v1.json').read_text())['records'] if r['issues']] if args.only_failed else None
    qc(failed)
