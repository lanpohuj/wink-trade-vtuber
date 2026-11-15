"""Muted native avatar check with one existing recording. No TikTok or paid synthesis."""
import base64
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));os.environ['TIKTOK_USERNAME']=''
from winky import app
from winky.director import stream_director
OUT=ROOT/'artifacts/avatar-framing-idle/native';OUT.mkdir(parents=True,exist_ok=True)
report={'samples':[],'errors':[],'scope':'native_WKWebView_existing_recording_muted_no_trade_commands'}
original=app.WinkyAPI.attach;closed=threading.Event()

def attach(self,avatar,panel):
    original(self,avatar,panel)
    self._cta_enabled=False;stream_director.cta_enabled=False;stream_director._next_commentary_at=float('inf');stream_director._commentary_attempt_at=float('inf')
    context={}
    self.publish_avatar_context=lambda:self.deliver_performance({'type':'context','context':dict(context)})
    def save():
        (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    def close():
        if closed.is_set():return
        closed.set();save();avatar.destroy();panel.destroy()
    def run():
        try:
            deadline=time.monotonic()+25
            while not self._performance_ready and time.monotonic()<deadline:time.sleep(.1)
            if not self._performance_ready:raise RuntimeError('avatar not ready')
            self._controller.set_volume(0);self.set_avatar_idle(True);self.set_avatar_scale(.5)
            start=time.monotonic();applied=set();pictures=set()
            while time.monotonic()-start<32:
                elapsed=time.monotonic()-start
                if elapsed>=4 and 1 not in applied:self.set_avatar_scale(1);applied.add(1)
                if elapsed>=8 and 2 not in applied:self.set_avatar_scale(1.5);applied.add(2)
                if elapsed>=10 and 3 not in applied:
                    self._controller.enqueue_voice_event({'category':'NARRATE_ENGAGE','lang':'ru','event_id':'framing-native','ttl_sec':15});applied.add(3)
                if elapsed>=23:context.update(connected=True,phase='IN_TRADE')
                state=avatar.evaluate_js('JSON.stringify(window.winkyPerformance.state)');state=json.loads(state) if isinstance(state,str) else state
                players=subprocess.run(['pgrep','-fl','/usr/bin/afplay'],capture_output=True,text=True).stdout.splitlines()
                report['samples'].append({'time':round(elapsed,3),'state':state,'afplay_count':len(players)})
                for at,label in [(3,'zoom-50'),(7,'zoom-100'),(9,'zoom-150'),(28,'attentive')]:
                    if elapsed>=at and label not in pictures:
                        data=avatar.evaluate_js('window.winkyScreenshot()')
                        (OUT/(label+'.png')).write_bytes(base64.b64decode(data.split(',',1)[1]));pictures.add(label)
                save();time.sleep(.25)
            deadline=time.monotonic()+10
            while self._controller.speaking and time.monotonic()<deadline:time.sleep(.1)
            report['complete']=True
        except Exception as error:report['errors'].append(str(error))
        finally:close()
    threading.Thread(target=run,daemon=True).start()
    watchdog=threading.Timer(60,close);watchdog.daemon=True;watchdog.start()
app.WinkyAPI.attach=attach
app.main()
assert report.get('complete') and not report['errors'],report['errors']
assert max(s['afplay_count'] for s in report['samples'])<=1
assert any(s['state'].get('speaking') for s in report['samples'])
assert any(s['state'].get('idle') for s in report['samples'])
print(json.dumps({'samples':len(report['samples']),'max_afplay':max(s['afplay_count'] for s in report['samples']),
                  'idle_motions':sorted({s['state']['idle'] for s in report['samples'] if s['state'].get('idle')}),'errors':report['errors']}))
