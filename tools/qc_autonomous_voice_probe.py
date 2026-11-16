"""Local decode/metrics/Whisper QC. Never calls paid transcription or approves delivery."""
import difflib
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from tools.audit_voice_bank import measure, normalize
from tools.autonomous_voice_probe import FREE_BANK as BANK, DOCS


def main():
    import numpy as np
    from faster_whisper import WhisperModel
    manifest=json.loads((BANK/'manifest.json').read_text())
    rows=sorted([r for group in manifest['categories'].values() for r in group],key=lambda r:r['id'])
    if len(rows)!=8 or not manifest.get('evaluation_only') or manifest.get('activated'):
        raise ValueError('Expected eight inactive evaluation recordings')
    model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,download_root='/private/tmp/winky-models')
    reports=[]
    for row in rows:
        path=BANK/row['file'];metrics=measure(path)
        pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ar','16000','-ac','1','pipe:1'])
        segments,_=model.transcribe(np.frombuffer(pcm,dtype=np.float32),language='ru',beam_size=5,condition_on_previous_text=False)
        parts=[dict(start=s.start,end=s.end,text=s.text) for s in segments]
        transcript=' '.join(s['text'].strip() for s in parts)
        ratio=difflib.SequenceMatcher(None,normalize(row['text']),normalize(transcript)).ratio()
        issues=[]
        if not metrics['decode_ok'] or metrics['rms']<.005:issues.append('decode_or_silence')
        if metrics['duration']>row.get('max_duration_sec',15):issues.append('too_long')
        if metrics['clipped_fraction']>.001:issues.append('possible_clipping')
        if ratio<.9:issues.append('asr_mismatch_needs_listening')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:issues.append('sha256_mismatch')
        reports.append(dict(id=row['id'],sha256=row['sha256'],text=row['text'],transcript=transcript,
                            similarity=round(ratio,3),metrics=metrics,segments=parts,issues=issues,auditory_verified=False))
        row.update(automatic_qc_passed=not issues,transcript=transcript,requires_listening=row.get('owner_listened') is not True)
        print(json.dumps(dict(id=row['id'],similarity=round(ratio,3),issues=issues),ensure_ascii=False),flush=True)
    (DOCS/'autonomous-voice-probe-free-qc.json').write_text(json.dumps(dict(model='faster-whisper-small-local',
        paid_asr_requests=0,auditory_review_complete=False,records=reports),ensure_ascii=False,indent=2)+'\n')
    (BANK/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':main()
