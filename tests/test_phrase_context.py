import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from winky.phrase_context import CONTRACT, speech_context, rejection_reason
from winky.director import StreamDirector, ChatItem
from winky.tts import SpeechController
from winky.voice_bank import VoiceBank
from tools.build_autonomous_runtime_catalog import compile_catalog, DOCS
from winky.speech_rotation import SpeechRotation


class PhraseContextTests(unittest.TestCase):
    def context(self, **extra):
        return dict(auto_stream=True, session_id='s', lang='ru', trade_seq=7, pair='EUR/USD',
                    direction='BUY', open_observed=True, remaining_sec=4, search_generation=2, **extra)

    def event(self, **extra):
        return dict(session_id='s', lang='ru', trade_seq=7, category='NARRATE_MOMENT', **extra)

    def guard(self, conditions, **extra):
        return dict(speech_contract=CONTRACT, requires_fresh_context=True, conditions=conditions, **extra)

    def test_range_is_inclusive_not_a_list_of_only_two_allowed_seconds(self):
        row = self.guard({'remaining_sec_range': [3, 5]})
        for remaining in (3, 3.5, 4, 5):
            self.assertFalse(rejection_reason(row, dict(speech_facts_confirmed=True, remaining_sec=remaining)))
        for remaining in (2.99, 5.01, None, True, float('nan'), float('inf')):
            self.assertTrue(rejection_reason(row, dict(speech_facts_confirmed=True, remaining_sec=remaining)))

    def test_numeric_one_cannot_satisfy_a_boolean_fact(self):
        row = self.guard({'open_observed': True})
        self.assertTrue(rejection_reason(row, dict(speech_facts_confirmed=True, open_observed=1)))

    def test_payload_cannot_invent_confirmed_facts(self):
        event = self.event(confirmed_result='WIN', previous_expressed_concern=True, high_volatility=True,
                           speech_facts_confirmed=True, cta_due=True)
        for current, received in ((self.context(), 996), (dict(self.context(), session_id='other'), 999),
                                   (dict(self.context(), trade_seq=8), 999)):
            facts = speech_context(event, current, 'IN_TRADE', received, 1000)
            self.assertFalse(facts['speech_facts_confirmed'])
            self.assertNotIn('confirmed_result', facts)
            self.assertFalse(facts['previous_expressed_concern'])
            self.assertFalse(facts['cta_due'])

    def test_clock_ages_remaining_and_volatility(self):
        current = self.context(high_volatility=True, market_observed_at=999)
        first = speech_context(self.event(), current, 'IN_TRADE', 999, 1000)
        later = speech_context(self.event(), current, 'IN_TRADE', 999, 1002.1)
        self.assertEqual(first['remaining_sec'], 3)
        self.assertTrue(first['high_volatility'])
        self.assertFalse(later['speech_facts_confirmed'])

    def test_result_requires_same_trade_category_and_observed_close(self):
        row = self.guard({'confirmed_result': 'WIN'})
        event = self.event();event['category'] = 'TRADE_WIN'
        for outcome, seq, closed, expected in (('WIN', 7, 999, True), ('WIN', 8, 999, False),
                                              ('UNKNOWN', 7, 999, False), ('LOSS', 7, 999, False),
                                              ('WIN', 7, 980, False), ('WIN', 7, 1001, False)):
            facts = speech_context(event, self.context(last_result=dict(outcome=outcome, seq=seq, closed_at=closed)),
                                   'RESULT', 999, 1000)
            self.assertEqual(not rejection_reason(row, facts), expected)

    def test_result_event_can_precede_heartbeat_but_not_override_current_unknown(self):
        event = self.event(last_result=dict(seq=7, outcome='WIN', closed_at=999));event['category'] = 'TRADE_WIN'
        facts = speech_context(event, self.context(), 'IN_TRADE', 999, 1000)
        self.assertEqual(facts['confirmed_result'], 'WIN')
        current = self.context(last_result=dict(seq=7, outcome='UNKNOWN', closed_at=1000))
        self.assertNotIn('confirmed_result', speech_context(event, current, 'RESULT', 999, 1000))

    def test_concern_and_recovery_never_leak_to_another_trade_or_reset_stake(self):
        event = self.event();event['category'] = 'TRADE_LOSS'
        for stake in (50, 110, 242):
            facts = speech_context(event, self.context(last_result=dict(seq=7, outcome='LOSS', closed_at=999),
                                    next_stake=stake), 'RESULT', 999, 1000, concern_episode=('s', 6))
            self.assertFalse(facts['previous_expressed_concern'])
            self.assertEqual(not rejection_reason(self.guard({'confirmed_result': 'LOSS', 'next_stake': [110, 242]}), facts), stake != 50)

    def test_search_does_not_use_previous_entry_as_a_new_confirmed_setup(self):
        event = self.event(search_generation=2);event['category'] = 'NARRATE_SCAN'
        facts = speech_context(event, self.context(setup_confirmed=True), 'ANALYZING', 999, 1000)
        self.assertNotIn('setup_confirmed', facts)
        facts = speech_context(event, self.context(analysis_setup_confirmed=False), 'ANALYZING', 999, 1000)
        self.assertIs(facts['setup_confirmed'], False)
        stale = dict(event, search_generation=1)
        self.assertFalse(speech_context(stale, self.context(), 'ANALYZING', 999, 1000)['speech_facts_confirmed'])
        other_pair = self.event(pair='USD/JPY')
        self.assertFalse(speech_context(other_pair, self.context(), 'IN_TRADE', 999, 1000)['speech_facts_confirmed'])

    def test_greeting_needs_written_greeting_and_does_not_swallow_a_question(self):
        for kind, comment, expected in (('join', 'Привет', False), ('comment', 'Привет!', True),
                                        ('comment', 'Привет, почему минус?', False), ('comment', 'hi!', True)):
            event = dict(category='CHAT_REPLY', chat_kind=kind, comment=comment, real_written_greeting=True)
            facts = speech_context(event, {}, 'IDLE', 999, 1000)
            self.assertEqual(facts['real_written_greeting'], expected)

    def test_dialogue_defers_background_and_cta_waits_for_actual_due_time(self):
        row = self.guard({}, dialogue_policy='defer')
        facts = speech_context(self.event(), self.context(), 'IN_TRADE', 999, 1000, dialogue_active=True)
        self.assertEqual(rejection_reason(row, facts), 'dialogue_has_priority')
        cta = dict(speech_contract=CONTRACT, conditions=dict(cta_due=True, dialogue_active=False, recent_loss=False))
        for due, last_loss, allowed in ((False, 0, False), (True, 990, False), (True, 0, True)):
            facts = speech_context({}, {}, 'IDLE', 999, 1000, cta_due=due, last_loss_at=last_loss)
            self.assertEqual(not rejection_reason(cta, facts), allowed)

    def test_compilation_preserves_all_76_accepted_texts_without_audio_or_activation(self):
        source = json.loads((DOCS/'autonomous-bank-ru-approved.json').read_text())
        result = compile_catalog(source)
        self.assertEqual(len(result['records']), 76)
        self.assertEqual([(r['id'], r['text_sha256']) for r in result['records']],
                         [(r['id'], r['text_sha256']) for r in source['records']])
        self.assertFalse(result['activated'])
        self.assertTrue(all(r['status'] != 'ready' and 'file' not in r and not r['auditory_verified'] for r in result['records']))

    def test_twenty_minute_repeat_limit_survives_restart_and_new_chat_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'history.json';rotation = SpeechRotation(path)
            row = dict(id='greeting', text='Привет! Устраивайся рядом.', lang='ru', same_file_min_gap_sec=1200)
            self.assertIsNotNone(rotation.reserve([row], 'ru:greeting', now=1000))
            rotation.release(row['id'], played=True, now=1000)
            for i in range(210):
                rotation.note('Другая реплика ' + str(i), 'ru', now=1001+i)
            restored = SpeechRotation(path)
            self.assertIsNone(restored.reserve([row], 'ru:greeting', now=2199))
            self.assertIsNotNone(restored.reserve([row], 'ru:greeting', now=2200))

    def test_queue_rechecks_selected_conditions_before_playback(self):
        now = 1000
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);(root/'sample.mp3').write_bytes(b'candidate-fixture-only')
            row = dict(id='moment', text='Ну же… ещё чуть-чуть.', lang='ru', category='NARRATE_MOMENT',
                       file='sample.mp3', status='ready', duration=1, ttl_sec=3, purpose='observation',
                       **self.guard({'remaining_sec_range': [3, 5], 'phase': 'IN_TRADE'}))
            (root/'manifest.json').write_text(json.dumps(dict(version='1.0', categories={'NARRATE_MOMENT': [row]})))
            c = SpeechController(on_speak=Mock(), engine=Mock());d = StreamDirector(tts=c)
            c.voice_bank = VoiceBank(root=root, history_path=root/'history.json')
            d.context = self.context();d._last_phase_update = now;d._trade_phase = 'IN_TRADE'
            try:
                with patch('winky.director.stream_director', d), patch('winky.tts.time.time', side_effect=lambda: now):
                    self.assertTrue(c.enqueue_voice_event(self.event(created_at=now))['ok'])
                    item = c._playback_queue[0]
                    self.assertEqual(item.max_age_sec, 3)
                    self.assertTrue(c._item_valid(item))
                    now += 2
                    self.assertFalse(c._item_valid(item))  # Still within TTL, already outside the authored range.
            finally:
                d.stop();c._synth_pool.shutdown(wait=True, cancel_futures=True)

    def test_written_greeting_reuses_bank_without_tts_and_keeps_question_for_live_reply(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);(root/'hello.mp3').write_bytes(b'candidate-fixture-only')
            row = dict(id='hello', text='Привет! Устраивайся рядом.', lang='ru', category='CHAT_REPLY',
                       file='hello.mp3', status='ready', duration=2, purpose='chat_greeting',
                       speech_contract=CONTRACT, requires_fresh_context=False, dialogue_policy='reply',
                       conditions=dict(real_written_greeting=True))
            (root/'manifest.json').write_text(json.dumps(dict(version='1.0', categories={'CHAT_REPLY': [row]})))
            engine = Mock();brain = Mock();brain.reply.return_value = ''
            c = SpeechController(on_speak=Mock(), engine=engine);d = StreamDirector(tts=c, brain=brain)
            c.voice_bank = VoiceBank(root=root, history_path=root/'history.json')
            try:
                with patch.object(d._stop_event, 'wait', return_value=False), patch('winky.director.stream_director', d):
                    item = ChatItem(user='Саша', text='Привет!')
                    d._pre_synthesize(item)
                    self.assertTrue(item.ready)
                    brain.reply.assert_not_called();engine.synthesize.assert_not_called()
                    self.assertFalse(c.voice_bank.rotation.pending)
                    self.assertTrue(c.speak_chat_item(item))
                    queued = c._playback_queue[0]
                    self.assertEqual(queued.priority, 3)
                    self.assertEqual(queued.event['comment'], 'Привет!')
                    self.assertTrue(c._item_valid(queued))
                    question = ChatItem(user='Саша', text='Привет, почему проигрыш?')
                    d._pre_synthesize(question)
                    brain.reply.assert_called_once()
            finally:
                d.stop();c._synth_pool.shutdown(wait=True, cancel_futures=True)
