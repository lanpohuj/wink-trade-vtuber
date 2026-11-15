"""Muted WKWebView result reactions. Simulated facts, existing MP3; no trades/TikTok/TTS."""
import base64,json,os,subprocess,sys,threading,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));os.environ['TIKTOK_USERNAME']=''
from winky import app
from winky.director import stream_director
FIXED=os.environ.get('WINKY_VERIFY_FIXED_FRAMING')=='1'
ARM_ROTATION=os.environ.get('WINKY_VERIFY_ARM_ROTATION')=='1'
EXPANDED=os.environ.get('WINKY_VERIFY_EXPANDED_SURFACE')=='1' or ARM_ROTATION
OUT=ROOT/('artifacts/avatar-arm-twist/native' if ARM_ROTATION else 'artifacts/avatar-expanded-surface/native' if EXPANDED else 'artifacts/avatar-fixed-framing/native' if FIXED else 'artifacts/avatar-win-reactions/native');OUT.mkdir(parents=True,exist_ok=True)
report={'samples':[],'errors':[],'scope':'isolated_native_simulated_result_existing_recording_muted'}
original=app.WinkyAPI.attach;closed=threading.Event()
if ARM_ROTATION:
    original_transparency=app.WinkyAPI.apply_native_transparency
    def apply_native_transparency(self):
        original_transparency(self)
        # Seed before installPerformance captures Math.random in its director.
        # This is confined to the test process; it makes both new gestures lead.
        self._avatar_js('Math.random=()=>0.999')
    app.WinkyAPI.apply_native_transparency=apply_native_transparency
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
            report['window']={'width':avatar.width,'height':avatar.height,'x':avatar.x,'y':avatar.y}
            report['viewport']=json.loads(avatar.evaluate_js('JSON.stringify({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})'))
            self._controller.enqueue_voice_event({'category':'NARRATE_ENGAGE','lang':'ru','event_id':'native-win-review','ttl_sec':15})
            start=time.monotonic();previous=0;pictures=set()
            while time.monotonic()-start<25:
                elapsed=time.monotonic()-start;seq=min(5,int(elapsed/4.8)+1)
                if seq!=previous:
                    context.update(connected=True,phase='RESULT',result='WIN',result_age_sec=0,result_key=f'native-test:{seq}:result')
                    self.publish_avatar_context();previous=seq
                    if ARM_ROTATION and seq==2:
                        self._controller.enqueue_voice_event({'category':'NARRATE_ENGAGE','lang':'ru','event_id':'native-arm-wave','ttl_sec':15})
                context['result_age_sec']=elapsed-(seq-1)*4.8
                state=avatar.evaluate_js('JSON.stringify(window.winkyPerformance.state)');state=json.loads(state) if isinstance(state,str) else state
                players=subprocess.run(['pgrep','-fl','/usr/bin/afplay'],capture_output=True,text=True).stdout.splitlines()
                report['samples'].append({'time':round(elapsed,3),'state':state,'afplay_count':len(players)})
                if ARM_ROTATION and state.get('gesture') in ('victory_jump','victory_wave'):
                    arms=avatar.evaluate_js('''JSON.stringify(['Right','Left'].map(side=>{
                        const name='Shibahu_'+side+'ForeArm',r=vtuber.baseRotations[name];
                        const rest=new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x,r.y,r.z));
                        const delta=rest.invert().multiply(vtuber.bones[name].quaternion.clone());
                        const hinge=new THREE.Quaternion(0,delta.y,0,delta.w).normalize();
                        return {side,off_hinge_deg:2*Math.acos(Math.min(1,Math.abs(delta.multiply(hinge.invert()).w)))*180/Math.PI};
                    }))''')
                    report['samples'][-1]['arms']=json.loads(arms)
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
if FIXED or EXPANDED:
    for key in ['distance','panX','panY','effectiveScale','requestedScale']:
        values=[s['state']['framing'][key] for s in report['samples']]
        assert max(values)-min(values)<1e-9,(key,min(values),max(values))
    assert all(s['state']['framing']['mode']==('expanded-portrait-surface' if EXPANDED else 'fixed-motion-envelope') for s in report['samples'])
if EXPANDED:
    assert report['window']['width']==1000 and report['window']['height']==920,report['window']
    assert report['viewport']['width']==1000 and report['viewport']['height']==920,report['viewport']
    assert all(.91<s['state']['framing']['effectiveScale']<.92 for s in report['samples'])
if ARM_ROTATION:
    arms=[a for s in report['samples'] for a in s.get('arms',[])]
    assert arms and max(a['off_hinge_deg'] for a in arms)<4
    assert {'victory_jump','victory_wave'}<={s['state']['gesture'] for s in report['samples'] if s.get('arms')}
    assert list(results.values())[:2]==['victory_jump','victory_wave'],results
    assert {'victory_jump','victory_wave'}<={s['state']['gesture'] for s in report['samples'] if s.get('arms') and s['state'].get('speaking')}
print(json.dumps({'samples':len(report['samples']),'results':results,'max_afplay':max(s['afplay_count'] for s in report['samples']),'errors':report['errors']}))
