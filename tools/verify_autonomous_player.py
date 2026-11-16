"""Muted local-player boundary check using accepted MP3s, isolated history, no TTS."""
import json
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from winky.speech_rotation import SpeechRotation
from winky.tts import SpeechController, SpeechItem, compute_rms_chunks


class NoSynthesis:
    name='rehearsal-existing-files'
    def synthesize(self,*args,**kwargs):
        raise AssertionError('This rehearsal cannot generate or purchase speech')


def main():
    out=ROOT/'artifacts/winky-autonomous';out.mkdir(parents=True,exist_ok=True)
    bank=ROOT/'assets/voices/conversation_pilot_v1'
    data=json.loads((bank/'manifest.json').read_text())
    records={r['id']:r for rows in data['categories'].values() for r in rows}
    events=[];start=time.monotonic()
    def receive(message):
        events.append({'at':round(time.monotonic()-start,4),**message})
    controller=SpeechController(on_speak=lambda *_:None,engine=NoSynthesis(),on_performance=receive)
    controller.voice_bank.rotation=SpeechRotation(out/'isolated-player-history.json')
    controller.set_volume(0)
    try:
        for identity in ('conversation_pilot_ru_01','conversation_pilot_ru_02'):
            row=records[identity]
            assert row['status']=='ready' and row['auditory_verified']
            path=bank/row['file']
            item=SpeechItem(text=row['text'],lang='ru',media_path=path,priority=3,
                            generation=controller._cancel_generation,source='local_muted_rehearsal',
                            event={'category':'CHAT_REPLY','viewer_key':'isolated-test','max_duration_sec':15})
            controller._play_media(path,item.text,'happy','ru',compute_rms_chunks(path),item=item)
        begins=[e for e in events if e['type']=='begin']
        ends=[e for e in events if e['type']=='end']
        measurements=[dict(duration=b['event']['duration'],wall_duration=e['at']-b['at'],
                           excess_sec=round(e['at']-b['at']-b['event']['duration'],4)) for b,e in zip(begins,ends)]
        (out/'actual-player-observations.json').write_text(json.dumps(dict(events=events,measurements=measurements),ensure_ascii=False,indent=2)+'\n')
        assert len(begins)==len(ends)==2
        assert begins[0]['event']['id']!=begins[1]['event']['id']
        assert ends[0]['at']<begins[1]['at']
        for begin,end in zip(begins,ends):
            identity=begin['event']['id'];assert end['id']==identity
            clocks=[e for e in events if e['type']=='clock' and e['id']==identity]
            assert len(clocks)>40
            assert [e['time'] for e in clocks]==sorted(e['time'] for e in clocks)
            # Wall time includes device initialisation. Keep its excess visible;
            # afplay exposes no audible-output timestamp to this test.
            assert end['at']-begin['at']>=begin['event']['duration']-.1
        report=dict(scope='real_local_player_muted_existing_files_no_visual_latency_measurement',
                    synthesis_requests=0,players=2,max_concurrent_task_players=1,events=events,
                    passed=True,agent_listened=False,measurements=measurements,
                    audible_onset_verified=False)
        (out/'actual-player-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print('PASS: two accepted files, one real muted player, unique begin/clock/end, zero synthesis.')
    finally:
        controller._synth_pool.shutdown(wait=True,cancel_futures=True)


if __name__=='__main__':
    main()
