"""Isolated WKWebView + native audio playhead, muted accepted files, no live services."""
import base64
from functools import partial
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import statistics
import sys
import threading
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import webview
from winky.server import _AssetsHandler, WEB_DIR
from winky.speech_rotation import SpeechRotation
from winky.tts import SpeechController, SpeechItem, compute_rms_chunks
from verify_autonomous_player import NoSynthesis

OUT=ROOT/'artifacts/winky-autonomous';OUT.mkdir(parents=True,exist_ok=True)
ready=threading.Event()
report={'scope':'isolated_native_WKWebView_muted_native_playhead','samples':[],
        'errors':[],'synthesis_requests':0,'acoustic_latency_measured':False}


class API:
    window=None
    def report_performance_ready(self,payload):
        if payload.get('release')=='speech-sync-v1':
            ready.set()
    def apply_native_transparency(self):
        # Match the production overlay, including full-screen desktop behavior.
        from PyObjCTools import AppHelper
        def configure():
            import AppKit
            from Foundation import NSColor
            native=self.window.native
            native.contentView().setValue_forKey_(False,'drawsBackground')
            native.contentView().setValue_forKey_(NSColor.clearColor(),'underPageBackgroundColor')
            native.setOpaque_(False);native.setBackgroundColor_(NSColor.clearColor())
            native.setLevel_(AppKit.NSFloatingWindowLevel)
            native.setCollectionBehavior_((1 << 0) | (1 << 8))
        AppHelper.callAfter(configure)
        return True


def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(_AssetsHandler,directory=str(WEB_DIR)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    api=API()
    window=webview.create_window('Winky — локальная проверка синхронизации',
                                f'http://127.0.0.1:{server.server_port}/avatar.html',
                                width=1000,height=920,on_top=True,frameless=True,transparent=True,js_api=api)
    api.window=window
    def run():
        controller=None
        try:
            if not ready.wait(30):
                raise RuntimeError('Native avatar did not become ready')
            window.evaluate_js("window.__nativeReviewErrors=[]; window.addEventListener('error',e=>__nativeReviewErrors.push(e.message)); window.__nativeReviewFrames=0; const originalReviewUpdate=vtuber.update.bind(vtuber); vtuber.update=(...args)=>{__nativeReviewFrames++;return originalReviewUpdate(...args);};")
            def receive(message):
                payload=json.dumps(message,ensure_ascii=False)
                state=window.evaluate_js(f'window.winkyPerformance.receive({payload}); JSON.stringify({{...window.winkyPerformance.state, visibility:document.visibilityState, review_errors:__nativeReviewErrors, frame_count:__nativeReviewFrames}})')
                if isinstance(state,str):state=json.loads(state)
                report['samples'].append({'message':message,'state':state})
            controller=SpeechController(on_speak=lambda *_:None,engine=NoSynthesis(),on_performance=receive)
            controller.voice_bank.rotation=SpeechRotation(OUT/'isolated-native-history.json')
            controller.set_volume(0)
            folder=ROOT/'assets/voices/conversation_pilot_v1'
            manifest=json.loads((folder/'manifest.json').read_text())
            records={r['id']:r for rows in manifest['categories'].values() for r in rows}
            for identity in ('conversation_pilot_ru_01','conversation_pilot_ru_02'):
                row=records[identity]
                assert row['status']=='ready' and row['auditory_verified']
                path=folder/row['file']
                item=SpeechItem(text=row['text'],lang='ru',media_path=path,priority=3,generation=0,
                                source='isolated_native_rehearsal',event={'category':'CHAT_REPLY','max_duration_sec':15})
                controller._play_media(path,item.text,'happy','ru',compute_rms_chunks(path),item=item)
            samples=report['samples']
            report['visibility_counts']={v:sum(s['state'].get('visibility')==v for s in samples) for v in ('visible','hidden')}
            report['window_mode']='floating_all_spaces_fullscreen_auxiliary'
            begins=[s['message']['event'] for s in samples if s['message']['type']=='begin']
            assert len(begins)==2 and all(b['audio_clock']=='native_playhead' for b in begins)
            drift=[abs(s['message']['time']-s['state'].get('time',0)) for s in samples
                   if s['message']['type']=='clock' and s['state'].get('id')==s['message']['id']]
            assert len(drift)>50
            assert report['visibility_counts']['hidden']==0, report['visibility_counts']
            report['frame_clock_drift_ms']={'median':round(statistics.median(drift)*1000,2),
                                          'p95':round(sorted(drift)[int(.95*(len(drift)-1))]*1000,2),
                                          'max':round(max(drift)*1000,2)}
            report['native_clocks_verified']=True
            # This is transport-to-render timing, not a microphone measurement.
            assert report['frame_clock_drift_ms']['p95']<150, report['frame_clock_drift_ms']
            assert any(s['state'].get('speaking') for s in samples)
            picture=window.evaluate_js('window.winkyScreenshot()')
            (OUT/'native-final.png').write_bytes(base64.b64decode(picture.split(',',1)[1]))
            report['passed']=True
        except Exception as error:
            report['errors'].append(f'{type(error).__name__}: {error}')
        finally:
            if controller:
                controller._synth_pool.shutdown(wait=True,cancel_futures=True)
            (OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
            window.destroy();server.shutdown()
    watchdog=threading.Timer(55,window.destroy);watchdog.daemon=True;watchdog.start()
    webview.start(run,gui='cocoa',debug=False)
    watchdog.cancel()
    assert report.get('passed') and not report['errors'],report['errors']
    print(json.dumps({'passed':True,'frame_clock_drift_ms':report['frame_clock_drift_ms'],'synthesis_requests':0}))


if __name__=='__main__':
    main()
