"""One local, muted native acceptance run. Uses one real chat synthesis under the existing budget.
No TikTok connection, no trading commands, no persistent setting changes.
"""
import base64
import argparse
import dataclasses
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--tiktok',default='',help='Read one live account during the bounded test')
args=parser.parse_args()
sys.path.insert(0,str(ROOT))
os.environ['TIKTOK_USERNAME']=''
from winky import app
from winky.director import stream_director
from winky import server as avatar_server

OUT=ROOT/'artifacts/avatar-live-sync/native'
OUT.mkdir(parents=True,exist_ok=True)
report={'scope':'local_simulated_comment_real_llm_fish_afplay_wkwebview_muted','messages':[],
        'health':[],'synthesis':[],'errors':[],'avatar':[],'pair_requests_observed':0}
# Test viewers must never send a pair command to the owner's trading extension.
def observe_pair_request(*_):
    report['pair_requests_observed']+=1
avatar_server.push_chat_pair_request=observe_pair_request
started=time.monotonic()
lock=threading.Lock()
closing=threading.Event()
original_attach=app.WinkyAPI.attach


def relative():return round(time.monotonic()-started,3)

def save():
    with lock:(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')


def attach(self,avatar,panel):
    original_attach(self,avatar,panel)
    self._cta_enabled=False;stream_director.cta_enabled=False
    stream_director._next_commentary_at=float('inf');stream_director._commentary_attempt_at=float('inf')
    controller=self._controller
    original_callback=controller.on_performance
    original_synthesis=controller.engine.synthesize
    chat_ended=threading.Event();previewed=threading.Event()

    def synthesize(text,lang,*args,**kwargs):
        row={'start':relative(),'lang':lang,'text':text}
        try:
            media=original_synthesis(text,lang,*args,**kwargs)
            row.update(end=relative(),file=str(media))
            return media
        except Exception as error:
            row.update(end=relative(),error=type(error).__name__)
            raise
        finally:
            with lock:report['synthesis'].append(row)
            save()
    controller.engine.synthesize=synthesize

    def sample():
        try:
            state=avatar.evaluate_js('JSON.stringify(window.winkyPerformance?.state||{})')
            state=json.loads(state) if isinstance(state,str) else state
            with lock:report['avatar'].append({'at':relative(),'state':state})
            data=avatar.evaluate_js('window.winkyScreenshot ? window.winkyScreenshot() : null')
            if isinstance(data,str) and ',' in data:
                (OUT/'chat-pose.png').write_bytes(base64.b64decode(data.split(',',1)[1]))
        except Exception as error:
            with lock:report['errors'].append('avatar_sample:'+str(error))

    def callback(message):
        with lock:report['messages'].append({'at':relative(),**message})
        original_callback(message)
        if message['type']=='begin' and str(message['event'].get('source','')).startswith('chat_reply'):
            previewed.set();threading.Timer(1.6,sample).start()
        if message['type']=='end' and previewed.is_set():chat_ended.set()
    controller.on_performance=callback

    def close():
        if closing.is_set():return
        closing.set();save()
        avatar.destroy();panel.destroy()

    def run():
        try:
            deadline=time.monotonic()+25
            while not self._performance_ready and time.monotonic()<deadline:time.sleep(.1)
            if not self._performance_ready:raise RuntimeError('native performance bootstrap did not become ready')
            controller.set_volume(0)
            if args.tiktok:self.connect_tiktok(args.tiktok)
            observe_until=time.monotonic()+(25 if args.tiktok else 0)
            disconnected=not bool(args.tiktok)
            self._controller.enqueue_voice_event({'category':'NARRATE_ENGAGE','lang':'ru','event_id':'acceptance:neutral','ttl_sec':15})
            self.simulate_custom_comment('Тестовый зритель','Винки, ты такая милая! Как у тебя настроение?')
            deadline=time.monotonic()+100
            while time.monotonic()<deadline:
                if not disconnected and time.monotonic()>=observe_until:
                    self.disconnect_tiktok();disconnected=True
                if (chat_ended.is_set() and disconnected and not controller.speaking
                        and controller.queue_size()==0 and stream_director.chat_queue_status()['pending']==0):break
                processes=subprocess.run(['pgrep','-fl','/usr/bin/afplay'],capture_output=True,text=True).stdout.splitlines()
                status=self.speech_health()
                with lock:report['health'].append({'at':relative(),'afplay_count':len(processes),**status})
                save();time.sleep(.25)
            if not chat_ended.is_set():raise RuntimeError('chat did not reach natural audio end')
            if args.tiktok and not any(s['tiktok_status']=='connected' for s in report['health']):
                raise RuntimeError('the requested live TikTok connection was not observed')
            time.sleep(1)
            with lock:
                report['completed']=True
                report['max_afplay']=max((r['afplay_count'] for r in report['health']),default=0)
                report['ready']=self._performance_ready
                report['tiktok_account']=args.tiktok
                report['chat_counters']=self._chat_router.counters()
            save()
        except Exception as error:
            with lock:report['errors'].append(str(error))
        finally:
            if self._tiktok:self.disconnect_tiktok()
            close()
    threading.Thread(target=run,name='local-voice-acceptance',daemon=True).start()
    watchdog=threading.Timer(115,close);watchdog.daemon=True;watchdog.start()

app.WinkyAPI.attach=attach
try:app.main()
finally:save()
if report['errors'] or not report.get('completed') or report.get('max_afplay',0)>1:
    raise SystemExit('Native acceptance failed; see '+str(OUT/'report.json'))
print(json.dumps({'completed':report.get('completed'),'max_afplay':report.get('max_afplay'),
                  'synthesis_seconds':[round(r['end']-r['start'],3) for r in report['synthesis']],
                  'errors':report['errors']}))
