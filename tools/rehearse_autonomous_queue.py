"""Two hours of virtual stream time through real queue code and real MP3s.

Only scheduling and service completion clocks are virtual. No network, synthesis,
broker, TikTok, live process, active pointer or owner speech history is touched.
The resulting two-hour audio contains the exact files selected by the queue.
"""
import argparse
from collections import Counter
from concurrent.futures import Future
import hashlib
import json
import logging
from pathlib import Path
import random
import subprocess
import sys
import tempfile
from unittest.mock import patch
import wave

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS
from tools.autonomous_voice_probe import save
from winky.director import StreamDirector,ChatItem
from winky.tts import SpeechController,compute_rms_chunks,media_duration_seconds
from winky.voice_bank import VoiceBank
from winky.speech_rotation import fingerprint

OUT=ROOT/'artifacts/winky-autonomous/two-hour-v1'
BASE=1800000000.0
RUNTIME_FILES=('winky/tts.py','winky/director.py','winky/voice_bank.py','winky/speech_rotation.py',
               'winky/conversation.py','winky/commentary.py','winky/phrase_context.py','winky/chat_style.py','winky/app.py')


class FixtureFiles:
    name='isolated-cached-fixtures-no-network'
    def __init__(self,mapping):self.mapping=mapping;self.fail=False;self.hits=0;self.failures=0
    def synthesize(self,text,lang):
        if self.fail:self.failures+=1;raise RuntimeError('fixture TTS unavailable')
        key=fingerprint(text)
        if lang!='ru' or key not in self.mapping:raise RuntimeError('No fixture waveform; synthesis forbidden')
        self.hits+=1;return self.mapping[key]


class FixtureBrain:
    def __init__(self,replies,variants=None):self.replies=replies;self.variants=variants or [];self.busy=False;self.fail=False;self.calls=0;self.contexts=[]
    def reply(self,comment,nickname='',**kwargs):
        self.calls+=1
        context=kwargs.get('stream_context',{})
        self.contexts.append(dict(facts_available=context.get('facts_available'),turns=len(context.get('conversation',{}).get('spoken_turns',[]))))
        if self.fail:raise RuntimeError('fixture LLM unavailable')
        if self.busy:return self.variants[self.calls%len(self.variants)]
        if 'доступ' in comment:return self.replies['bot']
        if 'просто смотрю' in comment:return self.replies['watch']
        if 'на тебя' in comment:return self.replies['honest']
        if 'минус' in comment:return self.replies['skeptic']
        if 'поторопился' in comment:return self.replies['after']
        return self.replies['honest']


def phase_name(t):
    if t<900:return 'quiet_15_minutes'
    if t<1800:return 'dialogue_and_events'
    if t<2100:return 'busy_chat_and_gifts'
    if t<2400:return 'llm_unavailable'
    if t<2700:return 'tts_unavailable'
    if t<3000:return 'late_generation'
    if t<3300:return 'stale_broker_context'
    if t<3600:return 'paused_voice'
    if t<3800:return 'stop_and_fresh_resume'
    return 'mixed_endurance'


def run(duration=7200,write_audio=True):
    manifest=json.loads((BANK/'manifest.json').read_text())
    if not manifest.get('scene_review_accepted') or not manifest.get('review_accepted'):
        raise ValueError('Owner scene and sampled bank acceptance required')
    records={r['id']:(BANK,r) for group in manifest['categories'].values() for r in group}
    old=ROOT/'assets/voices/conversation_pilot_v1'
    for group in json.loads((old/'manifest.json').read_text())['categories'].values():
        for r in group:
            if r.get('auditory_verified'):records[r['id']]=(old,r)
    paths={};mapping={};durations={};digests={}
    for identity,(folder,row) in records.items():
        path=(folder/row['file']).resolve()
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest!=row['sha256']:raise ValueError('Changed source audio')
        paths[identity]=path;digests[path]=digest
        if path not in durations:durations[path]=media_duration_seconds(path)
        if row.get('status')=='ready':mapping[fingerprint(row['text'])]=path
    replies={name:records[identity][1]['text'] for name,identity in dict(bot='autonomous_ru_bot_03',
        watch='conversation_pilot_ru_09',honest='conversation_pilot_ru_06',skeptic='conversation_pilot_ru_07',after='conversation_pilot_ru_08').items()}
    fixture=FixtureFiles(mapping);brain=FixtureBrain(replies);clock=[BASE]
    played=[];logs=[];attempts=Counter();scheduled=[];workers=[BASE,BASE];active=None;latencies=[]
    maximum=dict(speech_queue=0,chat_queue=0,reservations=0)
    cancel_counts=Counter();outcomes=['WIN','LOSS','LOSS','LOSS','REFUND','WIN','UNKNOWN']
    last_result={};stake=50;known_busy_at_receive={};failed_items=set();comments=0;paused=False
    OUT.mkdir(parents=True,exist_ok=True)
    # A finite set of exact cached answers would hit the real repetition guard
    # before it could stress the queue. Build distinct stress fixtures by joining
    # two existing waveforms. They are test data, never a character demonstration.
    variants=[];pcm_cache={};fixture_folder=OUT/'fixture-responses';fixture_folder.mkdir(exist_ok=True)
    for i in range(8):
        first='autonomous_ru_chat_greeting_'+f'{i+1:02}'
        for j in range(12):
            second='autonomous_ru_social_'+f'{j+1:02}'
            pieces=[]
            for identity in (first,second):
                path=paths[identity]
                if path not in pcm_cache:pcm_cache[path]=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-ar','24000','-ac','1','pipe:1'])
                pieces.append(pcm_cache[path])
            path=(fixture_folder/f'{i:02}-{j:02}.wav').resolve()
            with wave.open(str(path),'wb') as audio:
                audio.setparams((1,2,24000,0,'NONE','not compressed'));audio.writeframes(pieces[0]+b'\0'*5760+pieces[1])
            text=records[first][1]['text']+' '+records[second][1]['text'];variants.append(text)
            mapping[fingerprint(text)]=path;digests[path]=hashlib.sha256(path.read_bytes()).hexdigest()
            durations[path]=(len(pieces[0])+5760+len(pieces[1]))/48000
    brain.variants=variants
    with tempfile.TemporaryDirectory() as tmp:
        controller=SpeechController(on_speak=lambda *_:None,engine=fixture)
        controller.voice_bank=VoiceBank(root=BANK,history_path=Path(tmp)/'rotation.json')
        director=StreamDirector(brain=brain,tts=controller,on_event_log=logs.append)
        director._next_commentary_at=BASE+15;controller.last_speech_ended_at=BASE
        controller.voice_bank.rotation.state['next_cta_at']=BASE+240
        original_item=ChatItem
        def item_factory(*args,**kwargs):kwargs['created_at']=clock[0];return original_item(*args,**kwargs)
        def submit(fn,item):
            delay=12 if '[slow]' in item.text else 1
            slot=min(range(2),key=lambda i:workers[i]);due=max(clock[0],workers[slot])+delay;workers[slot]=due
            future=Future();scheduled.append((due,fn,item,future));return future
        def comment(user,text):
            nonlocal comments
            comments+=1;known_busy_at_receive[comments]=active is not None
            director.enqueue_chat_comment(user,text,profile=None)
            if director._chat_queue:
                item=director._chat_queue[-1];item.fixture_comment_number=comments
        def event(category,**extra):
            payload={**director.context,'category':category,'created_at':clock[0],**extra}
            result=controller.enqueue_voice_event(payload)
            attempts[(category,result.get('error','queued' if result.get('queued') else 'duplicate'))]+=1
            return result
        def finish(reason='completed'):
            nonlocal active
            if not active:return
            active['end_reason']=reason
            active['played_duration']=round(min(active['duration'],clock[0]-BASE-active['at']),4)
            controller._speaking=False;controller._current_text='';controller.last_speech_ended_at=clock[0]
            active=None
        try:
            with patch('winky.director.stream_director',director),patch('winky.director.ChatItem',side_effect=item_factory), \
                 patch('winky.tts.time.time',side_effect=lambda:clock[0]), \
                 patch('winky.tts.media_duration_seconds',side_effect=lambda p:durations.get(Path(p).resolve(),999)), \
                 patch('winky.speech_rotation._shared',controller.voice_bank.rotation), \
                 patch.object(director._chat_workers,'submit',side_effect=submit), \
                 patch.object(director._stop_event,'wait',return_value=False), \
                 patch('winky.speech_rotation.random.uniform',side_effect=lambda a,b:(a+b)/2), \
                 patch('winky.speech_rotation.random.choice',side_effect=random.Random(17).choice):
                for tick in range(int(duration*4)):
                    offset=tick/4;clock[0]=BASE+offset
                    if active and clock[0]>=active['_until']:finish()
                    segment=phase_name(offset);cycle,beat=divmod(int(offset),120);seq=cycle+1
                    fixture.fail=segment=='tts_unavailable';brain.fail=segment=='llm_unavailable';brain.busy=segment=='busy_chat_and_gifts'
                    phase='ANALYZING' if beat<20 else 'IN_TRADE' if beat<80 else 'RESULT' if beat==80 else 'COOLDOWN'
                    if tick%4==0:
                        if beat==80:
                            outcome=outcomes[cycle%len(outcomes)]
                            if outcome=='WIN':stake=50
                            elif outcome=='LOSS':stake={50:110,110:242,242:50}[stake]
                            last_result=dict(seq=seq,outcome=outcome,closed_at=clock[0])
                        context=dict(auto_stream=True,session_id='offline-queue',lang='ru',trade_seq=seq,
                            search_generation=seq,direction='BUY' if cycle%2 else 'SELL',duration='1m',
                            open_observed=phase=='IN_TRADE',setup_confirmed=phase=='IN_TRADE',
                            last_result=last_result,next_stake=stake,high_volatility=50<=beat<=52,
                            market_observed_at=BASE+cycle*120+50 if 50<=beat<=52 else clock[0]-10,
                            created_at=clock[0]*1000)
                        if segment!='stale_broker_context':
                            director.update_trade_phase(phase,'EUR/USD OTC',max(0,80-beat) if phase=='IN_TRADE' else 0,context)
                        if beat==20:event('OPEN_TRADE_CALL' if context['direction']=='BUY' else 'OPEN_TRADE_PUT',event_id=f'open:{seq}')
                        if beat==80 and last_result.get('outcome') in ('WIN','LOSS','REFUND'):
                            result_category='TRADE_'+last_result['outcome'];event(result_category,event_id=f'result:{seq}')
                            event(result_category,event_id=f'result:{seq}')  # Compatibility duplicate.
                    if offset>=900 and offset<duration-30 and tick%4==0:
                        if segment=='busy_chat_and_gifts':
                            if int(offset)%2==0:comment('Зритель'+str(int(offset)//2%8),'Я просто смотрю, тест '+str(int(offset)))
                            if int(offset)%3==0:event('CHAT_REACTION',chat_kind='gift',event_id=f'gift:{tick}')
                            if int(offset)%5==0:event('CHAT_REACTION',chat_kind='follow',event_id=f'follow:{tick}')
                            event('CHAT_REACTION',chat_kind='like',event_id=f'like:{tick}')
                        elif segment in ('llm_unavailable','tts_unavailable','late_generation'):
                            if int(offset)%20==0:comment('Проверка','На тебя'+(' [slow]' if segment=='late_generation' else ''))
                        elif beat in (8,32,48):
                            comment('Аня' if beat!=48 else 'Боря',{8:'Я просто смотрю',32:'На тебя',48:'Кажется, будет минус'}[beat])
                        if segment in ('dialogue_and_events','mixed_endurance') and beat==49:
                            comment('Боря','Не поторопился ли я')
                            event('CHAT_REACTION',chat_kind='gift',event_id=f'gift:{tick}')
                    if int(offset)==3300 and tick%4==0:
                        controller.toggle_pause();paused=True
                    if int(offset)==3600 and tick%4==0:
                        if paused:controller.toggle_pause();paused=False
                        director.cancel_pending_chat();controller.clear_queue_and_stop();finish('owner_stop')
                    for pending in list(scheduled):
                        due,fn,item,future=pending
                        if due<=clock[0]:
                            scheduled.remove(pending)
                            if future.cancelled():continue
                            fn(item)
                            if item.ready and not item.failed:
                                item.fixture_ready_at=clock[0];item.fixture_channel_busy_when_ready=active is not None
                            if item.failed:failed_items.add(id(item))
                            future.set_result(None)
                    if offset<duration-15:director.tick(clock[0])
                    if active is None and not controller.paused:
                        item=controller._next_item()
                        if item:
                            path=item.media_path.resolve();length=durations[path]
                            assert length<26 and length>0
                            assert controller._item_valid(item)
                            controller._arbiter.started(item,clock[0])
                            if item.chat_item:
                                assert id(item.chat_item) not in failed_items
                                item.chat_item.played=True
                                latency=clock[0]-item.created_at
                                ready_at=getattr(item.chat_item,'fixture_ready_at',item.created_at)
                                latencies.append(dict(sec=round(latency,3),prepare_sec=round(ready_at-item.created_at,3),
                                    queue_wait_sec=round(clock[0]-ready_at,3),received_channel_busy=known_busy_at_receive.get(getattr(item.chat_item,'fixture_comment_number',0),False),
                                    ready_channel_busy=getattr(item.chat_item,'fixture_channel_busy_when_ready',False)))
                            if item.bank_id:controller.voice_bank.release(item.bank_id,item.event,played=True,spoken_text=item.text)
                            else:controller.voice_bank.rotation.note(item.text,'ru',item.source)
                            director.note_voice_started({**item.event,'file_id':item.bank_id,'text':item.text,'duration_sec':length})
                            if item.event.get('commentary'):director.note_commentary_started(item.event)
                            active=dict(at=offset,duration=length,category=item.event.get('category'),
                                id=item.bank_id,text=item.text,path=path.relative_to(ROOT).as_posix(),sha256=digests[path],
                                phase=segment,episode_key=item.event.get('episode_key'),trade_seq=item.event.get('trade_seq'),
                                received_phase=phase_name(item.created_at-BASE),
                                chat_kind=item.event.get('chat_kind'),viewer_key=item.event.get('viewer_key'),
                                _until=clock[0]+length,end_reason='completed')
                            played.append(active);controller._speaking=True;controller._current_text=item.text
                    maximum['speech_queue']=max(maximum['speech_queue'],len(controller._playback_queue))
                    maximum['chat_queue']=max(maximum['chat_queue'],len(director._chat_queue))
                    maximum['reservations']=max(maximum['reservations'],len(controller.voice_bank.rotation.pending))
                    if tick and tick%(900*4)==0:print('queue_rehearsal_seconds',int(offset),flush=True)
                clock[0]=BASE+duration
                if active and active['_until']<=clock[0]:finish()
                # Drain invalid leftovers without adding new speech.
                leftover=controller._next_item()
                assert leftover is None,'A fresh answer remained beyond the rehearsal horizon'
                remaining=len(controller._playback_queue)
                assert remaining==0,remaining
                assert all(r['id']!='autonomous_ru_loss_04' for r in played)
                assert maximum['chat_queue']<=6
                if duration>=2100:assert maximum['chat_queue']==6,'Stress did not reach the configured chat cap'
                assert all(b['at']>=a['at']+a['duration']-.001 or a['end_reason']=='owner_stop' for a,b in zip(played,played[1:]))
                assert not any(r['category']=='CHAT_REPLY' for r in played if r['at']<900)
                assert not any(r['category'] in ('NARRATE_PAIR','NARRATE_EXPIRY','NARRATE_TRADE') for r in played)
                assert all(r['category']!='CHAT_REPLY' for r in played if r['received_phase'] in ('llm_unavailable','tts_unavailable','late_generation'))
                assert not any(r['phase']=='paused_voice' for r in played)
                assert len(controller.voice_bank.rotation.pending)==0
                ads=[r['at'] for r in played if r['category']=='NARRATE_CTA']
                assert all(b-a>=180 for a,b in zip(ads,ads[1:])),ads
        finally:
            director.stop();controller._synth_pool.shutdown(wait=True,cancel_futures=True)
    for r in logs:
        if r['type'] in ('voice_cancel','chat_cancel'):cancel_counts[r.get('reason','unknown')]+=1
    for r in played:r.pop('_until',None)
    result=dict(version=1,duration_sec=duration,clock='accelerated_virtual_time',real_queue=True,
        bank_manifest_sha256=hashlib.sha256((BANK/'manifest.json').read_bytes()).hexdigest(),
        runtime_sources={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in RUNTIME_FILES},
        real_audio_files=True,native_two_hour_playback=False,live_llm=False,live_tiktok=False,live_broker=False,
        paid_tts_requests=0,network_requests=0,model_latency_verified=False,max_concurrent_voices=1,
        max_queues=maximum,remaining_speech_queue=remaining,cancellations=dict(cancel_counts),
        counts=dict(Counter(r['category'] for r in played)),first_15_minutes=dict(Counter(r['category'] for r in played if r['at']<900)),
        fixture_chat_latency=latencies,fixture_cached_file_lookups=fixture.hits,fixture_tts_failures=fixture.failures,
        fixture_llm_calls=brain.calls,stress_answers='concatenated_existing_waveforms_test_only',
        attempts={f'{k[0]}:{k[1]}':v for k,v in attempts.items()},
        spoken=played,events=logs,passed=True)
    save(OUT/'queue-verification.json',result)
    if write_audio:write_recording(result)
    compact={k:v for k,v in result.items() if k not in ('spoken','events','fixture_chat_latency','attempts')}
    save(DOCS/'autonomous-two-hour-queue-verification.json',compact)
    print(json.dumps(compact,ensure_ascii=False),flush=True)
    return result


def write_recording(result):
    rate=24000;cache={};position=0;target=OUT/'two-hour-queue.wav';silence=b'\0'*(rate*2)
    with wave.open(str(target),'wb') as audio:
        audio.setparams((1,2,rate,0,'NONE','not compressed'))
        def zeros(frames):
            while frames:
                n=min(frames,rate);audio.writeframes(silence[:n*2]);frames-=n
        for row in result['spoken']:
            at=round(row['at']*rate);assert at>=position
            zeros(at-position)
            key=row['sha256']
            if key not in cache:cache[key]=subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/row['path']),'-f','s16le','-ar',str(rate),'-ac','1','pipe:1'])
            pcm=cache[key]
            if row['end_reason']=='owner_stop':
                pcm=pcm[:min(len(pcm),round(row['played_duration']*rate)*2)]
            audio.writeframes(pcm);position=at+len(pcm)//2
        zeros(max(0,round(result['duration_sec']*rate)-position))
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(target),'-c:a','libmp3lame','-q:a','3',str(OUT/'two-hour-queue.mp3')],check=True)
    transcript=['# Двухчасовая проверка очереди Винки','',
                'Время ускорено. Реальные файлы выбраны настоящей очередью; сообщения, работа сервисов и торговые события — тестовые.','',
                '| Время | Тип | Фраза |','|---|---|---|']
    for r in result['spoken']:
        second=int(r['at']);transcript.append(f"| {second//3600:02}:{second//60%60:02}:{second%60:02} | {r['category']} | {r['text']} |")
    (OUT/'transcript.md').write_text('\n'.join(transcript)+'\n')


if __name__=='__main__':
    logging.getLogger('winky').setLevel(logging.ERROR)
    parser=argparse.ArgumentParser();parser.add_argument('--duration',type=int,default=7200);parser.add_argument('--no-audio',action='store_true');args=parser.parse_args()
    run(args.duration,not args.no_audio)
