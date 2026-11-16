"""Event collisions and bounded conversation memory; no TTS or trading calls."""
import unittest
from winky.conversation import Conversation
from winky.director import StreamDirector
from winky.speech_policy import SpeechArbiter
from winky.tts import SpeechItem


def item(kind, viewer='', created=100):
    event = {'viewer_key': viewer}
    if kind == 'result':
        event['category'] = 'TRADE_WIN'
    elif kind == 'social':
        event.update(category='CHAT_REACTION', chat_kind='gift')
    else:
        event.update(category='CHAT_REPLY', comment='Реальный вопрос', text='Состоявшийся ответ')
    return SpeechItem('Состоявшийся ответ', 'ru', priority=0 if kind == 'result' else 3,
                      event=event, created_at=created)


class ArbitrationTests(unittest.TestCase):
    def test_new_chat_then_one_fresh_result_then_next_viewer(self):
        arb = SpeechArbiter()
        a, b, result, gift = item('reply','a'), item('reply','b'), item('result'), item('social')
        self.assertIs(arb.choose([result,gift,a,b])[0], a)
        arb.started(a, 100)
        self.assertIs(arb.choose([result,gift,b])[0], result)
        arb.started(result, 101)
        self.assertIs(arb.choose([gift,b])[0], b)

    def test_one_thanks_cannot_create_unbounded_gift_chain(self):
        arb = SpeechArbiter()
        a, b, gift = item('reply','a'), item('reply','b'), item('social')
        arb.started(a,100)
        self.assertIs(arb.choose([gift,b])[0], gift)
        arb.started(gift,101)
        self.assertEqual(arb.choose([item('social'),b])[0], b)

    def test_selection_and_cancellation_do_not_consume_a_turn(self):
        arb = SpeechArbiter()
        a, result = item('reply','a'), item('result')
        for _ in range(3):
            self.assertIs(arb.choose([a,result])[0],a)
        arb.started(a,100)
        self.assertIs(arb.choose([result,item('reply','b')])[0],result)

    def test_new_participant_precedes_previously_answered_viewer(self):
        arb = SpeechArbiter()
        arb.started(item('reply','a'),100)
        a,b=item('reply','a',101),item('reply','b',102)
        self.assertIs(arb.choose([a,b])[0],b)

    def test_two_hour_virtual_load_has_bounded_memory_and_no_chat_starvation(self):
        arb = SpeechArbiter()
        for n in range(7200):
            reply = item('reply',str(n),n)
            ready = [reply,item('result',created=n),item('social',created=n)]
            interludes = 0
            while ready:
                selected, _ = arb.choose(ready)
                ready.remove(selected)
                if selected is reply:
                    self.assertLessEqual(interludes,1)
                    arb.started(selected,n)
                    break
                interludes += 1
                arb.started(selected,n)
            self.assertLessEqual(len(arb.viewers),512)


class PlaybackMemoryTests(unittest.TestCase):
    def test_only_playback_commits_viewer_topic_and_interruption(self):
        state = Conversation()
        state.comment(100)
        self.assertFalse(state.context('a',101)['spoken_turns'])
        reply = dict(category='CHAT_REPLY', viewer_key='a', comment='Откуда музыка?',
                     text='Название видно на экране.', duration_sec=6)
        state.started(reply,102)
        state.started(dict(category='CHAT_REACTION',chat_kind='gift'),106)
        context=state.context('a',107)
        self.assertEqual(context['spoken_turns'][0]['comment'],'Откуда музыка?')
        self.assertEqual(context['interrupted_by'],'gift')
        self.assertFalse(state.context('b',107)['spoken_turns'])
        self.assertFalse(state.context('b',107)['interrupted_by'])
        state.started(reply,108)
        self.assertFalse(state.context('a',109)['interrupted_by'])

    def test_history_is_bounded_and_old_session_turns_expire(self):
        state=Conversation()
        for n in range(100):
            state.started(dict(category='CHAT_REPLY',viewer_key='a',comment=str(n),text='Ответ'),n)
        self.assertEqual(len(state.turns),48)
        self.assertEqual(len(state.context('a',100)['spoken_turns']),4)
        self.assertFalse(state.context('a',7400)['spoken_turns'])

    def test_older_result_is_rejected_but_new_result_before_heartbeat_is_allowed(self):
        d=StreamDirector()
        try:
            d.context=dict(session_id='s',last_result=dict(seq=5,outcome='WIN'))
            self.assertFalse(d.event_allowed(dict(category='TRADE_WIN',session_id='s',trade_seq=4)))
            self.assertTrue(d.event_allowed(dict(category='TRADE_LOSS',session_id='s',trade_seq=6)))
        finally:
            d.stop()

    def test_no_opening_announcement_over_pending_conversation(self):
        d=StreamDirector()
        try:
            d.conversation.comment(100)
            self.assertFalse(d.event_allowed(dict(category='OPEN_TRADE_CALL'),101))
            self.assertTrue(d.event_allowed(dict(category='TRADE_WIN'),101))
        finally:
            d.stop()
