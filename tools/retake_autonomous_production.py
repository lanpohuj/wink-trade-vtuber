"""One targeted paid replacement per failed waveform, within the existing order cap."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS,ProductionTTS,quote,verify_approval,direction_delivery_accepted
from tools.autonomous_voice_probe import save
from winky.tts import media_duration_seconds
from tools.autonomous_voice_probe import MARIN


def retake(clear_remaining=False):
    approval=json.loads((DOCS/'owner-autonomous-production-spend-approval-v1.json').read_text())
    current=quote();verify_approval(approval,current)
    if not direction_delivery_accepted():raise ValueError('Direction references not accepted')
    path=BANK/'manifest.json';manifest=json.loads(path.read_text())
    if manifest.get('activated'):raise ValueError('Never retake an active bank')
    reports=json.loads((DOCS/'autonomous-production-qc-v1.json').read_text())['records']
    rows=[r for group in manifest['categories'].values() for r in group]
    failed={r['sha256'] for r in reports if r['issues']}
    engine=ProductionTTS()
    try:
        if engine.voices['ru']!=MARIN:raise ValueError('RU voice changed since approval')
        for digest in sorted(failed):
            aliases=[r for r in rows if r['sha256']==digest]
            if not aliases:raise ValueError('Missing failed waveform')
            if any(r.get('owner_listened') or r.get('auditory_verified') or r.get('review_accepted') for r in aliases):
                raise ValueError('Never retake reviewed audio under the same card')
            row=aliases[0];tts_text=row['tts_text']
            if clear_remaining:
                if row['text']=='Открыла вверх.':tts_text='[confident] '+row['text']
                elif row['text']=='А-а, досадно!':tts_text='[conversational] '+row['text']
                else:raise ValueError('No directed delivery revision for this remaining phrase')
                if row.get('audio_take',1)>=3:raise ValueError('Stop repeated retakes; require listening')
            payload=engine.payload(tts_text,'ru')
            amount=len(payload['text'].encode())*15/1e6
            spent=json.loads((engine.root/'budget.json').read_text())['reserved_usd']
            if spent-approval['baseline_reserved_usd']+amount>approval['max_new_usd']+1e-9:
                raise ValueError('No room inside the approved new-spend cap')
            number=1+max(r.get('audio_take',1) for r in aliases)
            target=BANK/'ru'/row['category']/(row['id']+f'_take{number}.mp3')
            if target.exists():raise ValueError('A replacement file already exists; preserve it')
            audio=engine.synthesize(tts_text,'ru',bypass_cache=True)
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(audio,target)
            new_sha=hashlib.sha256(target.read_bytes()).hexdigest()
            for alias in aliases:
                manifest.setdefault('superseded_recordings',[]).append(dict(alias))
                alias.update(file=target.relative_to(BANK).as_posix(),sha256=new_sha,duration=media_duration_seconds(target),
                    status='review_pending',automatic_qc_passed=False,auditory_verified=False,audio_take=number,
                    supersedes_sha256=digest,retake_reason='directed_delivery_for_remaining_asr_failure' if clear_remaining else 'targeted_local_qc_failure',
                    tts_text=tts_text,request_payload=payload)
                alias.pop('transcript',None)
                (BANK/'ru'/alias['category']/(alias['id']+'.review.json')).write_text(json.dumps(alias,ensure_ascii=False,indent=2)+'\n')
            save(path,manifest)
            print('production_retake',row['id'],'aliases',len(aliases),flush=True)
    finally:engine._client.close()


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--clear-remaining',action='store_true')
    retake(parser.parse_args().clear_remaining)
