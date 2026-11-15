"""Real queue/controller contracts with virtual Fish/player delays; never trades or buys TTS."""
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from tests import test_voice_pipeline as fixtures
from winky.director import ChatItem, StreamDirector
from winky.tts import SpeechItem


class LiveSpeechTests(unittest.TestCase):
    setUp=fixtures.VoicePipelineTests.setUp
    tearDown=fixtures.VoicePipelineTests.tearDown

    def chat(self):
        item=SpeechItem(text='Спасибо за вопрос!',lang='ru',priority=3,media_path=self.root/'0.mp3')
        item.ready_event.set()
        return item

    def test_ready_chat_precedes_ready_result_without_changing_trade_context(self):
        from winky.director import stream_director
        original=dict(stream_director.context)
        self.controller.enqueue_voice_event({'category':'TRADE_WIN','event_id':'result'})
        chat=self.chat();self.controller._playback_queue.append(chat)
        with patch.object(stream_director,'_trade_phase','RESULT'):
            self.assertIs(self.controller._next_item(),chat)
            self.assertEqual(self.controller._next_item().event['category'],'TRADE_WIN')
        self.assertEqual(stream_director.context,original)

    def test_ready_gift_precedes_chat_answer_and_join_without_cutting_current_voice(self):
        reply=self.chat();join=self.chat();gift=self.chat()
        join.event={'chat_kind':'join'};gift.event={'chat_kind':'gift'}
        self.controller._playback_queue.extend([join,reply,gift]);self.controller._speaking=True
        self.assertIs(self.controller._next_item(),gift)
        self.assertIs(self.controller._next_item(),reply)
        self.assertIs(self.controller._next_item(),join)
        self.assertTrue(self.controller.speaking)

    def test_like_can_queue_while_speaking_and_wait_for_its_natural_slot(self):
        from winky.chat_router import ChatRouter
        tts=Mock();tts.speaking=True;tts.queue_size.return_value=2
        tts.voice_bank.candidates.return_value=[{}];tts.enqueue_voice_event.return_value={'ok':True}
        router=ChatRouter(Mock(),Mock(),tts,on_feed=Mock())
        router.handle_like('Аня',5)
        self.assertEqual(tts.enqueue_voice_event.call_args.args[0]['chat_kind'],'like')
        tts.stop_current.assert_not_called()

    def test_ready_chat_is_dispatched_during_current_speech_and_result_phase(self):
        tts=Mock();tts.speaking=True;tts.speak_chat_item.return_value=True;tts.narration_state.return_value={}
        d=StreamDirector(tts=tts)
        try:
            d._trade_phase='RESULT';d._last_phase_update=100
            item=ChatItem('Зритель','Привет',created_at=90,ready=True,media_path=self.root/'0.mp3')
            d._chat_queue.append(item)
            with patch('winky.tts.media_duration_seconds',return_value=4):d.tick(100)
            tts.speak_chat_item.assert_called_once_with(item)
            tts.stop_current.assert_not_called()
        finally:d.stop()

    def test_twenty_second_fish_delay_does_not_block_speech_and_ready_reply_is_next(self):
        origin=time.time();clock=[origin];entered=threading.Event();release=threading.Event()
        def synthesize(text,lang):
            entered.set();release.wait(3);return self.root/'0.mp3'
        self.controller.engine.synthesize.side_effect=synthesize
        brain=Mock();brain.reply.return_value='[happy] Спасибо за интересный вопрос!'
        d=StreamDirector(brain=brain,tts=self.controller)
        self.controller._speaking=True
        rotation=Mock();rotation.recent_texts.return_value=[]
        try:
            with patch('winky.director.time.time',side_effect=lambda:clock[0]),patch('winky.speech_rotation.shared_rotation',return_value=rotation),patch('winky.tts.compute_rms_chunks',return_value=[.2]*60),patch('winky.tts.media_duration_seconds',return_value=3):
                d.enqueue_chat_comment('Аня','Как у тебя настроение?')
                self.assertTrue(entered.wait(2));self.assertEqual(self.controller.queue_size(),0)
                self.controller.enqueue_voice_event({'category':'TRADE_WIN','event_id':'result'})
                self.assertEqual(self.controller._next_item().priority,0)
                self.controller.enqueue_voice_event({'category':'TRADE_WIN','event_id':'result2'})
                clock[0]+=20;release.set();d._chat_queue[0].future.result(2)
                self.assertTrue(d._chat_queue[0].ready)
                d.tick(clock[0])
                self.assertEqual(self.controller._next_item().priority,3)
                self.assertEqual(self.controller._next_item().priority,0)
                self.controller.engine.synthesize.assert_called_once_with('Спасибо за интересный вопрос!','ru')
        finally:release.set();d.stop();d._chat_workers.shutdown(wait=True)

    def test_stale_waiting_work_is_dropped_before_any_llm_or_fish_request(self):
        d=StreamDirector(brain=Mock(),tts=self.controller)
        try:
            item=ChatItem('Аня','Привет',created_at=100)
            with patch('winky.director.time.time',return_value=113):d._pre_synthesize(item)
            self.assertTrue(item.failed);d._brain.reply.assert_not_called();self.controller.engine.synthesize.assert_not_called()
        finally:d.stop()

    def test_stopped_inflight_fish_result_cannot_reenter_queue(self):
        entered=threading.Event();release=threading.Event()
        def synthesize(*_):entered.set();release.wait(3);return self.root/'0.mp3'
        self.controller.engine.synthesize.side_effect=synthesize
        d=StreamDirector(brain=Mock(),tts=self.controller);d._brain.reply.return_value='Хороший вопрос!'
        try:
            d.enqueue_chat_comment('Аня','Как настроение?');self.assertTrue(entered.wait(2))
            item=d._chat_queue[0];d.cancel_pending_chat();self.controller.clear_queue_and_stop()
            release.set();item.future.result(2)
            self.assertTrue(item.failed);self.assertFalse(item.ready);d.tick()
            self.assertEqual(self.controller.queue_size(),0)
        finally:release.set();d.stop();d._chat_workers.shutdown(wait=True)

    def test_reply_expiry_is_checked_again_after_fish(self):
        clock=[100]
        d=StreamDirector(brain=Mock(),tts=self.controller);d._brain.reply.return_value='Спасибо за вопрос!'
        def synthesize(*_):clock[0]=146;return self.root/'0.mp3'
        self.controller.engine.synthesize.side_effect=synthesize
        try:
            item=ChatItem('Аня','Привет',created_at=100)
            with patch('winky.director.time.time',side_effect=lambda:clock[0]):d._pre_synthesize(item)
            self.assertTrue(item.failed);self.assertFalse(item.ready)
        finally:d.stop()

    def test_old_results_and_old_openings_never_wait_for_hours_behind_chat(self):
        now=time.time()
        self.assertEqual(self.controller.enqueue_voice_event({'category':'TRADE_WIN','created_at':now-31})['error'],'expired_event')
        self.assertEqual(self.controller.enqueue_voice_event({'category':'OPEN_TRADE_CALL','direction':'BUY','created_at':now-6})['error'],'expired_event')

    def test_stop_invalidates_a_selected_item_before_player_start(self):
        self.controller.enqueue_voice_event({'category':'TRADE_WIN'})
        selected=self.controller._next_item();self.controller.clear_queue_and_stop()
        with patch('winky.tts.subprocess.Popen') as player:self.controller._process_item(selected)
        player.assert_not_called()

    def test_original_complete_audio_outlasts_short_rms_cache_without_interruption(self):
        clock=[0.0];messages=[];players=[];injected=[False]
        class Player:
            def __init__(self):self.started=clock[0];self.killed=False;players.append(self)
            def poll(self):return 0 if clock[0]-self.started>=12 or self.killed else None
            def wait(self,timeout=None):return 0
            def kill(self):self.killed=True
            def terminate(self):self.killed=True
        def sleep(seconds):
            clock[0]+=seconds
            if clock[0]>.5 and not injected[0]:
                injected[0]=True
                self.controller.enqueue_voice_event({'category':'TRADE_WIN','event_id':'queued-result'})
                self.controller._playback_queue.append(self.chat())
                self.controller.finish_current()  # stale JS completion cannot cut the player
        self.controller.on_performance=messages.append
        self.controller.on_action=Mock();self.controller.on_emotion=Mock()
        item=SpeechItem(text='Эту фразу нужно произнести полностью.',lang='ru',generation=0)
        with patch('winky.tts.media_duration_seconds',return_value=12),patch('winky.tts.subprocess.Popen',side_effect=lambda *a,**kw:Player()),patch('winky.tts.time.monotonic',side_effect=lambda:clock[0]),patch('winky.tts.time.sleep',side_effect=sleep):
            self.controller._play_media(self.root/'0.mp3',item.text,'happy','ru',[.2],item)
        self.assertFalse(players[0].killed);self.assertEqual(len(players),1)
        self.assertGreaterEqual(clock[0],12);self.assertEqual(messages[0]['type'],'begin');self.assertEqual(messages[-1]['type'],'end')
        self.assertGreater(max(m['time'] for m in messages if m['type']=='clock'),11.8)
        self.controller.on_speak.assert_not_called();self.controller.on_action.assert_not_called();self.controller.on_emotion.assert_not_called()
        self.assertEqual(self.controller._next_item().priority,3)
        self.assertEqual(self.controller._next_item().priority,0)

    def test_motion_tags_are_not_sent_to_fish_and_keep_their_animation(self):
        with patch.object(self.controller._synth_pool,'submit'):
            self.controller.speak('[hand_heart] Спасибо тебе!','ru',source='chat')
        item=self.controller._playback_queue[0]
        self.assertEqual(item.text,'Спасибо тебе!');self.assertEqual(item.emotion,'hand_heart')

    def test_loading_avatar_receives_only_the_current_speech_and_latest_clock(self):
        from winky.app import WinkyAPI
        api=WinkyAPI(self.controller,Mock());api._avatar_js=Mock()
        api.deliver_performance({'type':'begin','event':{'id':'active'}})
        for n in range(3):api.deliver_performance({'type':'clock','id':'active','time':n})
        api._avatar_js.assert_not_called()
        api.report_performance_ready({'release':'speech-sync-v1'})
        self.assertEqual(api._avatar_js.call_count,2)
        self.assertIn('"time": 2',api._avatar_js.call_args.args[0])

    def test_phrase_that_ended_during_avatar_load_is_never_replayed(self):
        from winky.app import WinkyAPI
        api=WinkyAPI(self.controller,Mock());api._avatar_js=Mock()
        api.deliver_performance({'type':'begin','event':{'id':'old'}})
        api.deliver_performance({'type':'end','id':'old'})
        api.report_performance_ready({'release':'speech-sync-v1'})
        api._avatar_js.assert_not_called()

    def test_idle_options_survive_a_phrase_finishing_while_model_loads(self):
        from winky.app import WinkyAPI
        api=WinkyAPI(self.controller,Mock());api._send_performance=Mock()
        api.deliver_performance({'type':'context','context':{'preparing':2}})
        api.set_avatar_idle(False)
        api.deliver_performance({'type':'begin','event':{'id':'old'}})
        api.deliver_performance({'type':'end','id':'old'})
        api.report_performance_ready({'release':'speech-sync-v1'})
        messages=[c.args[0] for c in api._send_performance.call_args_list]
        self.assertEqual([m['type'] for m in messages],['context','idle-enabled'])
        self.assertFalse(messages[-1]['enabled'])

    def test_avatar_context_reads_received_facts_without_changing_the_trader(self):
        from winky.app import WinkyAPI
        from winky.director import stream_director
        now=time.time();context={'last_result':{'outcome':'LOSS','closed_at':(now-4)*1000}}
        api=WinkyAPI(self.controller,Mock());api._performance_ready=True;api._send_performance=Mock()
        with patch.object(stream_director,'context',context),patch.object(stream_director,'_trade_phase','IN_TRADE'),patch.object(stream_director,'_last_phase_update',now):
            api.publish_avatar_context();message=api._send_performance.call_args.args[0]
            self.assertEqual(message['type'],'context');self.assertEqual(message['context']['phase'],'IN_TRADE')
            self.assertTrue(message['context']['connected']);self.assertEqual(message['context']['result'],'LOSS')
            self.assertAlmostEqual(message['context']['result_age_sec'],4,delta=.2)
            self.assertEqual(stream_director.context,context)
            self.assertEqual(self.controller.queue_size(),0)


if __name__=='__main__':unittest.main()
