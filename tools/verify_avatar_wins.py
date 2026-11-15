"""Muted WKWebView result reactions. Simulated facts, existing MP3; no trades/TikTok/TTS."""
import base64,json,os,subprocess,sys,threading,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));os.environ['TIKTOK_USERNAME']=''
from winky import app
from winky.director import stream_director
FIXED=os.environ.get('WINKY_VERIFY_FIXED_FRAMING')=='1'
OUT=ROOT/('artifacts/avatar-fixed-framing/native' if FIXED else 'artifacts/avatar-win-reactions/native');OUT.mkdir(parents=True,exist_ok=True)
report={'samples':[],'errors':[],'scope':'isolated_native_simulated_result_existing_recording_muted'}
original=app.WinkyAPI.attach;closed=threading.Event()
def attach(self,avatar,panel):
    original(self,avatar,panel)
    self._cta_enabled=False;stream_director.cta_enabled=False;stream_director._next_commentary_at=float('inf');stream_director._commentary_attempt_at=float('inf')
    context={}
    self.publish_avatar_context=lambda:self.deliver_performance({'type':'context','context':dict(context)})
    def save():(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    def close():
        if closed.is_set():return
        closed.set();save();avatar.destroy();panel.destroy()
    def run():
        try:
            deadline=time.monotonic()+25
            while not self._performance_ready and time.monotonic()<deadline:time.sleep(.1)
            if not self._performance_ready:raise RuntimeError('avatar not ready')
            self._controller.set_volume(0);self.set_avatar_idle(False);self.set_avatar_scale(1.5)
            self._controller.enqueue_voice_event({'category':'NARRATE_ENGAGE','lang':'ru','event_id':'native-win-review','ttl_sec':15})
            start=time.monotonic();previous=0;pictures=set()
            while time.monotonic()-start<25:
                elapsed=time.monotonic()-start;seq=min(5,int(elapsed/4.8)+1)
                if seq!=previous:
                    context.update(connected=True,phase='RESULT',result='WIN',result_age_sec=0,result_key=f'native-test:{seq}:result')
                    self.publish_avatar_context();previous=seq
                context['result_age_sec']=elapsed-(seq-1)*4.8
                state=avatar.evaluate_js('JSON.stringify(window.winkyPerformance.state)');state=json.loads(state) if isinstance(state,str) else state
                players=subprocess.run(['pgrep','-fl','/usr/bin/afplay'],capture_output=True,text=True).stdout.splitlines()
                report['samples'].append({'time':round(elapsed,3),'state':state,'afplay_count':len(players)})
                if state.get('phase')=='celebration' and state.get('poseTime',0)>1 and seq not in pictures:
                    data=avatar.evaluate_js('window.winkyScreenshot()');(OUT/f'result-{seq}.png').write_bytes(base64.b64decode(data.split(',',1)[1]));pictures.add(seq)
                save();time.sleep(.2)
            report['complete']=True
        except Exception as e:report['errors'].append(str(e))
        finally:close()
    threading.Thread(target=run,daemon=True).start();timer=threading.Timer(65,close);timer.daemon=True;timer.start()
app.WinkyAPI.attach=attach
app.main()
assert report.get('complete') and not report['errors'],report['errors']
results={s['state']['celebration']:s['state']['gesture'] for s in report['samples'] if s['state'].get('celebration')}
assert len(results)==5 and len(set(results.values()))==5,results
assert max(s['afplay_count'] for s in report['samples'])<=1
assert any(s['state'].get('speaking') and s['state'].get('celebration') for s in report['samples'])
if FIXED:
    for key in ['distance','panX','panY','effectiveScale','requestedScale']:
        values=[s['state']['framing'][key] for s in report['samples']]
        assert max(values)-min(values)<1e-9,(key,min(values),max(values))
    assert all(s['state']['framing']['mode']=='fixed-motion-envelope' for s in report['samples'])
print(json.dumps({'samples':len(report['samples']),'results':results,'max_afplay':max(s['afplay_count'] for s in report['samples']),'errors':report['errors']}))
