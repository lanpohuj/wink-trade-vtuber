"""Virtual two-hour phrase-routing rehearsal. No audio, TTS, TikTok or trading calls."""
import json
from collections import Counter
from pathlib import Path
import sys
import tempfile
from random import Random
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.build_autonomous_runtime_catalog import DOCS, compile_catalog
from winky.commentary import choices
from winky.conversation import Conversation
from winky.editorial import annotate
from winky.phrase_context import speech_context, rejection_reason
from winky.speech_rotation import SpeechRotation


def rehearse(rows, mixed=False, duration=7200):
    spoken = []; cancelled = Counter(); state = Conversation(); next_free = 0; last_end = 0
    queue = []; last_result = {}; current = {}; phase = 'IDLE'
    with tempfile.TemporaryDirectory() as tmp, patch('winky.speech_rotation.random.uniform', return_value=240), \
            patch('winky.speech_rotation.random.choice', side_effect=Random(16).choice):
        rotation = SpeechRotation(Path(tmp)/'history.json')
        rotation.state['next_cta_at'] = 1240
        def enqueue(category, now, **extra):
            event = dict(session_id='virtual', lang='ru', trade_seq=current['trade_seq'],
                         search_generation=current['search_generation'], category=category, created_at=now, **extra)
            facts = speech_context(event, current, phase, now, now, dialogue_active=state.active(now),
                                   cta_due=rotation.cta_due(now))
            candidates = [r for r in rows if r['category'] == category and not rejection_reason(r, facts)]
            if extra.get('purpose'):
                candidates = [r for r in candidates if r['purpose'] == extra['purpose']]
            if not candidates or not state.permits(event, now):
                return
            chosen = rotation.reserve(candidates, 'ru:'+category, now=now)
            if chosen:
                queue.append(dict(record=chosen, event={**event, 'purpose': chosen['purpose']}, expires=now+chosen['ttl_sec']))
        for offset in range(duration):
            now = 1000+offset; cycle, beat = divmod(offset, 120); trade = cycle+1
            phase = 'ANALYZING' if beat < 20 else 'IN_TRADE' if beat < 80 else 'RESULT' if beat == 80 else 'COOLDOWN'
            if beat == 80:
                last_result = dict(seq=trade, outcome=('WIN', 'LOSS', 'REFUND')[cycle % 3], closed_at=now)
            current = dict(auto_stream=True, session_id='virtual', lang='ru', trade_seq=trade,
                           search_generation=trade, direction='BUY' if cycle%2 else 'SELL',
                           open_observed=phase == 'IN_TRADE', remaining_sec=max(0,80-beat) if phase == 'IN_TRADE' else 0,
                           high_volatility=beat == 35, market_observed_at=now if beat == 35 else now-10,
                           last_result=last_result, next_stake=110 if last_result.get('outcome') == 'LOSS' else 50)
            # First 15 minutes are always silent; the second run adds real-message fixtures.
            if mixed and offset >= 900 and beat in (12, 42):
                state.comment(now)
                event = dict(category='CHAT_REPLY', chat_kind='comment', comment='Привет!', lang='ru',
                             purpose='chat_greeting', created_at=now)
                facts = speech_context(event, current, phase, now, now)
                pool = [r for r in rows if r['category']=='CHAT_REPLY' and not rejection_reason(r,facts)]
                chosen = rotation.reserve(pool, 'ru:CHAT_REPLY', now=now)
                if chosen: queue.append(dict(record=chosen,event=event,expires=now+25))
            if mixed and offset >= 900 and beat == 44:
                enqueue('CHAT_REACTION', now, chat_kind='gift')
            if beat == 20 and not state.active(now):
                enqueue('OPEN_TRADE_CALL' if current['direction']=='BUY' else 'OPEN_TRADE_PUT', now)
            if beat == 80:
                enqueue('TRADE_'+last_result['outcome'], now)
            if now >= next_free:
                while queue:
                    # Chat first; one short result/thanks can follow at its boundary.
                    queue.sort(key=lambda q: (0 if q['event']['category']=='CHAT_REPLY' else 1,
                                              q['event']['created_at']))
                    pending=queue.pop(0);r=pending['record'];event=pending['event']
                    facts=speech_context(event,current,phase,now,now,dialogue_active=state.active(now),
                                         cta_due=rotation.cta_due(now))
                    reason=('expired' if now>pending['expires'] else rejection_reason(r,facts))
                    if not state.permits(event,now):reason='episode_already_spoken'
                    if reason:
                        cancelled[reason]+=1;rotation.release(r['id'],played=False,now=now);continue
                    rotation.release(r['id'],played=True,now=now);state.started(event,now)
                    spoken.append(dict(at=offset,id=r['id'],category=r['category'],text=r['text'],
                                       episode=event.get('episode_key'),trade_seq=trade))
                    next_free=now+2;last_end=next_free
                    break
            if now >= next_free and now-last_end >= 10 and not state.active(now) and not queue:
                if rotation.cta_due(now):
                    enqueue('NARRATE_CTA',now)
                else:
                    for category,key,scope,extra,_ in choices(current,phase,now):
                        if category=='NARRATE_ENGAGE':continue  # Four rejected cards stay absent.
                        enqueue(category,now,episode_key=key,**extra)
        ads=[r['at'] for r in spoken if r['category']=='NARRATE_CTA']
        assert all(b-a>=180 for a,b in zip(ads,ads[1:]))
        assert not any('moment_question' in r['id'] for r in spoken)
        assert not any(r['id'].endswith(('win_09','win_10','refund_06')) for r in spoken)
        return dict(duration_sec=duration,mode='mixed_fixture_chat' if mixed else 'quiet_chat',
                    scope='virtual_text_selection_only',audio_played=False,network_requests=0,
                    counts=dict(Counter(r['category'] for r in spoken)),spoken=len(spoken),
                    first_15_minutes=dict(Counter(r['category'] for r in spoken if r['at']<900)),
                    cancelled=dict(cancelled),cta_gaps_sec=[b-a for a,b in zip(ads,ads[1:])],
                    pending_at_end=len(queue),episode_memory_size=len(state.spoken_episodes),trace=spoken)


def main():
    catalog=compile_catalog(json.loads((DOCS/'autonomous-bank-ru-approved.json').read_text()))
    rows=[annotate(r) for r in catalog['records']]
    result=dict(version=1,scope='synthetic_routing_not_full_stream_acceptance',
                model_latency_verified=False,avatar_verified=False,owner_delivery_approved=False,
                runs=[rehearse(rows),rehearse(rows,mixed=True)])
    (DOCS/'autonomous-context-rehearsal.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps([{k:v for k,v in run.items() if k!='trace'} for run in result['runs']],ensure_ascii=False))


if __name__ == '__main__':main()
