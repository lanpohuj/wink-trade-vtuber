"""Eight accepted lines with contextual delivery, using the existing budgeted Fish adapter."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path
import sys
from datetime import datetime, timezone, date

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from tools import build_commentary_bank as build
from winky.editorial import approved
from winky.fish_tts import FishAudioTTS

DOCS=ROOT/'docs/voice-audit/conversation-v1'
SOURCE=DOCS/'autonomous-bank-ru-approved.json'
CATALOG=DOCS/'autonomous-voice-probe-8.json'
BANK=ROOT/'assets/voices/autonomous_voice_probe_v1'
FREE_BANK=ROOT/'assets/voices/autonomous_voice_probe_free_v1'
MARIN='1db1618b6eaf4571ac7db70e20eb6727'
RATE=15
MAX_NEW_USD=.03
SLOTS=(
 ('autonomous_ru_win_02','excited','Живая радость, коротко и без крика.'),
 ('autonomous_ru_loss_01','annoyed','Лёгкая досада, без саркастической лекции.'),
 ('autonomous_ru_refund_01','relieved','Короткое облегчение.'),
 ('autonomous_ru_direction_buy_01','confident','Короткий уверенный акцент.'),
 ('autonomous_ru_direction_sell_01','confident','Короткий уверенный акцент.'),
 ('autonomous_ru_search_interest_02','curious, conversational','Разговорное любопытство, как у выбранных образцов.'),
 ('autonomous_ru_chat_greeting_02','happy','Живое приветствие, как в старых записях пульта.'),
 ('autonomous_ru_bot_03','conversational','Короткое естественное напоминание.')
)


class EvaluationTTS(FishAudioTTS):
    """Explicit free model, separate cache, no paid fallback or production budget changes."""
    def __init__(self):
        super().__init__()
        self.root=ROOT/'voice_cache/autonomous_probe_free_v1'
        self.root.mkdir(parents=True,exist_ok=True)

    def _headers(self):
        if datetime.now(timezone.utc).date()>date(2026,11,30):
            raise ValueError('Free offer must be reverified before more evaluation requests')
        return {**super()._headers(),'model':'s2.1-pro-free'}

    def _budget(self,amount,refund=False):
        return None  # This endpoint is priced at $0; never touch the paid ledger.

    def synthesize(self,*args,**kwargs):
        result=super().synthesize(*args,**kwargs)
        metadata=result.with_suffix('.metadata.json')
        data=json.loads(metadata.read_text())
        data.update(model='s2.1-pro-free',estimated_usd=0,evaluation_only=True)
        save(metadata,data)
        return result


def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')


def make_records(source):
    by_id={r['id']:r for r in source['records']}
    rows=[]
    for index,(identity,delivery,description) in enumerate(SLOTS,1):
        if identity not in by_id:
            raise ValueError('Archived probe text was revised; prepare a new order instead: '+identity)
        original=by_id[identity]
        if not original.get('text_review_accepted') or original['status']!='text_approved':
            raise ValueError('Text not accepted: '+identity)
        rows.append(dict(id=f'autonomous_voice_probe_ru_{index:02}',source_id=identity,lang='ru',category=original['category'],
                         text=original['text'],text_sha256=original['text_sha256'],tts_text=f'[{delivery}] '+original['text'],
                         delivery=delivery,delivery_description=description,voice_id=MARIN,text_version=1,
                         text_review_accepted=True,auditory_verified=False,requires_listening=True,
                         conditions={},max_duration_sec=15,source_purpose=original['purpose'],
                         delivery_reference_ids=['streamer2_ru_narrate_scan_01','lively3_ru_narrate_engage_009'],
                         historical_reference_catalog='legacy-delivery-references.json'))
    return rows


def prepare():
    if (BANK/'manifest.json').exists():
        raise ValueError('Probe exists already; preserve it instead of silently changing the order')
    rows=make_records(json.loads(SOURCE.read_text()))
    save(CATALOG,dict(version=1,status='awaiting_spend_approval',activated=False,records=rows))
    return rows


def validate(rows):
    expected=make_records(json.loads(SOURCE.read_text()))
    if rows!=expected:
        raise ValueError('Probe differs from the accepted text and delivery order')
    for row in rows:
        if not approved(row['text']) or hashlib.sha256(row['text'].encode()).hexdigest()!=row['text_sha256']:
            raise ValueError('Text approval missing, revoked or changed: '+row['id'])


def estimate():
    from config import settings
    rows=json.loads(CATALOG.read_text())['records'];validate(rows)
    engine=FishAudioTTS()
    try:
        reference=json.loads((DOCS/'delivery-references.json').read_text())['references'][0]['request_payload']
        if engine.voices['ru']!=MARIN:
            raise ValueError('The selected RU voice is no longer Marin')
        tuning=engine.get_tuning('ru')
        for key in ('temperature','top_p','latency','sample_rate','normalize'):
            if tuning[key]!=reference[key]:raise ValueError('Reference tuning changed: '+key)
        if tuning['speed']!=reference['prosody']['speed'] or tuning['normalize_volume']!=reference['prosody']['normalize_loudness']:
            raise ValueError('Reference prosody changed')
        pending=[r for r in rows if not engine.is_cached(r['tts_text'],'ru')]
        requests=[dict(id=r['id'],payload=engine.payload(r['tts_text'],'ru')) for r in rows]
        byte_count=sum(len(engine.payload(r['tts_text'],'ru')['text'].encode()) for r in pending)
        ledger=engine.root/'budget.json';spent=json.loads(ledger.read_text())['reserved_usd'] if ledger.exists() else 0
        amount=round(byte_count*RATE/1_000_000,6)
        return dict(version=1,catalog_sha256=hashlib.sha256(CATALOG.read_bytes()).hexdigest(),takes=len(rows),
                    new_requests=len(pending),cached=len(rows)-len(pending),utf8_bytes=byte_count,
                    estimate_usd=amount,suggested_max_new_usd=MAX_NEW_USD,reserved_usd=round(spent,6),
                    cumulative_limit_usd=settings.FISHAUDIO_BUDGET_USD,fits_cumulative_limit=spent+amount<=settings.FISHAUDIO_BUDGET_USD,
                    rate_usd_per_million_utf8_bytes=RATE,pricing_source='https://fish.audio/app/developers/',
                    model='s2.1-pro',voice_id=MARIN,requests=requests)
    finally:
        engine._client.close()


def verify_approval(approval,quote,*,max_new_usd=MAX_NEW_USD):
    if approval.get('approved') is not True or approval.get('catalog_sha256')!=quote['catalog_sha256']:
        raise ValueError('Approval for this exact eight-line order is required')
    cap=float(approval.get('max_new_usd',0));baseline=float(approval.get('baseline_reserved_usd',float('nan')))
    if not math.isfinite(cap) or not math.isfinite(baseline) or baseline<0 or not 0<cap<=max_new_usd:
        raise ValueError('Invalid approval spending limit or baseline')
    used=max(0,quote['reserved_usd']-baseline)
    if used+quote['estimate_usd']>cap+1e-9 or not quote['fits_cumulative_limit']:
        raise ValueError('Approved or existing cumulative budget exceeded')


def generate(approval_path):
    # Never overwrite a listened take, even if its manifest was lost.
    paths=list(BANK.glob('*/*/*.review.json'))
    if (BANK/'manifest.json').exists():paths.append(BANK/'manifest.json')
    for path in paths:
        data=json.loads(path.read_text())
        records=[r for group in data['categories'].values() for r in group] if 'categories' in data else [data]
        if any(r.get('owner_listened') or r.get('auditory_verified') for r in records):
            raise ValueError('Reviewed audio is immutable; new takes need new IDs')
    quote=estimate();verify_approval(json.loads(approval_path.read_text()),quote)
    previous=build.BANK,build.CATALOG,build.MAX_DURATION_SEC
    try:
        build.BANK,build.CATALOG,build.MAX_DURATION_SEC=BANK,CATALOG,15
        build.generate()
    finally:
        build.BANK,build.CATALOG,build.MAX_DURATION_SEC=previous


def generate_free(only_ids=None):
    """Only evaluation files; a failed free request never invokes the paid generator."""
    rows=json.loads(CATALOG.read_text())['records'];validate(rows)
    if only_ids and not set(only_ids).issubset(r['id'] for r in rows):
        raise ValueError('Unknown probe ID')
    engine=EvaluationTTS();FREE_BANK.mkdir(parents=True,exist_ok=True)
    path=FREE_BANK/'manifest.json'
    manifest=json.loads(path.read_text()) if path.exists() else dict(version='1.0',bank_type='commentary_v1',
        activated=False,evaluation_only=True,model='s2.1-pro-free',categories={},paid_fallback=False,new_paid_cost_usd=0)
    existing={r['source_probe_id']:r for group in manifest['categories'].values() for r in group}
    try:
        if engine.voices['ru']!=MARIN:raise ValueError('RU voice changed')
        for row in rows:
            if only_ids and row['id'] not in only_ids:continue
            prior=existing.get(row['id'])
            if prior:
                target=FREE_BANK/prior['file']
                if (prior.get('text_sha256')!=row['text_sha256'] or prior.get('tts_text')!=row['tts_text']
                        or not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest()!=prior['sha256']):
                    raise ValueError('Existing evaluation take changed; preserve it and use a new ID')
                continue
            media=engine.synthesize(row['tts_text'],'ru')
            identity=row['id'].replace('autonomous_voice_probe_ru_','autonomous_voice_probe_free_ru_')
            relative=f"ru/{row['category']}/{identity}.mp3"
            target=FREE_BANK/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(media,target)
            record={**row,'id':identity,'source_probe_id':row['id'],'file':relative,
                    'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'duration':build.media_duration_seconds(target),
                    'status':'review_pending','model':'s2.1-pro-free','evaluation_only':True,
                    'request_payload':engine.payload(row['tts_text'],'ru'),'estimated_usd':0,'auditory_verified':False}
            existing[row['id']]=record
            manifest['categories']={}
            for entry in existing.values():manifest['categories'].setdefault(entry['category'],[]).append(entry)
            save(path,manifest)
            print('evaluation_staged',identity,round(record['duration'],3),flush=True)
    finally:
        engine._client.close()


def retake_free(identity,delivery):
    rows=json.loads(CATALOG.read_text())['records'];validate(rows)
    source=next((r for r in rows if r['id']==identity),None)
    if source is None or delivery not in ('conversational','excited','confident','relieved','happy'):
        raise ValueError('Unknown source or delivery')
    path=FREE_BANK/'manifest.json';manifest=json.loads(path.read_text())
    group=manifest['categories'][source['category']]
    old=next(r for r in group if r['source_probe_id']==identity)
    if old.get('owner_listened') or old.get('auditory_verified'):
        raise ValueError('Do not replace a listened take')
    archive=manifest.setdefault('superseded_evaluation_takes',[])
    number=1+sum(r['source_probe_id']==identity for r in archive)
    new_id=identity.replace('autonomous_voice_probe_ru_','autonomous_voice_probe_free_ru_')+f'_retake{number:02}'
    target=FREE_BANK/'ru'/source['category']/(new_id+'.mp3')
    if target.exists():raise ValueError('Retake file already exists; preserve it')
    engine=EvaluationTTS()
    try:
        if engine.voices['ru']!=MARIN:raise ValueError('RU voice changed')
        text=f'[{delivery}] '+source['text'];audio=engine.synthesize(text,'ru')
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(audio,target)
        record={**source,'id':new_id,'source_probe_id':identity,'delivery':delivery,'tts_text':text,
                'file':target.relative_to(FREE_BANK).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
                'duration':build.media_duration_seconds(target),'status':'review_pending','model':'s2.1-pro-free',
                'evaluation_only':True,'request_payload':engine.payload(text,'ru'),'estimated_usd':0,'auditory_verified':False,
                'retake_reason':'uncertain_local_asr','previous_take_id':old['id']}
        group[group.index(old)]=record;archive.append(old);save(path,manifest)
        print('evaluation_retake_staged',new_id,flush=True)
    finally:
        engine._client.close()


def order():
    quote=estimate();save(DOCS/'autonomous-voice-probe-quote.json',quote)
    rows=json.loads(CATALOG.read_text())['records']
    lines=['# Винки: голосовая проба по принятому банку','',
           '76 текстовых карточек приняты; четыре заготовленных вопроса исключены. Повторный отбор текста не требуется. Следующий шаг — проверить подачу восьми функциональных типов голосом Марин, прежде чем озвучивать весь банк.','',
           f"Смета: ${quote['estimate_usd']:.6f}; предлагаемый предел новых расходов — ${MAX_NEW_USD:.2f}. Новых запросов: {quote['new_requests']}; из кеша: {quote['cached']}. Тариф: $15 за миллион UTF-8 байтов, [Fish Audio]({quote['pricing_source']}).",'',
           'Голос: Марин. Модель s2.1-pro; temperature 0.82, top_p 0.85, speed 1.06, latency balanced, MP3 44,1 кГц / 128 кбит/с. Разные эмоции задаются текстовыми тегами; глобальные настройки не меняются. Совпадение параметров не гарантирует принятия интонации.','',
           '| № | Принятый текст | Подача |','|---|---|---|']
    for i,row in enumerate(rows,1):lines.append(f"| {i} | {row['text']} | {row['delivery_description']} |")
    lines+=['','Сравнение ведётся с двумя выбранными образцами и историческими записями пульта/резерва. Уже принятые MP3 сохраняются без перегенерации. После создания: декодирование, длительность, технические метрики, локальное распознавание и одна подборка для оценки голоса. Для проверки движений используются только прежние жесты.','',
            'Проба создаётся отдельной неактивной версией. Новые записи не получают отметку личного прослушивания агентом и не включаются в эфир автоматически.','',
            'Подтверждение расходов пока не получено. Исходный план владельца: «До платной генерации согласовать конкретные записи и стоимость». Предыдущее разрешение на десять других дублей сюда не переносится.','',
            f"SHA256 конкретного заказа: `{quote['catalog_sha256']}`."]
    if (FREE_BANK/'manifest.json').exists():
        free=json.loads((FREE_BANK/'manifest.json').read_text())
        active=[r for group in free['categories'].values() for r in group]
        lines=['# Винки: созданная бесплатная проба голоса','',
               '76 текстовых карточек приняты, четыре вопроса исключены. Восемь новых основных дублей созданы отдельно для оценки подачи голосом Марин.','',
               'Режим: s2.1-pro-free, та же S2.1 Pro для разработки и оценки. Расход $0.00; платный запасной запуск отсутствует. Никакие глобальные параметры голоса не изменялись. [Описание Fish Audio](https://fish.audio/blog/s2-1-pro-free-api/).','',
               f"Основных дублей: {len(active)}; дополнительных вариантов по неуверенному распознаванию: {len(free.get('superseded_evaluation_takes',[]))}. Первые версии сохранены.",'',
               'Подборка: `autonomous-voice-probe-listening.mp3`. Оценка по отдельным файлам: `autonomous-voice-probe-review.html`. Распознавание и технические метрики не заменяют прослушивание владельцем.','',
               'Файлы имеют пометку evaluation_only и исключены из рабочего выбора даже после оценки голоса. Для выпуска банка в эфир используется отдельная принятая версия; до платной генерации согласуются её конкретный состав и стоимость.','',
               '| Проба | Принятый текст | Тег подачи |','|---|---|---|']
        for r in sorted(active,key=lambda r:r['source_probe_id']):
            lines.append(f"| {r['source_probe_id'].rsplit('_',1)[1]} | {r['text']} | {r['delivery']} |")
    (DOCS/'autonomous-voice-probe-order.md').write_text('\n'.join(lines)+'\n')
    return quote


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=('prepare','quote','generate','generate-free','retake-free'))
    parser.add_argument('--approval',type=Path)
    parser.add_argument('--only-id',action='append')
    parser.add_argument('--delivery')
    args=parser.parse_args()
    if args.action=='prepare':prepare()
    if args.action=='retake-free':
        if not args.only_id or len(args.only_id)!=1 or not args.delivery:parser.error('One --only-id and --delivery required')
        retake_free(args.only_id[0],args.delivery)
    elif args.action=='generate-free':
        generate_free(args.only_id)
    elif args.action=='generate':
        if not args.approval:parser.error('--approval is required')
        generate(args.approval)
    else:
        q=order();print(json.dumps({k:v for k,v in q.items() if k!='requests'},ensure_ascii=False))
