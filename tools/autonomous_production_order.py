"""Exact 76-card production order. Paid generation requires hash-bound spend approval."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_voice_probe import DOCS, MARIN, FREE_BANK, save
from tools import build_commentary_bank as build
from tools.autonomous_voice_probe import verify_approval as verify_probe_approval
from winky.fish_tts import FishAudioTTS
from winky.editorial import approved
from winky.speech_rotation import fingerprint
from tools.autonomous_direction_probe import BANK_V3, TEXTS

ORDER=DOCS/'autonomous-production-order-v1.json'
QUOTE=DOCS/'autonomous-production-quote-v1.json'
BANK=ROOT/'assets/voices/autonomous_v1'
MAX_NEW_USD=.10
PRICING='https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits'


class ProductionTTS(FishAudioTTS):
    def payload(self,text,lang):
        payload=super().payload(text,lang)
        if lang=='ru' and re.sub(r'^\[[^]]+\]\s*','',text) in TEXTS:
            payload.update(temperature=.72,latency='normal')
            payload['prosody']['speed']=1.0
        return payload


def direction_delivery_accepted():
    path=BANK_V3/'manifest.json'
    if not path.exists():return False
    manifest=json.loads(path.read_text());rows=[r for group in manifest['categories'].values() for r in group]
    return (len(rows)==4 and {r['text'] for r in rows}==set(TEXTS) and all(
        r.get('owner_listened') is True and r.get('auditory_verified') is True and r.get('review_accepted') is True
        and hashlib.sha256((BANK_V3/r['file']).read_bytes()).hexdigest()==r['sha256'] for r in rows))


def delivery(row):
    purpose=row['purpose'];identity=row['id']
    if purpose.startswith('direction_'):
        path=BANK_V3/'manifest.json'
        if path.exists():
            manifest=json.loads(path.read_text())
            matches=[r for group in manifest['categories'].values() for r in group if r['text']==row['text']]
            if len(matches)==1:return matches[0]['delivery']
        return 'conversational'
    if purpose=='win':return 'conversational' if identity.endswith('_08') else 'excited'
    if purpose=='loss':return 'conversational' if identity.endswith(('_03','_06','_09')) else 'annoyed'
    if purpose=='refund':return 'conversational'
    if purpose=='search_interest':return 'curious, conversational'
    if purpose=='observation':return 'curious' if identity.endswith('_01') else 'hopeful'
    if purpose=='chat_greeting' or purpose=='social':return 'happy'
    return 'conversational'


def prepare():
    if (BANK/'manifest.json').exists():raise ValueError('Preserve an existing production order and bank')
    source=DOCS/'autonomous-bank-runtime.json';runtime=json.loads(source.read_text())
    references=json.loads((FREE_BANK/'manifest.json').read_text())
    accepted=[r for group in references['categories'].values() for r in group if r.get('review_accepted') is True]
    if len(accepted)!=6:raise ValueError('The six accepted delivery references are required')
    for r in accepted:
        if not r.get('auditory_verified') or hashlib.sha256((FREE_BANK/r['file']).read_bytes()).hexdigest()!=r['sha256']:
            raise ValueError('Changed accepted delivery reference')
    rows=[]
    for old in runtime['records']:
        if not approved(old['text']):raise ValueError('Text approval missing')
        tag=delivery(old);row={**old,'voice_id':MARIN,'tts_text':f'[{tag}] '+old['text'],
            'delivery_tag':tag,'max_duration_sec':min(15,old.get('ttl_sec',15)),
            'auditory_verified':False,'scene_review_accepted':False}
        if row.get('existing_audio'):
            preserved=ROOT/row['existing_audio']['path']
            if hashlib.sha256(preserved.read_bytes()).hexdigest()!=row['existing_audio']['sha256']:
                raise ValueError('Changed existing approved audio')
        rows.append(row)
    save(ORDER,dict(version=1,activated=False,paid_generation_authorized=False,records=rows,
        runtime_source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        delivery_references=[dict(id=r['id'],sha256=r['sha256'],text=r['text']) for r in accepted]))
    return quote()


def quote():
    from config import settings
    engine=ProductionTTS()
    try:
        if engine.voices['ru']!=MARIN:raise ValueError('RU voice changed')
        rows=json.loads(ORDER.read_text())['records']
        runtime={r['id']:r for r in json.loads((DOCS/'autonomous-bank-runtime.json').read_text())['records']}
        for r in rows:
            if r['text_sha256']!=runtime[r['id']]['text_sha256'] or not approved(r['text']):raise ValueError('Order text changed')
        # Identical direction slots share one exact audio payload; aliases do not add diversity or charges.
        unique={json.dumps(engine.payload(r['tts_text'],'ru'),sort_keys=True,ensure_ascii=False):r
                for r in rows if not r.get('existing_audio')}
        requests=[dict(id=r['id'],payload=engine.payload(r['tts_text'],'ru')) for r in unique.values()]
        pending=[r for r in unique.values() if not engine.is_cached(r['tts_text'],'ru')]
        byte_count=sum(len(engine.payload(r['tts_text'],'ru')['text'].encode()) for r in pending)
        spent=json.loads((engine.root/'budget.json').read_text())['reserved_usd']
        estimate=round(byte_count*15/1e6,6)
        result=dict(version=1,order_sha256=hashlib.sha256(ORDER.read_bytes()).hexdigest(),cards=len(rows),
                    distinct_texts=len({r['text'] for r in rows}),preserved=sum(bool(r.get('existing_audio')) for r in rows),
                    new_requests=len(pending),cached=len(requests)-len(pending),utf8_bytes=byte_count,
                    estimate_usd=estimate,max_new_usd=MAX_NEW_USD,reserved_usd=spent,cumulative_limit_usd=settings.FISHAUDIO_BUDGET_USD,
                    fits_cumulative_limit=spent+estimate<=settings.FISHAUDIO_BUDGET_USD,
                    model='s2.1-pro',voice_id=MARIN,pricing_source=PRICING,requests=requests,
                    direction_delivery_accepted=direction_delivery_accepted(),
                    status='awaiting_spend_approval' if direction_delivery_accepted() else 'held_for_direction_delivery_review')
        save(QUOTE,result)
        lines=['# Винки: конкретный заказ рабочего пилота RU','',
               'Заказ удерживается до принятия новых четырёх направлений. Предыдущая проба отклонена владельцем; платного разрешения нет.','',
               f"76 карточек / {result['distinct_texts']} разных текстов. Сохраняем {result['preserved']} уже принятых MP3; новых платных запросов {result['new_requests']}, готовых платных файлов в кеше {result['cached']}.",'',
               f"Смета ${estimate:.6f}; предлагаемый максимальный новый расход ${MAX_NEW_USD:.2f}. Это отдельный заказ: платный запуск ещё не разрешён. [Тариф Fish Audio]({PRICING}).",'',
               'Марин, s2.1-pro; .82 / .85, speed 1.06, balanced, 44.1 кГц. Шесть принятых бесплатных дублей служат образцами исполнения и не выдаются за принятые платные файлы. Четыре направления исправлены точными словами владельца. После генерации выполняются QC, разметка прежних жестов и репетиция; автоматического включения в эфир нет.','',
               'Для четырёх направлений отдельно: conversational, temperature .72, speed 1.0, latency normal. Двенадцать слотов используют четыре записи; одинаковые копии не считаются разнообразием и не оплачиваются повторно.','',
               f"SHA256 заказа: `{result['order_sha256']}`.",'','| ID | Точный текст | Тег | Источник |','|---|---|---|---|']
        for r in rows:lines.append(f"| {r['id']} | {r['text']} | {r['delivery_tag']} | {'Сохранённый принятый MP3' if r.get('existing_audio') else 'Новый дубль'} |")
        (DOCS/'autonomous-production-order-v1.md').write_text('\n'.join(lines)+'\n')
        return result
    finally:engine._client.close()


def verify_approval(approval,current):
    # Reuse the tested cumulative-budget arithmetic, with this order's own cap.
    if approval.get('order_sha256')!=current['order_sha256']:
        raise ValueError('Approval for this exact production order is required')
    verify_probe_approval({**approval,'catalog_sha256':approval['order_sha256']},
        {**current,'catalog_sha256':current['order_sha256']},max_new_usd=MAX_NEW_USD)


def generate(approval_path):
    if not direction_delivery_accepted():
        raise ValueError('The four replacement direction takes still require owner delivery acceptance')
    current=quote();verify_approval(json.loads(approval_path.read_text()),current)
    order=json.loads(ORDER.read_text());rows=order['records'];manifest_path=BANK/'manifest.json'
    existing=json.loads(manifest_path.read_text()) if manifest_path.exists() else dict(version='1.0',bank_type='commentary_v1',activated=False,categories={})
    by_id={r['id']:r for group in existing['categories'].values() for r in group}
    if existing.get('activated'):raise ValueError('Never regenerate an active bank')
    new=[]
    for r in rows:
        prior=by_id.get(r['id'])
        if r.get('existing_audio'):
            source=ROOT/r['existing_audio']['path']
            if hashlib.sha256(source.read_bytes()).hexdigest()!=r['existing_audio']['sha256']:raise ValueError('Preserved audio changed')
            target=BANK/'ru'/r['category']/(r['id']+'.mp3')
            if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=r['existing_audio']['sha256']:
                raise ValueError('Never overwrite a preserved file')
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
            by_id[r['id']]={**r,'file':target.relative_to(BANK).as_posix(),'sha256':r['existing_audio']['sha256'],
                'duration':build.media_duration_seconds(target),'status':'ready','auditory_verified':True,
                'owner_listened':True,'review_accepted':True,'review_basis':'existing_owner_accepted_exact_sha256'}
        else:
            if prior and (prior.get('owner_listened') or prior.get('auditory_verified')):
                raise ValueError('Owner-reviewed audio needs a new ID for any retake')
            new.append(r['id'])
    existing['categories']={}
    for row in by_id.values():existing['categories'].setdefault(row['category'],[]).append(row)
    save(manifest_path,existing)
    previous=build.BANK,build.CATALOG,build.MAX_DURATION_SEC,build.FishAudioTTS
    try:
        build.BANK,build.CATALOG,build.MAX_DURATION_SEC=BANK,ORDER,15
        build.FishAudioTTS=ProductionTTS
        build.generate(only_ids=new)
    finally:build.BANK,build.CATALOG,build.MAX_DURATION_SEC,build.FishAudioTTS=previous


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=('prepare','quote','generate'))
    parser.add_argument('--approval',type=Path);args=parser.parse_args()
    if args.action=='generate':
        if not args.approval:parser.error('--approval is required')
        generate(args.approval)
    else:
        result=prepare() if args.action=='prepare' else quote()
        print(json.dumps({k:v for k,v in result.items() if k!='requests'}))
