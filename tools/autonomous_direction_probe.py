"""Four exact owner direction edits, separate free evaluation files, no paid fallback."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from decimal import Decimal

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_voice_probe import EvaluationTTS, DOCS, MARIN, save
from tools.build_commentary_bank import media_duration_seconds
from winky.editorial import approved

BANK=ROOT/'assets/voices/autonomous_direction_probe_free_v2'
BANK_V3=ROOT/'assets/voices/autonomous_direction_probe_free_v3'
TEXTS=('Открыла вверх.','Зашла вверх.','Открыла вниз.','Зашла вниз.')
KIND='autonomous_direction_delivery_review_v2'


class ClearDirectionTTS(EvaluationTTS):
    def payload(self,text,lang):
        payload=super().payload(text,lang)
        payload.update(temperature=.72,latency='normal')
        payload['prosody']['speed']=1.0
        return payload


def records(version=2):
    if version not in (2,3):raise ValueError('Unknown probe version')
    source=json.loads((DOCS/'autonomous-bank-ru-approved.json').read_text())['records']
    rows=[]
    for i,text in enumerate(TEXTS,1):
        row=next(r for r in source if r['text']==text)
        if not approved(text) or not row.get('text_review_accepted'):
            raise ValueError('Direction edit is not accepted')
        tag=('confident' if i%2 else 'conversational') if version==2 else 'conversational'
        rows.append(dict(id=f'autonomous_direction_free_v{version}_ru_{i:02}',source_id=row['id'],text=text,
                         tts_text=f'[{tag}] {text}',text_sha256=hashlib.sha256(text.encode()).hexdigest(),
                         lang='ru',category=row['category'],voice_id=MARIN,delivery=tag,
                         max_duration_sec=5,requires_listening=True,auditory_verified=False,
                         evaluation_only=True,status='review_pending'))
    return rows


def snapshot(engine):
    values={}
    for name in ('api-credit','package'):
        response=engine._client.get(engine.BASE_URL+'/wallet/self/'+name,headers=engine._headers())
        response.raise_for_status()
        data=response.json()
        values[name]=str(Decimal(data['credit'])) if name=='api-credit' else data
    ledger=ROOT/'voice_cache/fish_direct/budget.json'
    values['ledger_sha256']=hashlib.sha256(ledger.read_bytes()).hexdigest()
    return values


def generate(version=2):
    expected=records(version);engine=EvaluationTTS() if version==2 else ClearDirectionTTS()
    bank=BANK if version==2 else BANK_V3
    path=bank/'manifest.json'
    manifest=json.loads(path.read_text()) if path.exists() else dict(version='1.0',activated=False,
        evaluation_only=True,model='s2.1-pro-free',categories={},new_paid_requests=0,paid_fallback=False)
    existing={r['id']:r for group in manifest['categories'].values() for r in group}
    try:
        if engine.voices['ru']!=MARIN:raise ValueError('RU voice changed')
        before=snapshot(engine)
        for row in expected:
            prior=existing.get(row['id'])
            if prior:
                media=bank/prior['file']
                if (prior['text_sha256']!=row['text_sha256'] or prior['tts_text']!=row['tts_text']
                        or not media.is_file() or hashlib.sha256(media.read_bytes()).hexdigest()!=prior['sha256']):
                    raise ValueError('Existing evaluation file changed; never overwrite it')
                continue
            audio=engine.synthesize(row['tts_text'],'ru')
            target=bank/'ru'/row['category']/(row['id']+'.mp3')
            if target.exists():raise ValueError('Never overwrite an existing evaluation waveform')
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(audio,target)
            existing[row['id']]={**row,'file':target.relative_to(bank).as_posix(),
                'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'duration':media_duration_seconds(target),
                'request_payload':engine.payload(row['tts_text'],'ru'),'model':'s2.1-pro-free','estimated_usd':0}
            manifest['categories']={}
            for item in existing.values():manifest['categories'].setdefault(item['category'],[]).append(item)
            save(path,manifest)
            print('free_direction_staged',row['id'],flush=True)
        after=snapshot(engine)
        proof=dict(api_credit_unchanged=before['api-credit']==after['api-credit'],
                   package_credit_unchanged=before['package']==after['package'],
                   paid_ledger_unchanged=before['ledger_sha256']==after['ledger_sha256'],
                   new_paid_requests=0,evaluation_only=True)
        name='autonomous-direction-free-cost-check.json' if version==2 else 'autonomous-direction-free-v3-cost-check.json'
        save(DOCS/name,proof)
        print(json.dumps(proof))
    finally:engine._client.close()


def import_verdict(path,version=2):
    from tools.import_conversation_voice_review import import_review
    bank=BANK if version==2 else BANK_V3
    return import_review(path,bank=bank,docs=DOCS,kind=KIND if version==2 else 'autonomous_direction_delivery_review_v3',
                         review_filename=f'owner-autonomous-direction-voice-review-v{version}.json')


def retake_v3(identity,tag):
    if tag not in ('conversational','confident'):raise ValueError('Unsupported retake delivery')
    path=BANK_V3/'manifest.json';manifest=json.loads(path.read_text())
    found=[(group,r) for group in manifest['categories'].values() for r in group if r['id']==identity]
    if len(found)!=1:raise ValueError('Unknown active direction take')
    group,old=found[0]
    if old.get('owner_listened') or old.get('auditory_verified'):raise ValueError('Never replace owner-listened audio')
    archive=manifest.setdefault('superseded_evaluation_takes',[])
    new_id=identity+'_retake'+str(1+len(archive));target=BANK_V3/'ru'/old['category']/(new_id+'.mp3')
    if target.exists():raise ValueError('Retake already exists')
    engine=ClearDirectionTTS()
    try:
        if engine.voices['ru']!=MARIN:raise ValueError('RU voice changed')
        before=snapshot(engine);tts_text=f'[{tag}] '+old['text'];audio=engine.synthesize(tts_text,'ru')
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(audio,target)
        new={**old,'id':new_id,'tts_text':tts_text,'delivery':tag,'file':target.relative_to(BANK_V3).as_posix(),
             'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'duration':media_duration_seconds(target),
             'request_payload':engine.payload(tts_text,'ru'),'status':'review_pending','auditory_verified':False,
             'retake_reason':'strict_short_phrase_asr_mismatch','supersedes_audio_id':identity}
        new.pop('transcript',None);new.pop('automatic_qc_passed',None)
        group[group.index(old)]=new
        archive.append({**old,'automatic_qc_passed':False,'status':'superseded_technical_mismatch',
                        'retake_reason':'strict_short_phrase_asr_mismatch'})
        save(path,manifest)
        after=snapshot(engine)
        save(DOCS/'autonomous-direction-v3-retake-cost-check.json',dict(api_credit_unchanged=before['api-credit']==after['api-credit'],
             package_credit_unchanged=before['package']==after['package'],paid_ledger_unchanged=before['ledger_sha256']==after['ledger_sha256'],new_paid_requests=0))
        print('free_direction_retake_staged',new_id)
    finally:engine._client.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=('generate','qc','import-review','retake-v3'))
    parser.add_argument('--id');parser.add_argument('--tag',choices=('conversational','confident'))
    parser.add_argument('--review',type=Path);parser.add_argument('--version',type=int,choices=(2,3),default=2);args=parser.parse_args()
    if args.action=='retake-v3':
        if not args.id or not args.tag:parser.error('--id and --tag required')
        retake_v3(args.id,args.tag)
    elif args.action=='generate':generate(args.version)
    elif args.action=='qc':
        from tools.qc_autonomous_voice_probe import qc_bank
        bank=BANK if args.version==2 else BANK_V3
        output=DOCS/('autonomous-direction-free-qc.json' if args.version==2 else 'autonomous-direction-free-v3-qc.json')
        qc_bank(bank,output,4,text_similarity_min=1)
    elif args.review:print(json.dumps(import_verdict(args.review,args.version)))
    else:parser.error('--review is required')
