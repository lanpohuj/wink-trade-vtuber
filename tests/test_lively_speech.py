import hashlib
import json
import random
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from tools.lively_catalog import preflight, pilot_rows
from winky.speech_rotation import SpeechRotation
from winky.voice_bank import VoiceBank
from winky.voice_review import VoiceReview
from winky.director import StreamDirector
from winky.tts import SpeechController, SpeechItem


class RotationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'history.json'
        self.rotation = SpeechRotation(self.path)
        self.pool = [dict(id=str(i), text=f'Phrase number {i}', lang='en') for i in range(5)]

    def tearDown(self):
        self.tmp.cleanup()

    def test_unique_deck_restart_and_boundary(self):
        ids = []
        for n in range(5):
            r = self.rotation.reserve(self.pool, 'en:test', now=n)
            ids.append(r['id'])
            self.rotation.release(r['id'], True, now=n)
        self.assertEqual(len(set(ids)), 5)
        restarted = SpeechRotation(self.path)
        self.assertNotEqual(restarted.reserve(self.pool, 'en:test', now=10)['id'], ids[-1])

    def test_cancel_and_failed_player_do_not_consume(self):
        row = self.rotation.reserve(self.pool, 'en:test')
        self.rotation.release(row['id'])
        self.assertFalse(self.rotation.decks)
        self.assertFalse(self.rotation.recent)

    def test_legacy_history_is_not_lost_after_first_new_start(self):
        self.path.write_text(json.dumps({'en:test': ['0', '1', '2']}))
        rotation = SpeechRotation(self.path)
        row = rotation.reserve(self.pool, 'en:test:{}')
        self.assertIn(row['id'], ('3', '4'))
        rotation.release(row['id'], True)
        self.assertTrue({'0', '1', '2'}.issubset(rotation.decks['en:test:{}']['used']))

    def test_parallel_reservations_at_cycle_boundary_reset_only_once(self):
        for i in self.pool:
            self.rotation.reserve([i], 'en:test', universe=self.pool)
            self.rotation.release(i['id'], True)
        a = self.rotation.reserve(self.pool, 'en:test')
        b = self.rotation.reserve(self.pool, 'en:test')
        self.rotation.release(a['id'], True)
        self.rotation.release(b['id'], True)
        self.assertEqual(set(self.rotation.decks['en:test']['used']), {a['id'], b['id']})

    def test_duration_subset_does_not_reset_larger_deck(self):
        row = self.rotation.reserve(self.pool[:1], 'en:test', universe=self.pool)
        self.rotation.release(row['id'], True)
        self.assertIsNone(self.rotation.reserve(self.pool[:1], 'en:test', universe=self.pool))
        self.assertIsNotNone(self.rotation.reserve(self.pool, 'en:test'))

    def test_identical_scripts_across_files_are_one_choice(self):
        rows = [dict(id='a', text='Same text'), dict(id='b', text='Same text')]
        one = self.rotation.reserve(rows, 'ru:test')
        self.assertIsNone(self.rotation.reserve(rows, 'ru:other'))
        self.rotation.release(one['id'], True)
        self.assertEqual(len(self.rotation.decks['ru:test']['used']), 1)

    def test_semantic_joke_group_waits_ten_minutes_across_categories(self):
        a = dict(id='a', text='A joke', semantic_group='mystery', tone='playful')
        b = dict(id='b', text='A related joke', semantic_group='mystery', tone='playful')
        self.rotation.reserve([a], 'en:a', now=100)
        self.rotation.release('a', True, now=100)
        self.assertIsNone(self.rotation.reserve([b], 'en:b', now=699))
        self.assertIsNotNone(self.rotation.reserve([b], 'en:b', now=700))

    def test_recording_retake_keeps_logical_phrase_history(self):
        old = dict(id='old-take', phrase_id='phrase', text='Original line')
        new = dict(id='new-take', phrase_id='phrase', text='Original line')
        pool = [old, self.pool[1]]
        self.rotation.reserve([old], 'en:test', universe=pool)
        self.rotation.release('old-take', True)
        selected = self.rotation.reserve([new, self.pool[1]], 'en:test')
        self.assertEqual(selected['id'], '1')

    def test_cta_timer_only_moves_on_actual_spoken_link(self):
        with patch('winky.speech_rotation.random.uniform', return_value=200):
            self.assertFalse(self.rotation.cta_due(100))
            r = self.rotation.reserve([dict(id='cta', text='Bot link in bio.', lang='en')], 'en:cta')
            self.rotation.release(r['id'], False, now=150)
            self.assertTrue(self.rotation.cta_due(300))
            self.rotation.note('The bot link in bio has instructions.', 'en', now=310)
            self.assertFalse(self.rotation.cta_due(509))
            self.assertTrue(self.rotation.cta_due(510))

    def test_recent_context_contains_twenty_actual_starts(self):
        for i in range(25):
            self.rotation.note(str(i), 'en')
        self.assertEqual(self.rotation.recent_texts(), [str(i) for i in range(5, 25)])

    def test_english_profile_link_and_cta_category_both_reset_timer(self):
        with patch('winky.speech_rotation.random.uniform', return_value=200):
            self.rotation.note('Check my profile for the bot link.', 'en', now=100)
            self.assertEqual(self.rotation.state['next_cta_at'], 300)
            self.rotation.note('Find it up there.', 'en', 'NARRATE_CTA', now=150)
            self.assertEqual(self.rotation.state['next_cta_at'], 350)


class BankAndReviewTests(unittest.TestCase):
    def test_changing_delivery_with_same_text_replaces_staged_audio(self):
        from tools import build_commentary_bank as build
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); bank = root / 'bank'
            media = bank / 'ru/NARRATE_ENGAGE/line.mp3'
            media.parent.mkdir(parents=True); media.write_bytes(b'old take')
            source = root / 'new.mp3'; source.write_bytes(b'new conversational take')
            row = dict(id='line', text='Привет!', tts_text='[conversational] Привет!',
                       text_sha256='same-script', lang='ru', voice_id='voice', category='NARRATE_ENGAGE', conditions={})
            media.with_suffix('.review.json').write_text(json.dumps(dict(text_sha256='same-script', request_payload={'text': '[excited] Привет!'})))
            catalog = root / 'catalog.json'; catalog.write_text(json.dumps({'records': [row]}))
            engine = Mock(); engine.voices = {'ru': 'voice'}; engine.tuning = {}
            engine.payload.side_effect = lambda text, lang: {'text': text}
            engine.synthesize.return_value = source
            with patch.object(build, 'BANK', bank), patch.object(build, 'CATALOG', catalog), \
                 patch.object(build, 'FishAudioTTS', return_value=engine), \
                 patch.object(build, 'compute_rms_chunks', return_value=[.1]), \
                 patch.object(build, 'media_duration_seconds', return_value=2.5):
                build.generate(['line'])
            self.assertEqual(media.read_bytes(), b'new conversational take')
            engine.synthesize.assert_called_once_with('[conversational] Привет!', 'ru')

    def test_loading_comment_is_discarded_when_data_arrives(self):
        from winky.commentary import narration_valid
        event = dict(category='NARRATE_SCAN', lang='ru', session_id='s',
                     data_status='NO_DATA', commentary_scope='search', search_generation=1)
        current = dict(event, auto_stream=True, data_status='READY')
        self.assertFalse(narration_valid(event, current, 'ANALYZING', 99, 100))

    def test_plain_russian_synthesis_uses_accepted_conversational_cue(self):
        from winky.fish_tts import FishAudioTTS
        engine = FishAudioTTS()
        try:
            self.assertEqual(engine.payload('Привет, чат!', 'ru')['text'], '[conversational] Привет, чат!')
            self.assertEqual(engine.payload('[happy] Привет!', 'ru')['text'], '[happy] Привет!')
        finally:
            engine._client.close()

    def test_catalog_has_1000_distinct_new_lines_and_twelve_balanced_pilots(self):
        rows = preflight()
        self.assertEqual(Counter(r['lang'] for r in rows), {'ru': 500, 'en': 500})
        self.assertEqual(len({r['text'] for r in rows}), 1000)
        self.assertEqual(len(pilot_rows()), 12)
        import re
        self.assertFalse(any(re.search(r'аур|чилл|делулу|\b(?:aura|chill|chilling|delulu|bestie|nonchalant)\b', r['text'], re.I) for r in rows))
        for lang in ('ru', 'en'):
            self.assertEqual(sum(r['category'] == 'NARRATE_CTA' and r['lang'] == lang for r in rows), 50)
            for direction in ('BUY', 'SELL'):
                self.assertEqual(Counter(r['conditions'].get('setup') for r in rows
                    if r['lang'] == lang and r['conditions'].get('direction') == direction),
                    {s: 10 for s in ('TREND_PULLBACK', 'BREAKOUT_RETEST', 'RANGE_REJECTION', 'LOCAL_REVERSAL')})

    def test_defect_exclusion_is_hash_bound_and_checked_at_playback(self):
        from winky import voice_review
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            audio = root / 'a.mp3'; audio.write_bytes(b'original')
            review = VoiceReview(root / 'reports.json')
            row = dict(id='a', text='Test', path=str(audio), lang='en')
            with patch.object(voice_review, 'ROOT', root):
                report = review.report(row, 'roughness', 1.2)
            self.assertEqual(report['sha256'], hashlib.sha256(b'original').hexdigest())
            self.assertTrue(review.blocked(row, audio))
            c = SpeechController(on_speak=Mock(), engine=Mock())
            c.voice_bank.review = review
            try:
                self.assertFalse(c._item_valid(SpeechItem(text='Test', lang='en', bank_id='a', media_path=audio)))
                audio.write_bytes(b'replacement')
                self.assertFalse(review.blocked(row, audio))
            finally:
                c._synth_pool.shutdown(wait=False, cancel_futures=True)

    def test_informational_pair_event_excludes_preserved_banter(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            records = []
            for identity, text, role in (('plain', 'Проверю следующую пару.', 'informational'),
                                         ('joke', 'У графика опять своё мнение.', 'banter')):
                (root / f'{identity}.mp3').write_bytes(b'audio')
                records.append(dict(id=identity, text=text, lang='ru', file=f'{identity}.mp3',
                                    delivery_role=role, conditions={}))
            (root / 'manifest.json').write_text(json.dumps({'categories': {'NARRATE_PAIR': records}}))
            bank = VoiceBank(root, root / 'history.json')
            event = dict(category='NARRATE_PAIR', lang='ru')
            self.assertEqual({r['id'] for r in bank.candidates(event)}, {'plain'})
            self.assertEqual({r['id'] for r in bank.candidates(dict(event, allow_banter=True))},
                             {'plain', 'joke'})

    def test_context_decks_are_independent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            groups = []
            for i, expiry in enumerate(('15s', '30s')):
                (root / f'{i}.mp3').write_bytes(b'audio')
                groups.append(dict(id=str(i), text=f'Expiry {expiry}', lang='en', file=f'{i}.mp3',
                                   semantic_group='expiry_shared', conditions=dict(expiry=expiry)))
            (root / 'manifest.json').write_text(json.dumps({'categories': {'NARRATE_EXPIRY': groups}}))
            bank = VoiceBank(root, root / 'history.json')
            for expiry in ('15s', '30s'):
                e = dict(category='NARRATE_EXPIRY', lang='en', expiry=expiry)
                r = bank.reserve(e); bank.release(r['id'], e, True)
            self.assertEqual(len(bank.rotation.decks), 2)

    def test_accepted_legacy_retake_keeps_original_and_rejects_changed_waveform(self):
        from winky import voice_review
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            original = root / 'original.mp3'; original.write_bytes(b'original')
            replacement = root / 'assets/voices/lively_retakes/ru/new.mp3'
            replacement.parent.mkdir(parents=True); replacement.write_bytes(b'new recording')
            entry = dict(file=replacement.relative_to(root).as_posix(),
                         sha256=hashlib.sha256(replacement.read_bytes()).hexdigest(),
                         source_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),
                         text='Новая реплика', duration=3, transcript='Новая реплика',
                         accepted=True, listened=True, automatic_qc_passed=True)
            (root / 'assets/voices/recording-replacements.json').write_text(json.dumps({'old-id': entry}))
            review = VoiceReview(root / 'defects.json')
            with patch.object(voice_review, 'ROOT', root):
                self.assertEqual(review.replacement({'id': 'old-id'}, original)['path'], replacement)
                self.assertEqual(original.read_bytes(), b'original')
                replacement.write_bytes(b'changed')
                self.assertIsNone(review.replacement({'id': 'old-id'}, original))

    def test_batch_generation_is_blocked_before_owner_acceptance(self):
        from tools import build_lively_bank as build
        with patch.object(build, 'prepare', return_value=[]), patch.object(build, 'configure'), \
             patch.object(build, 'verify_pilots', side_effect=ValueError('Owner acceptance pending')), \
             patch.object(build.build, 'generate') as generate:
            with self.assertRaisesRegex(ValueError, 'Owner acceptance'):
                build.generate(False)
            generate.assert_not_called()


class DirectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.rotation = SpeechRotation(Path(self.tmp.name) / 'history.json')
        self.tts = Mock()
        self.tts.speaking = False
        self.tts.voice_bank.rotation = self.rotation
        self.tts.voice_bank.candidates.return_value = [dict(duration=3)]
        self.tts.narration_state.return_value = {}
        self.tts.enqueue_voice_event.return_value = {'ok': True}
        self.d = StreamDirector(tts=self.tts)
        self.d._next_commentary_at = 0
        self.d._last_phase_update = 1000
        self.d.context = dict(auto_stream=True, lang='en', session_id='s')

    def tearDown(self):
        self.d.stop()
        self.tmp.cleanup()

    def test_loss_and_ready_chat_suppress_due_cta(self):
        self.rotation.state['next_cta_at'] = 900
        self.d.context['last_result'] = dict(outcome='LOSS', closed_at=980)
        self.assertFalse(self.d.maybe_cta(1000))
        self.d.context.pop('last_result')
        self.d._chat_queue.append(SimpleNamespace(ready=True, failed=False, played=False))
        self.assertFalse(self.d.maybe_cta(1000))
        self.d._chat_queue.clear()
        self.assertTrue(self.d.maybe_cta(1000))

    def test_pending_or_paused_queue_does_not_accumulate_cta(self):
        self.rotation.state['next_cta_at'] = 0
        for state in ({'paused': True}, {'foreground_ready': True}, {'background_pending': True}):
            self.tts.narration_state.return_value = state
            self.assertFalse(self.d.maybe_cta(1000))
        self.tts.enqueue_voice_event.assert_not_called()

    def test_fresh_pocket_language_expires_back_to_panel_language(self):
        self.d.stream_lang = 'ru'
        self.d.context['lang'] = 'en'
        self.d._last_phase_update = 1000
        self.assertEqual(self.d.current_language(1002), 'en')
        self.assertEqual(self.d.current_language(1004), 'ru')

    def test_viewer_memory_reaches_model_but_is_not_committed_during_preparation(self):
        from collections import deque
        from winky.director import ChatItem
        brain = Mock(); brain.reply.return_value = '[happy] Рада тебя видеть!'
        self.d._brain = brain
        media = Path(self.tmp.name) / 'reply.mp3'; media.write_bytes(b'audio')
        self.tts.engine.synthesize.return_value = media
        profile = SimpleNamespace(history=deque(maxlen=4), mentioned_bio=False)
        item = ChatItem('Viewer', 'Привет', profile=profile,
                        recent_context=[dict(who='Another', text='Hello')])
        self.d._pre_synthesize(item)
        brain.reply.assert_called_once_with('Привет', nickname='Viewer', profile=profile,
                                            recent_context=[dict(who='Another', text='Hello')])
        self.assertTrue(item.ready)
        self.assertFalse(profile.history)

    def test_four_hour_stream_balances_topics_and_never_starves_cta(self):
        categories, ctas = Counter(), []
        ended = 0
        now = 10000
        def started(event):
            nonlocal ended
            categories[event['category']] += 1
            text = 'Bot link in bio.' if event['category'] == 'NARRATE_CTA' else event['category']
            self.rotation.note(text, 'en', event['category'], now=now)
            if event['category'] == 'NARRATE_CTA': ctas.append(now)
            if event.get('commentary'): self.d.note_commentary_started(event)
            ended = now + 3
            return {'ok': True}
        self.tts.enqueue_voice_event.side_effect = started
        self.tts.narration_state.side_effect = lambda: {'ended_at': ended}
        self.d._trade_phase = 'ANALYZING'
        self.rotation.state['next_cta_at'] = now + 200
        with patch('winky.director.time.time', side_effect=lambda: now):
            for now in range(10000, 24400, 5):
                self.d._last_phase_update = now
                self.d.context.update(pair='EUR/USD', search_generation=1)
                self.d.tick(now)
        self.assertGreater(len(ctas), 40)
        self.assertLess(len(ctas), 85)
        self.assertTrue(all(180 <= b - a <= 320 for a, b in zip(ctas, ctas[1:])))
        self.assertGreater(categories['NARRATE_SCAN'], 100)
        self.assertGreater(categories['NARRATE_LESSON'], 100)
        self.assertGreater(categories['NARRATE_ENGAGE'], 100)


if __name__ == '__main__':
    unittest.main()
