"""A staged review with real pilot audio and unchanged motions; no live generation."""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS
from tools.autonomous_voice_probe import save

OUT=ROOT/'artifacts/winky-autonomous/bank-v1'
RATE=24000
DURATION=234


def build():
    manifest=json.loads((BANK/'manifest.json').read_text())
    records={r['id']:(BANK,r) for group in manifest['categories'].values() for r in group}
    old=ROOT/'assets/voices/conversation_pilot_v1'
    for group in json.loads((old/'manifest.json').read_text())['categories'].values():
        for r in group:
            if r.get('auditory_verified'):records[r['id']]=(old,r)
    script=[
        (2,'autonomous_ru_search_interest_01','NARRATE_SCAN','','','',0),
        (18,'autonomous_ru_direction_buy_02_v2','OPEN_TRADE_CALL','','','',1),
        (29,'autonomous_ru_observation_02','NARRATE_MOMENT','','','',1),
        (33,'autonomous_ru_win_02','TRADE_WIN','','','',1),
        (66,'conversation_pilot_ru_09','CHAT_REPLY','a','Я вообще просто смотрю','compliment',0),
        (73,'autonomous_ru_social_02','CHAT_REACTION','b','','gift',0),
        (79,'conversation_pilot_ru_06','CHAT_REPLY','a','На тебя','compliment',0),
        (92,'conversation_pilot_ru_07','CHAT_REPLY','c','Кажется, сейчас будет минус','skeptic',0),
        (98,'autonomous_ru_win_01','TRADE_WIN','','','',2),
        (105,'conversation_pilot_ru_08','CHAT_REPLY','c','Ладно, я поторопился','joke',0),
        (132,'autonomous_ru_direction_sell_02_v2','OPEN_TRADE_PUT','','','',3),
        (147,'autonomous_ru_loss_01','TRADE_LOSS','','','',3),
        (166,'autonomous_ru_direction_sell_01_v2','OPEN_TRADE_PUT','','','',4),
        (181,'autonomous_ru_refund_02','TRADE_REFUND','','','',4),
        (195,'autonomous_ru_direction_buy_02_v2','OPEN_TRADE_CALL','','','',5),
        (210,'autonomous_ru_win_08','TRADE_WIN','','','',5),
        (225,'autonomous_ru_bot_03','NARRATE_CTA','','','bot',0),
    ]
    contexts=[dict(at=0,phase='ANALYZING'),dict(at=18,phase='IN_TRADE',remaining_sec=15),
        dict(at=33,phase='RESULT',result='WIN',seq=1),dict(at=46,phase='ANALYZING'),
        dict(at=81,phase='IN_TRADE',remaining_sec=15),dict(at=96,phase='RESULT',result='WIN',seq=2),
        dict(at=115,phase='ANALYZING'),dict(at=132,phase='IN_TRADE',remaining_sec=15),
        dict(at=147,phase='RESULT',result='LOSS',seq=3),dict(at=155,phase='ANALYZING'),
        dict(at=166,phase='IN_TRADE',remaining_sec=15),dict(at=181,phase='RESULT',result='REFUND',seq=4),
        dict(at=190,phase='ANALYZING'),dict(at=195,phase='IN_TRADE',remaining_sec=15),
        dict(at=210,phase='RESULT',result='WIN',seq=5),dict(at=218,phase='ANALYZING')]
    scenes=[(0,'Тихий чат','Связанный эпизод: поиск, вход, ожидание и короткая реакция.'),
        (64,'Разговор и подарок','Слова зрителя задают тему. Подарок получает короткое спасибо.'),
        (88,'Результат во время ответа','Ответ заканчивается; результат отмечается на ближайшей паузе.'),
        (130,'Минус','Короткая досада без лекции и обещания отыграться.'),
        (164,'Возврат','Нейтральный подтверждённый исход, без выдуманной победы.'),
        (193,'Новый эпизод','Торговля продолжает работать самостоятельно.'),
        (221,'Свободная пауза','Напоминание о боте отложено до окончания разговора и паузы после минуса.')]
    samples=array.array('h',[0])*(RATE*DURATION);clips=[];end=0
    for index,(at,identity,category,viewer,comment,intent,seq) in enumerate(script):
        folder,row=records[identity];path=folder/row['file']
        if folder==BANK and not row.get('automatic_qc_passed'):raise ValueError('Flagged rehearsal recording: '+identity)
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        if digest!=row['sha256']:raise ValueError('Changed rehearsal waveform')
        pcm=array.array('h');pcm.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-ar',str(RATE),'-ac','1','pipe:1']))
        if sys.byteorder!='little':pcm.byteswap()
        duration=len(pcm)/RATE
        if at<end or at+duration>DURATION:raise ValueError('Overlapping speech')
        end=at+duration;samples[round(at*RATE):round(at*RATE)+len(pcm)]=pcm
        envelope=[math.sqrt(sum(s*s for s in pcm[i:i+1200])/len(pcm[i:i+1200]))/32768 for i in range(0,len(pcm),1200)]
        peak=max(envelope) or 1
        envelope=[0 if v/peak<.18 else round(min(1,((v/peak-.18)/.82)**1.2*1.15),3) for v in envelope]
        event=dict(id=f'bank-rehearsal-{index}',category=category,text=row['text'],duration=duration,lang='ru',
                   source='staged_bank_rehearsal',movement_mode='vivid',viewer_key=viewer,comment=comment,intent=intent,
                   emotion='sad' if category=='TRADE_LOSS' else 'happy')
        if seq:event.update(session_id='rehearsal',trade_seq=seq)
        if category=='CHAT_REACTION':event['chat_kind']=intent
        if category=='NARRATE_SCAN':event['purpose']='search_interest'
        if category=='NARRATE_MOMENT':event['purpose']='observation'
        if row.get('performance'):
            if row['performance']['audio_sha256']!=digest:raise ValueError('Changed performance waveform')
            event['performance']=row['performance']
        clips.append(dict(at=at,id=identity,audio_path=path.relative_to(ROOT).as_posix(),sha256=digest,duration=duration,
                          owner_listened=row.get('auditory_verified') is True,event=event,rms=envelope))
    payload=dict(version=1,duration_sec=DURATION,fps=24,staged=True,live_llm=False,live_trading=False,
                 assert_deferred_win=False,caption='Новый банк Марин и принятые ответы. Сообщения и сделки постановочные.',
                 clips=clips,context_events=contexts,scenes=[dict(at=at,title=title,description=description) for at,title,description in scenes],
                 snapshot_seconds=[4,17,30,34,67,74,80,93,97,99,106,133,148,167,182,196,211,226])
    save(DOCS/'autonomous-bank-rehearsal-timeline.json',payload)
    OUT.mkdir(parents=True,exist_ok=True)
    if sys.byteorder!='little':samples.byteswap()
    with wave.open(str(OUT/'rehearsal-audio.wav'),'wb') as wav:
        wav.setparams((1,2,RATE,0,'NONE','not compressed'));wav.writeframes(samples.tobytes())
    print(json.dumps(dict(clips=len(clips),duration_sec=DURATION,paid_requests=0,live_trading=False)))


if __name__=='__main__':build()
