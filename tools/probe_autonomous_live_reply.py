"""One isolated real text-model/TTS reply, muted native playback, no TikTok or orders."""
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import threading
import time
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools.autonomous_production_order import BANK,DOCS
from tools.autonomous_voice_probe import MARIN,save
from winky.deepseek import LLMBrain
from winky.director import StreamDirector
from winky.fish_tts import FishAudioTTS
from winky.tts import SpeechController,TTSError
from winky.voice_bank import VoiceBank

OUT=ROOT/'artifacts/winky-autonomous/two-hour-v1'


class CappedProbeTTS(FishAudioTTS):
    def __init__(self):
        super().__init__()
        self.baseline=json.loads((self.root/'budget.json').read_text())['reserved_usd']
    def _budget(self,amount,refund=False):
        spent=json.loads((self.root/'budget.json').read_text())['reserved_usd']
        if not refund and spent-self.baseline+amount>.01+1e-9:raise TTSError('Single live probe cap exceeded')
        return super()._budget(amount,refund=refund)


def probe():
    previous=OUT/'real-reply-probe.json'
    if previous.exists():
        result=json.loads(previous.read_text())
        media=(ROOT/result['audio_path']).resolve()
        if not media.is_relative_to(OUT.resolve()) or hashlib.sha256(media.read_bytes()).hexdigest()!=result['waveform_sha256']:
            raise ValueError('Previous paid probe waveform changed; preserve the receipt and investigate')
        print(json.dumps(dict(already_complete=True,**{k:v for k,v in result.items() if k!='events'}),ensure_ascii=False))
        return result
    engine=CappedProbeTTS();brain=LLMBrain();events=[];logs=[];finished=threading.Event()
    if engine.voices['ru']!=MARIN or not brain.available:raise ValueError('The configured Marin and real model are required')
    start=time.perf_counter();received=time.time()
    def receive(event):
        events.append(dict(at_sec=round(time.perf_counter()-start,4),**event))
        if event['type']=='end':finished.set()
    with tempfile.TemporaryDirectory() as tmp:
        c=SpeechController(on_speak=lambda *_:None,engine=engine,on_performance=receive)
        c.voice_bank=VoiceBank(root=BANK,history_path=Path(tmp)/'history.json');c.set_volume(0)
        d=StreamDirector(brain=brain,tts=c,on_event_log=logs.append);d.cta_enabled=False
        try:
            with patch('winky.director.stream_director',d),patch('winky.speech_rotation._shared',c.voice_bank.rotation):
                c.start();d.start()
                d.enqueue_chat_comment('Тестовый зритель','Я просто смотрю, Винки. Можно я без разговоров побуду?',lang='ru')
                if not finished.wait(45):raise RuntimeError('Real reply did not complete before the probe deadline')
                record=c.last_recording
                if not record:raise RuntimeError('No actual reply playback started')
                target=OUT/'real-reply-probe.mp3';OUT.mkdir(parents=True,exist_ok=True);shutil.copy2(record['path'],target)
        finally:
            d.stop();c.clear_queue_and_stop();c._synth_pool.shutdown(wait=True,cancel_futures=True);engine._client.close()
    begin=next(e for e in events if e['type']=='begin')
    ready=next((e['time']-received for e in logs if e.get('type')=='chat_reply'),None)
    spent=json.loads((engine.root/'budget.json').read_text())['reserved_usd']
    result=dict(version=1,created_at=datetime.now(timezone.utc).isoformat(),scope='single_real_model_and_paid_tts_muted_native_probe',
        input='Я просто смотрю, Винки. Можно я без разговоров побуду?',reply=record['text'],
        model=brain.model_name,provider=brain.api_url.split('/')[2],
        received_to_ready_sec=round(ready,3) if ready is not None else None,
        received_to_begin_sec=begin['at_sec'],target_8_sec_met=begin['at_sec']<=8,
        audio_clock=begin['event']['audio_clock'],volume=0,posted_to_chat=False,live_tiktok=False,
        agent_listened=False,extra_tts_spend_usd=round(spent-engine.baseline,6),probe_tts_cap_usd=.01,
        waveform_sha256=hashlib.sha256(target.read_bytes()).hexdigest(),audio_path=target.relative_to(ROOT).as_posix(),
        note='One observation, not a latency percentile or a quality acceptance of live replies.',events=events)
    save(OUT/'real-reply-probe.json',result)
    compact={k:v for k,v in result.items() if k!='events'};save(DOCS/'autonomous-live-reply-probe.json',compact)
    print(json.dumps(compact,ensure_ascii=False))
    return result


if __name__=='__main__':probe()
