"""Prepare 80 Russian recording cards and a local text review; no TTS or activation."""
import hashlib
import json
from pathlib import Path
import sys
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from winky.editorial import approved, decisions
from winky.speech_rotation import fingerprint

OUT=ROOT/'docs/voice-audit/conversation-v1'


def build():
    groups=[
      ('win','TRADE_WIN',[
       'Плюс! Ну, это было вкусно!', 'Да-а! Вот это приятно!', 'Есть! Можно я ещё секунду порадуюсь?',
       'Ой, хорошо-то как!', 'Ну вот! Я прямо довольная сейчас.', 'А-а, есть! Красиво!',
       'Да! Вот за такие моменты я и люблю это смотреть.', 'Плюс. М-м, приятно.',
       'Уф! Я выдохнула.', 'Есть! Я не зря тут переживала.', 'Вот теперь можно улыбаться!', 'Да-а! Забрали этот момент.'
      ]),
      ('loss','TRADE_LOSS',[
       'Минус… Мне это совсем не нравится.', 'Ой, ну нет…', 'Эх. Обидно получилось.', 'А-а, досадно!',
       'Ну блин… Я расстроилась.', 'Минус. Да, неприятно.', 'Так… мне нужна секундочка.',
       'Ай… вот это обидно.', 'Жаль. Мне хотелось другого финала.', 'Ух… Ну да, я недовольна.',
       'Ох. Ладно, выдыхаю.', 'А, ну класс… Минус. Да, бесит. Беру перекрытие.'
      ]),
      ('refund','TRADE_REFUND',[
       'О, вернулось. Ну хоть так.', 'Так, возврат. Выдыхаю.', 'Ничья. Ладно, бывает.',
       'Фух, без потерь.', 'Ну вот… разошлись.', 'Возврат. Я уже успела напрячься.'
      ]),
      ('search_interest','NARRATE_SCAN',[
       'Та-ак, что тут у нас? Сейчас сверю пару интервалов — хочу понять, где движение, а где просто суета.',
       'О, погоди… вот тут мне уже интересно.', 'М-м… пока не цепляет.', 'Секундочку… хочу получше рассмотреть.'
      ]),
      ('observation','NARRATE_MOMENT',['Ого, зашевелилось!','Ну же… ещё чуть-чуть.']),
      ('moment_question','NARRATE_ENGAGE',[
       'Как тебе интереснее: короткие сделки или когда есть время поболтать?',
       'Ты сначала на график посмотрел или на меня?',
       'Ты обычно сразу пишешь в чат или сначала присматриваешься?',
       'Тебе больше нравится, когда всё спокойно, или когда вот так дёргается?'
      ]),
      ('social','CHAT_REACTION',[
       'Ой, спасибо! Мне очень приятно.', 'Ого! Вот это сюрприз. Спасибо тебе!',
       'А-а, спасибо! Я даже растерялась.', 'Как приятно… спасибо, что балуешь.',
       'О, ты остаёшься! Привет-привет.', 'Спасибо за подписку! Устраивайся.',
       'Всё, теперь ты с нами. Я рада!', 'О, пополнение! Рада тебе.',
       'Ой, сколько сердечек! Спасибо!', 'Вижу ваши сердечки. Мне приятно.',
       'Спасибо за поддержку! Лови сердечко.', 'Ну всё, я улыбаюсь. Спасибо вам!'
      ]),
      ('bot','NARRATE_CTA',[
       'Если хочешь разобраться с инструментами, начни с бота в шапке. Он объяснит шаги.',
       'Доступ объясняется в боте, он по ссылке в профиле. Если шаг непонятен, уточни какой.',
       'Кстати, бот есть в шапке профиля. Там можно посмотреть условия доступа.',
       'Оставлю маленькую подсказку: ссылка на бота в профиле.',
       'Про доступ удобнее посмотреть в боте. Ссылка в шапке.',
       'Ссылка на инструменты — в профиле, через бота.',
       'Кому нужны шаги подключения — они расписаны в боте из профиля.',
       'Бот в шапке профиля. Можешь заглянуть, а я пока здесь.'
      ]),
      ('chat_greeting','CHAT_REPLY',[
       'Привет-привет! О, рада тебя видеть.', 'О, привет! Как ты вовремя.', 'Привет! Устраивайся рядом.',
       'Приветик! Ну всё, теперь можно поболтать.', 'Привет! Я тебя заметила.',
       'Привет! Что у тебя сегодня хорошего?', 'Привет! Рада, что написал.', 'Привет-привет. Располагайся, я тут.'
      ])
    ]
    rows=[]
    def add(purpose,category,text,index):
        row=dict(id=f'autonomous_ru_{purpose}_{index:02}',lang='ru',category=category,purpose=purpose,text=text,
                 text_sha256=hashlib.sha256(text.encode()).hexdigest(),status='text_approved' if approved(text) else 'draft',
                 text_review_accepted=approved(text),auditory_verified=False,scene_review_accepted=False,
                 semantic_group=purpose+'_'+str(index),repeat_after_sec=120,
                 same_file_min_gap_sec=1200,requires_fresh_context=True,dialogue_policy='defer',
                 delivery='Разговорно, с живой реакцией; без дикторской подачи и добавленной морали.',
                 gesture='listen',conditions={},never=['Не приписывать сообщения молчащему чату.'])
        if purpose in ('win','loss','refund'):
            row.update(ttl_sec=12,same_file_min_gap_sec=0,repeat_after_sec=0,dialogue_policy='short_boundary',
                       conditions={'confirmed_result':purpose.upper() if purpose!='refund' else 'REFUND'},
                       gesture='joy' if purpose=='win' else 'nod')
            row['semantic_group']='confirmed_outcome_'+purpose
        elif purpose=='search_interest':
            row.update(ttl_sec=8,gesture='ponder',conditions={'phase':'ANALYZING'},episode_limit=1,min_event_gap_sec=90)
        elif purpose=='observation':
            row.update(ttl_sec=3,gesture='tilt',episode_limit=1,conditions={'phase':'IN_TRADE'})
        elif purpose=='moment_question':
            row.update(ttl_sec=8,gesture='tilt',episode_limit=1,hook_min_gap_sec=60,unanswered_hook_min_gap_sec=120)
        elif purpose=='social':
            row.update(ttl_sec=25,requires_fresh_context=False,dialogue_policy='short_boundary',
                       conditions={'chat_kind':'gift' if index<=4 else 'follow' if index<=8 else 'like'},
                       gesture='hand_heart' if index<=4 else 'wave' if index<=8 else 'nod')
            row.update(semantic_group='social_'+row['conditions']['chat_kind'],repeat_after_sec=0)
        elif purpose=='bot':
            row.update(ttl_sec=8,requires_fresh_context=False,gesture='explain_right',
                       conditions={'cta_due':True,'dialogue_active':False,'recent_loss':False},
                       min_event_gap_sec=180,max_target_gap_sec=300)
            row['semantic_group']='bot_access'
        elif purpose=='chat_greeting':
            row.update(ttl_sec=25,requires_fresh_context=False,gesture='wave',
                       dialogue_policy='reply',conditions={'real_written_greeting':True},
                       never=['Не запускать на вход зрителя без сообщения.'])
            row.update(semantic_group='real_chat_greeting',repeat_after_sec=0)
        rows.append(row)
        return row
    for purpose,category,texts in groups:
        for index,text in enumerate(texts,1):add(purpose,category,text,index)
    takes=['Улыбка, короткая уверенная подача.','Быстрое живое решение.','Сосредоточенно и без нажима.',
           'Лёгкий азарт, без крика.','Мягко и уверенно.','Короткий энергичный акцент.']
    for direction,category,text in [('BUY','OPEN_TRADE_CALL','Вверх.'),('SELL','OPEN_TRADE_PUT','Вниз.')]:
        for i,delivery in enumerate(takes,1):
            row=add('direction_'+direction.lower(),category,text,i)
            row.update(delivery=delivery,ttl_sec=5,gesture='nod',repeat_after_sec=0,same_file_min_gap_sec=0,
                       semantic_group='direction_'+direction.lower(),conditions={'direction':direction,'open_observed':True,'phase':'IN_TRADE'},
                       never=['Не добавлять пару, сумму, срок или объяснение к объявлению направления.'])
    byid={r['id']:r for r in rows}
    for identity in ['autonomous_ru_win_09','autonomous_ru_win_10','autonomous_ru_refund_06']:
        byid[identity]['conditions']['previous_expressed_concern']=True
    byid['autonomous_ru_loss_12']['conditions']['next_stake']=[110,242]
    byid['autonomous_ru_loss_12']['editor_note']='Запрошенное владельцем изменение. «Беру перекрытие» только при подтверждённом следующем шаге 110/242, не при возврате к 50.'
    byid['autonomous_ru_search_interest_02']['conditions']['setup_confirmed']=True
    byid['autonomous_ru_search_interest_03']['conditions']['setup_confirmed']=False
    byid['autonomous_ru_observation_01']['conditions']['high_volatility']=True
    byid['autonomous_ru_observation_02']['conditions']['remaining_sec_range']=[3,5]
    byid['autonomous_ru_moment_question_04']['conditions']['high_volatility']=True
    byid['autonomous_ru_social_11']['gesture']='hand_heart'
    labels={'win':'Победы','loss':'Проигрыши','refund':'Возвраты','search_interest':'Поиск',
            'observation':'Ситуативные реакции','moment_question':'Приглашения к разговору',
            'social':'Благодарности','bot':'Бот и доступ','chat_greeting':'Приветствия',
            'direction_buy':'Вверх','direction_sell':'Вниз'}
    summaries={'win':'Только подтверждённая победа; одна реакция на сделку.',
               'loss':'Только подтверждённый проигрыш; без обязательного объяснения.',
               'refund':'Только подтверждённый возврат, а не неизвестный результат.',
               'search_interest':'Новый реальный поиск; нет разговора; не чаще одного комментария за 90 секунд.',
               'observation':'Только новое реальное обстоятельство во время открытой сделки.',
               'moment_question':'Уместное приглашение к разговору; минимум 60 секунд между вопросами, 120 без ответа.',
               'social':'По настоящему событию; несколько событий объединяются, текущую речь не прерывает.',
               'bot':'Свободная пауза, прошло 3–5 минут; беседа и недавний проигрыш откладывают напоминание.',
               'chat_greeting':'Ответ на настоящее написанное приветствие; не на молчаливый вход зрителя.',
               'direction_buy':'Подтверждено открытие вверх; только направление, без суммы и срока.',
               'direction_sell':'Подтверждено открытие вниз; только направление, без суммы и срока.'}
    for row in rows:
        row['section_title']=labels[row['purpose']]
        row['when']=summaries[row['purpose']]
        if row['conditions'].get('previous_expressed_concern'):
            row['when']+=' Только если Винки до этого действительно выразила волнение.'
    byid['autonomous_ru_loss_12']['when']+=' Следующая ставка подтверждена: 110 или 242; не после сброса к 50.'
    byid['autonomous_ru_observation_01']['when']+=' Подтверждено заметное движение цены.'
    byid['autonomous_ru_observation_02']['when']+=' До закрытия осталось 3–5 секунд; один раз за сделку.'
    byid['autonomous_ru_moment_question_04']['when']+=' В этот момент действительно есть заметное движение цены.'
    for row in rows:
        if fingerprint(row['text']) in decisions()['rejected']:
            row['status']='owner_previously_rejected'
    # Existing accepted waveforms are references, never silently regenerated.
    reuse={'autonomous_ru_win_01':'conversation_pilot_ru_01','autonomous_ru_social_01':'conversation_pilot_ru_02'}
    manifest=json.loads((ROOT/'assets/voices/conversation_pilot_v1/manifest.json').read_text())
    audio={r['id']:r for group in manifest['categories'].values() for r in group}
    for identity,recording in reuse.items():
        record=audio[recording];assert record['status']=='ready' and record['auditory_verified']
        byid[identity]['existing_audio']=dict(id=recording,path='assets/voices/conversation_pilot_v1/'+record['file'],
                                            sha256=record['sha256'],owner_listened=True)
    counts=Counter(r['purpose'] if not r['purpose'].startswith('direction_') else 'direction' for r in rows)
    assert len(rows)==80 and counts['direction']==12
    payload=dict(version=1,status='editorial_draft_not_active',lang='ru',activated=False,paid_generation_authorized=False,
                 note='80 записей; направление — 12 дублей двух команд, а не 12 разных мыслей. Персональные ответы отдельно, через живую генерацию. Все жесты из прежнего набора.',
                 counts=dict(counts),records=rows)
    decision_path=OUT/'owner-autonomous-bank-decision.json'
    if decision_path.exists():
        from tools.import_autonomous_bank_review import resolve
        decision=json.loads(decision_path.read_text())
        review=json.loads((OUT/'owner-autonomous-bank-review.json').read_text())
        resolved=resolve(payload,review,approve_unmarked=decision.get('approve_unmarked') is True)
        if resolved['reviewed_text_set_sha256']!=decision['reviewed_text_set_sha256']:
            raise ValueError('Catalog changed after owner review; unmarked approval cannot cover new text')
        amendment_path=OUT/'owner-autonomous-direction-amendment.json'
        if amendment_path.exists():
            from tools.autonomous_direction_revision import amend
            resolved=amend(resolved,json.loads(amendment_path.read_text()))
        payload=resolved;rows=resolved['records']
        (OUT/'autonomous-bank-ru-approved.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    else:
        (OUT/'autonomous-bank-ru-80.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    table=[f'# Винки: первые {len(rows)} записей RU','',payload['note'],'','Статус: текстовый банк; полный звук ещё не создан и не подключён. Отдельные пробы голоса не являются выпуском банка. Условия в JSON требуют подтверждённых источников; доступность каждого признака описана в autonomous-runtime-report.md.','',
           '| ID | Текст | Когда использовать |','|---|---|---|']
    for r in rows:table.append('| '+r['id']+' | '+r['text'].replace('|','\\|')+' | '+r['when']+' |')
    table_file='autonomous-bank-ru-approved.md' if decision_path.exists() else 'autonomous-bank-ru-80.md'
    (OUT/table_file).write_text('\n'.join(table)+'\n')
    page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Винки · банк 80 RU</title>
<style>body{margin:0;background:#121826;color:#ecf0fa;font:16px system-ui}main{max-width:1000px;margin:auto;padding:24px}h1{font-size:28px}.card{background:#202a3e;border:1px solid #3c4964;border-radius:14px;padding:20px;margin:14px 0}.line{font-size:22px;line-height:1.5}.muted{color:#b7c2d9;font-size:14px}select,textarea,button{font:inherit;color:inherit;background:#303d58;border:1px solid #637498;border-radius:8px;padding:10px}textarea{box-sizing:border-box;width:100%;margin-top:12px}audio{display:block;width:100%;margin:12px 0}.toolbar{position:sticky;top:0;background:#121826;padding:12px 0;display:flex;gap:12px;flex-wrap:wrap;z-index:2}.yes{border-color:#6aa18b}</style>
<main><h1>Винки: первые 80 записей RU</h1><p>Сначала оцениваем слова и уместность. Звук ещё не создавался; две уже принятые записи можно прослушать. Направления — по шесть дублей «Вверх» и «Вниз» с разной подачей. Прежние жесты сохранены.</p><div class="toolbar"><button id="export">Скачать оценки</button><select id="filter"><option value="all">Все разделы</option></select><span id="counter"></span></div><div id="rows"></div></main>
<script>const bank=DATA;const key='winky-autonomous-bank-ru-v1';let marks={};try{marks=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}const save=()=>{localStorage.setItem(key,JSON.stringify(marks));count()};function count(){document.getElementById('counter').textContent='Оценено '+Object.values(marks).filter(v=>v.status).length+' / '+bank.records.length}const filter=document.getElementById('filter');for(const p of [...new Set(bank.records.map(r=>r.purpose))]){const o=document.createElement('option');o.value=p;o.textContent=p;filter.append(o)}for(const r of bank.records){const card=document.createElement('section');card.className='card';card.dataset.purpose=r.purpose;const h=document.createElement('div');h.className='muted';h.textContent=r.id+(r.text_review_accepted?' · текст ранее одобрен':' · черновик');const line=document.createElement('p');line.className='line';line.textContent=r.text;const when=document.createElement('p');when.className='muted';when.textContent='Уместность: '+JSON.stringify(r.conditions)+' · Подача: '+r.delivery;card.append(h,line,when);if(r.existing_audio){const a=document.createElement('audio');a.controls=true;a.preload='none';a.src='../../../'+r.existing_audio.path;card.append(a)}const select=document.createElement('select');for(const [value,label]of [['','Не оценено'],['good','Подходит'],['ref','Образец'],['change','Доработать'],['bad','Убрать']]){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o)}select.value=marks[r.id]?.status||'';select.onchange=()=>{marks[r.id]??={};marks[r.id].status=select.value;card.classList.toggle('yes',['good','ref'].includes(select.value));save()};const note=document.createElement('textarea');note.rows=2;note.placeholder='Что нравится, что убрать или твой вариант';note.value=marks[r.id]?.comment||'';note.oninput=()=>{marks[r.id]??={};marks[r.id].comment=note.value;save()};card.append(select,note);document.getElementById('rows').append(card)}filter.onchange=()=>document.querySelectorAll('.card').forEach(c=>c.hidden=filter.value!=='all'&&c.dataset.purpose!==filter.value);document.getElementById('export').onclick=()=>{const items=bank.records.filter(r=>marks[r.id]?.status).map(r=>({id:r.id,text:r.text,text_sha256:r.text_sha256,category:r.category,status:marks[r.id].status,comment:marks[r.id].comment||''}));const blob=new Blob([JSON.stringify({version:1,kind:'autonomous_bank_text_review',created_at:new Date().toISOString(),items},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='winky-autonomous-bank-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};count();</script></html>'''
    # Review identical direction words once; delivery takes remain separate records.
    page=page.replace('const bank=DATA;', "const bank=DATA;const reviewRows=bank.records.filter((r,i,all)=>!r.purpose.startsWith('direction_')||all.findIndex(x=>x.text===r.text)===i);")
    page=page.replace("Object.values(marks).filter(v=>v.status).length+' / '+bank.records.length", "reviewRows.filter(r=>marks[r.id]?.status).length+' / '+reviewRows.length+' текстов · '+bank.records.length+' записей'")
    page=page.replace('for(const r of bank.records){const card', 'for(const r of reviewRows){const card')
    page=page.replace('o.textContent=p;filter.append(o)', 'o.textContent=bank.records.find(r=>r.purpose===p).section_title;filter.append(o)')
    page=page.replace("'Уместность: '+JSON.stringify(r.conditions)", "'Когда: '+r.when")
    page=page.replace("+' · Подача: '+r.delivery", "+' · Подача: '+(r.purpose.startsWith('direction_')?'Дубли: '+bank.records.filter(x=>x.text===r.text).map(x=>x.delivery).join(' / '):r.delivery)")
    if decision_path.exists():
        page=page.replace('первые 80 записей RU',f'принятые {len(rows)} записей RU')
        page=page.replace('Сначала оцениваем слова и уместность.',f'Принято {len(rows)} записей. Четыре отклонённые фразы убраны; остальные оставлены по вашему решению.')
        if amendment_path.exists():
            page=page.replace('Направления — по шесть дублей «Вверх» и «Вниз» с разной подачей.', 'Направления исправлены по оценке голоса: «Открыла вверх», «Зашла вверх», «Открыла вниз», «Зашла вниз»; по три дубля каждой фразы.')
        page=page.replace('const save=()=>',"for(const r of bank.records){marks[r.id]??={status:'good',comment:''}}const save=()=>")
        page=page.replace("bank.records.filter(r=>marks[r.id]?.status).map", "reviewRows.filter(r=>marks[r.id]?.status).map")
    (OUT/'autonomous-bank-review.html').write_text(page.replace('DATA',json.dumps(payload,ensure_ascii=False).replace('</','<\\/')))
    print(json.dumps(dict(records=len(rows),unique_texts=len({r['text'] for r in rows}),removed=len(payload.get('removed_records',[]))),ensure_ascii=False))


if __name__=='__main__':build()
