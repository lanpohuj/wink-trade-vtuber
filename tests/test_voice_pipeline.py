import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from winky.voice_bank import VoiceBank
from winky.tts import SpeechController, SpeechItem


class VoicePipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        items = []
        for i in range(3):
            (self.root / f'{i}.mp3').write_bytes(b'audio' * 1000)
            items.append({'id': str(i), 'lang': 'ru', 'file': f'{i}.mp3',
                          'text': 'Закрытие завершено.', 'conditions': {}})
        (self.root / 'manifest.json').write_text(json.dumps({'categories': {'TRADE_WIN': items}}))
        self.bank = VoiceBank(self.root, self.root / 'history.json')
        self.controller = SpeechController(on_speak=Mock(), engine=Mock())
        self.controller.voice_bank = self.bank

    def tearDown(self):
        self.controller._synth_pool.shutdown(wait=False, cancel_futures=True)
        self.tmp.cleanup()

    def test_event_is_queued_once_without_interrupt(self):
        self.controller.stop_current = Mock()
        event = {'event_id': 's:1:result', 'category': 'trade_win', 'lang': 'ru'}
        self.assertTrue(self.controller.enqueue_voice_event(event)['ok'])
        self.assertTrue(self.controller.enqueue_voice_event(event)['duplicate'])
        self.assertEqual(len(self.controller._playback_queue), 1)
        self.controller.stop_current.assert_not_called()

    def test_unready_chat_does_not_block_ready_result(self):
        chat = SpeechItem(text='Привет!', lang='ru', priority=3)
        self.controller._playback_queue.append(chat)
        self.controller.enqueue_voice_event({'category': 'trade_win'})
        selected = self.controller._next_item()
        self.assertEqual(selected.priority, 0)
        self.assertEqual(list(self.controller._playback_queue), [chat])

    def test_deck_commits_only_started_recordings_and_survives_restart(self):
        event = {'category': 'TRADE_WIN', 'lang': 'ru'}
        used = []
        for _ in range(3):
            chosen = self.bank.reserve(event)
            used.append(chosen['id'])
            self.bank.release(chosen['id'], event, played=True)
        self.assertEqual(len(set(used)), 3)
        again = VoiceBank(self.root, self.root / 'history.json')
        self.assertNotEqual(again.reserve(event)['id'], used[-1])

    def test_missing_and_wrong_language_are_not_randomly_substituted(self):
        self.assertIsNone(self.bank.reserve({'category': 'TRADE_WIN', 'lang': 'en'}))
        self.assertIsNone(self.bank.reserve({'category': 'TRADE_WIN', 'file_id': 'missing'}))

    def test_expired_recording_releases_reservation(self):
        self.controller.enqueue_voice_event({'category': 'TRADE_WIN'})
        item = self.controller._playback_queue[0]
        item.created_at = time.time() - item.max_age_sec - 1
        self.assertIsNone(self.controller._next_item())
        self.assertFalse(self.bank.reserved)

    def test_playback_does_not_delete_permanent_bank_file(self):
        media = self.root / '0.mp3'
        proc = Mock()
        proc.poll.return_value = 0
        with patch('winky.tts.subprocess.Popen', return_value=proc), patch('winky.tts.time.sleep'):
            self.controller._play_media(media, 'Закрытие завершено.', 'happy', 'ru', [0.1])
        self.assertTrue(media.exists())

    def test_duplicate_finished_callback_does_not_stop_speech_or_clear_queue(self):
        self.controller._speaking = True
        self.controller._playback_queue.append(SpeechItem(text='Привет!', lang='ru'))
        self.controller.finish_current()
        self.controller.finish_current()
        self.assertTrue(self.controller._speaking)
        self.assertEqual(len(self.controller._playback_queue), 1)



class VoiceContextTests(unittest.TestCase):
    setUp = VoicePipelineTests.setUp
    tearDown = VoicePipelineTests.tearDown
    def add_category(self, category, lang='ru', conditions=None):
        manifest=json.loads((self.root/'manifest.json').read_text())
        manifest['categories'][category]=[{'id':category+lang,'lang':lang,'text':'Сделка открыта.' if lang=='ru' else 'The trade is open.', 'file':'0.mp3','conditions':conditions or {}}]
        (self.root/'manifest.json').write_text(json.dumps(manifest))

    def test_direction_selects_matching_bank_not_wrong_category(self):
        self.add_category('OPEN_TRADE_CALL',conditions={'direction':'BUY'})
        self.assertTrue(self.controller.enqueue_voice_event({'category':'OPEN_TRADE_PUT','direction':'CALL','open_observed':True})['ok'])
        self.assertEqual(self.controller._playback_queue[0].event['category'],'OPEN_TRADE_CALL')

    def test_unknown_direction_cannot_announce_opening(self):
        self.assertEqual(self.controller.enqueue_voice_event({'category':'OPEN_TRADE_CALL','direction':'???'})['error'],'opening_direction_unconfirmed')

    def test_old_pair_opening_is_discarded_but_result_is_retained(self):
        from winky.director import stream_director as director
        self.add_category('OPEN_TRADE_CALL')
        with patch.object(director,'context',{'trade_seq':2,'session_id':'s'}),patch.object(director,'_trade_phase','IN_TRADE'),patch.object(director,'_current_pair','GBPUSD_otc'):
            self.controller.enqueue_voice_event({'category':'OPEN_TRADE_CALL','direction':'BUY','open_observed':True,'pair':'EUR/USD OTC','trade_seq':1,'session_id':'s'})
            self.controller.enqueue_voice_event({'category':'TRADE_WIN','pair':'EUR/USD OTC','trade_seq':1,'session_id':'s'})
            self.assertEqual(self.controller._next_item().priority,0)
            self.assertIsNone(self.controller._next_item())

    def test_completed_trade_drops_queued_opening(self):
        from winky.director import stream_director as director
        self.add_category('OPEN_TRADE_CALL')
        self.controller.enqueue_voice_event({'category':'OPEN_TRADE_CALL','direction':'BUY','open_observed':True})
        with patch.object(director,'_trade_phase','RESULT'):
            self.assertIsNone(self.controller._next_item())

    def test_unknown_result_has_no_win_loss_fallback(self):
        self.assertFalse(self.controller.enqueue_voice_event({'category':'UNKNOWN'})['ok'])
        self.assertFalse(self.controller._playback_queue)

    def test_language_and_context_gate_records(self):
        self.add_category('OPEN_TRADE_CALL','en',{'direction':'BUY','expiry':'30s'})
        self.assertIsNone(self.bank.reserve({'category':'OPEN_TRADE_CALL','lang':'ru','direction':'BUY','expiry':'30s'}))
        self.assertIsNone(self.bank.reserve({'category':'OPEN_TRADE_CALL','lang':'en','direction':'BUY','expiry':'60s'}))
        self.assertIsNotNone(self.bank.reserve({'category':'OPEN_TRADE_CALL','lang':'en','direction':'BUY','expiry':'30s'}))

    def test_delayed_network_event_uses_original_timestamp(self):
        self.assertEqual(self.controller.enqueue_voice_event({'category':'TRADE_WIN','created_at':(time.time()-100)*1000,'ttl_sec':10})['error'],'expired_event')

    def test_explicit_stop_releases_deck_reservations(self):
        self.controller.enqueue_voice_event({'category':'TRADE_WIN'})
        self.controller.clear_queue_and_stop()
        self.assertFalse(self.bank.reserved)
        self.assertFalse(self.bank.history)

    def test_failed_playback_does_not_consume_deck(self):
        self.controller.enqueue_voice_event({'category':'TRADE_WIN'})
        item=self.controller._next_item()
        with patch('winky.tts.subprocess.Popen',side_effect=OSError('no audio device')),patch('winky.tts.compute_rms_chunks',return_value=[.1]),patch('winky.tts.time.sleep'):
            self.controller._process_item(item)
        self.assertFalse(self.bank.history)
        self.assertFalse(self.bank.reserved)

    def test_chat_waiting_window_is_checked_at_playback(self):
        from winky.director import stream_director as director
        item=SpeechItem(text='Привет!',lang='ru',priority=3,media_path=self.root/'0.mp3')
        item.ready_event.set();self.controller._playback_queue.append(item)
        with patch.object(director,'_trade_phase','IN_TRADE'),patch.object(director,'_remaining_sec',7),patch.object(director,'_last_phase_update',time.time()),patch('winky.tts.media_duration_seconds',return_value=6):
            self.assertIsNone(self.controller._next_item())
        with patch.object(director,'_trade_phase','IDLE'):
            self.assertIs(self.controller._next_item(),item)


class ChatPreparationTests(unittest.TestCase):
    def setUp(self):
        from winky.director import StreamDirector
        self.director=StreamDirector(brain=Mock(),tts=Mock())
    def tearDown(self):
        self.director.stop()
    def test_capacity_six_and_one_pending_per_viewer(self):
        with patch.object(self.director._chat_workers,'submit') as submit:
            for i in range(9): self.director.enqueue_chat_comment(str(i),'Привет '+str(i))
            self.director.enqueue_chat_comment('0','Как дела?')
            self.assertEqual(len(self.director._chat_queue),6)
            self.assertEqual(submit.call_count,6)
            self.assertEqual(self.director._chat_workers._max_workers,2)
    def test_repeated_message_is_merged(self):
        with patch.object(self.director._chat_workers,'submit') as submit:
            self.director.enqueue_chat_comment('Аня','Привет!')
            self.director.enqueue_chat_comment('Боря','привет!')
            self.assertEqual(submit.call_count,1)
    def test_twenty_second_preparation_finishes_without_occupying_speech_queue(self):
        from winky.director import ChatItem
        item=ChatItem('Аня','Привет!',created_at=100)
        self.director._brain.reply.return_value='Привет! Как настроение?'
        self.director._tts.engine.synthesize.return_value=Path('/tmp/reply.mp3')
        with patch('winky.director.time.time',side_effect=[100,120]): self.director._pre_synthesize(item)
        self.assertTrue(item.ready)
        self.director._tts.speak_chat_item.assert_not_called()
    def test_late_network_result_is_not_requeued(self):
        from winky.director import ChatItem
        item=ChatItem('Аня','Привет!',created_at=100)
        self.director._brain.reply.return_value='Привет!'
        with patch('winky.director.time.time',side_effect=[100,191]): self.director._pre_synthesize(item)
        self.assertTrue(item.failed)
        self.assertFalse(item.ready)
    def test_content_is_checked_before_and_after_model(self):
        with patch.object(self.director._chat_workers,'submit') as submit:
            self.director.enqueue_chat_comment('Котик','Внеси депозит прямо сейчас')
            submit.assert_not_called()
        from winky.director import ChatItem
        item=ChatItem('Аня','Привет!',reply_text='Сейчас отыграем все потери')
        self.director._pre_synthesize(item)
        self.assertTrue(item.failed)
        self.director._tts.engine.synthesize.assert_not_called()
    def test_ordinary_financial_words_are_not_replaced_with_euphemisms(self):
        from winky.censor import sanitize_for_tiktok
        text='Эта сделка закрылась в минус.'
        self.assertEqual(sanitize_for_tiktok(text),text)
        self.assertEqual(sanitize_for_tiktok('Я гарантирую прибыль!'),'')

class ProviderAndCompatibilityTests(unittest.TestCase):
    def test_lumean_failure_never_returns_random_cache_or_repeats_paid_create(self):
        import httpx
        from winky.tts import LumeanTTS, TTSError
        from config import settings
        with tempfile.TemporaryDirectory() as tmp:
            engine=LumeanTTS()
            engine.get_tuning=Mock(return_value={'template_id':'template'})
            engine.get_voice_dir=Mock(return_value=Path(tmp))
            engine.get_cache_path=Mock(return_value=Path(tmp)/'wanted.mp3')
            (Path(tmp)/'unrelated.mp3').write_bytes(b'x'*5000)
            response=httpx.Response(503,json={'message':'maintenance'},request=httpx.Request('POST','https://api.lumean.app/api/public/orders'))
            with patch.object(engine._client,'post',return_value=response) as post,patch.object(settings,'LUMEAN_API_KEY','test'),patch('winky.tts.time.sleep'):
                with self.assertRaises(TTSError): engine.synthesize('Привет!')
                self.assertEqual(post.call_count,1)
            engine._client.close()
    def test_compatibility_http_routes_share_dedup_queue(self):
        from functools import partial
        from http.server import ThreadingHTTPServer
        import threading, httpx
        from winky import server as routes
        controller=Mock()
        seen=set()
        def enqueue(payload):
            duplicate=payload['event_id'] in seen;seen.add(payload['event_id'])
            return {'ok':True,'duplicate':duplicate}
        old=dict(routes._winky_sync_callbacks)
        routes.register_winky_callback('play_voice',enqueue)
        routes.register_winky_callback('speak_stream_category',enqueue)
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(routes._AssetsHandler,directory=str(routes.WEB_DIR)))
        worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        try:
            url=f'http://127.0.0.1:{server.server_port}'
            with httpx.Client() as client:
                a=client.post(url+'/api/winky/play_voice',json={'event_id':'same'}).json()
                b=client.post(url+'/api/winky/speak_stream_category',json={'event_id':'same'}).json()
            self.assertFalse(a['duplicate']);self.assertTrue(b['duplicate']);self.assertEqual(len(seen),1)
        finally:
            server.shutdown();server.server_close();routes._winky_sync_callbacks.clear();routes._winky_sync_callbacks.update(old)
    def test_server_asgi_still_serves_miniapp(self):
        import asyncio,httpx
        from main import app
        async def check():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
                self.assertEqual((await client.get('/webapp/')).status_code,200)
        asyncio.run(check())


if __name__ == "__main__":
    unittest.main()
