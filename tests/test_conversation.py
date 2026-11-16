"""Offline rehearsal of the new editorial and episode contract; no paid requests."""
import json
import tempfile
import time
import unittest
from collections import Counter
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from winky.conversation import Conversation
from winky.director import ChatItem, StreamDirector
from winky.editorial import ROOT, approved, recording_allowed, reply_allowed, text_allowed
from winky.speech_rotation import SpeechRotation, fingerprint
from winky.tts import SpeechController, SpeechItem
from winky.voice_bank import VoiceBank


class EditorialTests(unittest.TestCase):
    def test_every_owner_decision_is_enforced_and_english_is_not_auto_approved(self):
        review = json.loads((ROOT / 'docs/voice-audit/conversation-v1/owner-review.json').read_text())['items']
        original = [r for r in review if not r['id'].startswith(('conversation_', 'autonomous_'))]
        self.assertEqual(Counter(r['status'] for r in original), dict(bad=828, good=39, ref=3, change=2))
        latest = {fingerprint(row['text']): row for row in review}
        for row in latest.values():
            self.assertEqual(approved(row['text']), row['status'] in ('good', 'ref'), row['id'])
            if row['status'] in ('bad', 'change'):
                self.assertFalse(text_allowed(row['text']))
                self.assertFalse(reply_allowed(row['text']))
        bank = json.loads((ROOT / 'assets/voices/lively_v3/manifest.json').read_text())
        for rows in bank['categories'].values():
            for row in rows:
                if row['lang'] == 'en':
                    self.assertFalse(recording_allowed(row['text'], ROOT / 'assets/voices/lively_v3'))

    def test_latest_rejection_supersedes_old_approval_under_another_id(self):
        text = 'Не, секунду. Я сначала всю картинку проверю, а потом уже решим с входом.'
        self.assertFalse(approved(text))
        self.assertFalse(recording_allowed(text, ROOT / 'assets/voices/lively_v3'))

    def test_rejected_recording_cannot_be_pinned_or_recovered_from_base(self):
        with tempfile.TemporaryDirectory() as tmp:
            bank = VoiceBank(history_path=Path(tmp) / 'history.json')
            self.assertIsNone(bank.reserve(dict(category='NARRATE_SCAN', lang='ru', file_id='lively3_ru_narrate_scan_004')))
            for row in bank.candidates(dict(category='NARRATE_SCAN', lang='ru')):
                self.assertTrue(approved(row['text']))

    def test_rejected_templates_never_reach_synthesizer_or_prefetch(self):
        c = SpeechController(on_speak=Mock(), engine=Mock())
        bad = 'Не даю одной детали украсть всё внимание. Тут не сольный концерт.'
        try:
            self.assertFalse(c.speak_options([bad], source='scenario'))
            self.assertEqual(c.prefetch(bad), '')
            self.assertFalse(c.speak(bad, source='signal_announcement'))
            c.engine.synthesize.assert_not_called()
            self.assertFalse(c._playback_queue)
        finally:
            c._synth_pool.shutdown(wait=True, cancel_futures=True)

    def test_pilot_is_24_text_drafts_without_false_audio_acceptance(self):
        rows = json.loads((ROOT / 'docs/voice-audit/conversation-v1/pilot-24.json').read_text())['records']
        self.assertEqual(len(rows), 24)
        self.assertEqual(len({r['scene'] for r in rows}), 6)
        self.assertTrue(all(r['status'] == 'draft' and not r['text_review_accepted'] and not r['auditory_verified'] for r in rows))


class EpisodeTests(unittest.TestCase):
    def test_hook_intervals_commit_only_on_playback_and_depend_on_answer(self):
        state = Conversation()
        hook = dict(purpose='moment_question', episode_key='s:1')
        self.assertTrue(state.permits(hook, 100))
        self.assertTrue(state.permits(hook, 101))  # Preparation is not playback.
        state.started(hook, 101)
        self.assertFalse(state.permits(dict(hook, episode_key='s:2'), 220))
        self.assertTrue(state.permits(dict(hook, episode_key='s:2'), 221))
        state.comment(140)
        self.assertTrue(state.permits(dict(hook, episode_key='s:2'), 161))
        self.assertFalse(state.permits(hook, 500))  # Same episode cannot ask twice.

    def test_fifteen_minutes_quiet_room_has_episode_beats_and_ctas_without_filler(self):
        with tempfile.TemporaryDirectory() as tmp:
            rotation = SpeechRotation(Path(tmp) / 'history.json')
            tts = Mock(speaking=False)
            tts.voice_bank.rotation = rotation
            tts.voice_bank.candidates.return_value = [{}]
            tts.narration_state.return_value = {}
            director = StreamDirector(tts=tts)
            director._next_commentary_at = 0
            rotation.state['next_cta_at'] = 1180
            played = []
            def enqueue(event):
                played.append(event)
                director.note_voice_started(event)
                if event['category'] == 'NARRATE_CTA':
                    rotation.note('Bot link in bio.', 'en', 'NARRATE_CTA')
                return {'ok': True}
            tts.enqueue_voice_event.side_effect = enqueue
            try:
                with patch('winky.director.time.time', side_effect=lambda: now), patch('winky.speech_rotation.random.uniform', return_value=200):
                    for now in range(1000, 1900):
                        director._last_phase_update = now
                        director._trade_phase = 'ANALYZING'
                        director.context = dict(auto_stream=True, session_id='s', lang='en', search_generation=1)
                        director.tick(now)
                counts = Counter(e['category'] for e in played)
                self.assertEqual(counts['NARRATE_SCAN'], 1)
                self.assertEqual(counts['NARRATE_CTA'], 4)
                self.assertEqual(sum(counts.values()), 5)
            finally:
                director.stop()

    def test_dialogue_defers_ads_and_background_but_allows_short_result(self):
        d = StreamDirector()
        try:
            d.conversation.comment(100)
            self.assertFalse(d.event_allowed(dict(category='NARRATE_CTA'), 105))
            self.assertFalse(d.event_allowed(dict(category='NARRATE_SCAN'), 105))
            self.assertFalse(d.event_allowed(dict(category='CHAT_REACTION', chat_kind='like'), 105))
            result = dict(category='TRADE_WIN', session_id='s', trade_seq=1)
            self.assertTrue(d.event_allowed(result, 105))
            d.note_voice_started(result)
            self.assertFalse(d.event_allowed(result, 106))
        finally:
            d.stop()


class RealReplyTests(unittest.TestCase):
    def test_consecutive_messages_replace_pending_answer_and_keep_both_thoughts(self):
        d = StreamDirector()
        try:
            with patch.object(d._chat_workers, 'submit'):
                d.enqueue_chat_comment('Саша', 'Привет')
                old = d._chat_queue[0]
                d.enqueue_chat_comment('Саша', 'А что значит вверх?')
                self.assertTrue(old.failed)
                self.assertEqual(len(d._chat_queue), 1)
                self.assertEqual(d._chat_queue[0].text, 'Привет\nА что значит вверх?')
        finally:
            d.stop()

    def test_complete_three_sentence_reply_is_preserved_and_context_is_verified(self):
        brain = Mock()
        brain.reply.return_value = '[happy] Привет, Саша! Я рада тебя видеть. Расскажи, как прошёл твой день, и потом вернёмся к вопросу, который ты задал в начале разговора.'
        tts = Mock(speaking=False)
        tts.engine.synthesize.return_value = Path('/tmp/ready-reply.mp3')
        d = StreamDirector(brain=brain, tts=tts)
        item = ChatItem(user='Саша', text='Привет', profile=SimpleNamespace(history=[]))
        try:
            with patch.object(d._stop_event, 'wait', return_value=False):
                d._pre_synthesize(item)
            self.assertTrue(item.ready)
            self.assertEqual(item.reply_text, brain.reply.return_value)
            self.assertEqual(brain.reply.call_args.kwargs['stream_context']['facts_available'], False)
        finally:
            d.stop()

    def test_provider_failure_has_no_generic_canned_fallback(self):
        from winky.deepseek import LLMBrain
        brain = LLMBrain()
        with patch.object(type(brain), 'available', new_callable=lambda: property(lambda self: False)):
            self.assertEqual(brain.reply('как у тебя дела?', nickname='Саша'), '')

    def test_fifteen_second_chat_audio_is_accepted_and_twenty_six_second_audio_is_not(self):
        with tempfile.TemporaryDirectory() as tmp:
            media = Path(tmp) / 'audio.mp3'
            media.write_bytes(b'audio')
            controller = SpeechController(on_speak=Mock(), engine=Mock())
            controller._play_media = Mock()
            try:
                for duration, accepted in ((12, True), (26, False)):
                    item = SpeechItem(text='Ответ по существу.', lang='ru', priority=3, media_path=media,
                                      event=dict(category='CHAT_REPLY', max_duration_sec=15))
                    item.ready_event.set()
                    with patch('winky.tts.media_duration_seconds', return_value=duration):
                        controller._process_item(item)
                    self.assertEqual(controller._play_media.called, accepted)
                    controller._play_media.reset_mock()
            finally:
                controller._synth_pool.shutdown(wait=True, cancel_futures=True)


if __name__ == '__main__':
    unittest.main()
