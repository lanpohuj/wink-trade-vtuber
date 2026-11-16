import unittest
import tempfile
import json
from pathlib import Path
from datetime import date
from tools import autonomous_voice_probe as probe
from unittest.mock import patch
from tools.autonomous_voice_probe import verify_approval, EvaluationTTS, ROOT
from winky.voice_bank import VoiceBank


class ProbeSpendingTests(unittest.TestCase):
    def test_expired_free_offer_cannot_fall_back_to_a_paid_model(self):
        engine=EvaluationTTS()
        try:
            with patch.object(probe,'datetime') as clock:
                clock.now.return_value.date.return_value=date(2026,12,1)
                with self.assertRaises(ValueError):engine._headers()
        finally:
            engine._client.close()

    def test_listened_evaluation_take_cannot_be_replaced(self):
        row=json.loads(probe.CATALOG.read_text())['records'][0]
        with tempfile.TemporaryDirectory() as tmp:
            bank=Path(tmp)
            manifest=dict(categories={row['category']:[dict(source_probe_id=row['id'],owner_listened=True)]})
            (bank/'manifest.json').write_text(json.dumps(manifest))
            with patch.object(probe,'FREE_BANK',bank),patch.object(probe,'EvaluationTTS') as synth:
                with self.assertRaises(ValueError):probe.retake_free(row['id'],'conversational')
                synth.assert_not_called()
    def test_even_reviewed_evaluation_audio_cannot_become_live_bank_audio(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'test.mp3').write_bytes(b'audio')
            row=dict(id='evaluation',text='Да-а! Вот это приятно!',lang='ru',file='test.mp3',status='ready',
                     auditory_verified=True,automatic_qc_passed=True)
            manifest=dict(version='1.0',activated=True,bank_type='commentary_v1',evaluation_only=True,
                          categories={'TRADE_WIN':[row]})
            (root/'manifest.json').write_text(json.dumps(manifest))
            bank=VoiceBank(root=root,history_path=root/'history.json')
            self.assertFalse(bank.candidates(dict(category='TRADE_WIN',lang='ru')))
            manifest.pop('evaluation_only');row['evaluation_only']=True
            (root/'manifest.json').write_text(json.dumps(manifest))
            self.assertFalse(bank.candidates(dict(category='TRADE_WIN',lang='ru')))
    def test_free_evaluation_uses_exact_free_header_and_separate_cache(self):
        engine=EvaluationTTS()
        try:
            self.assertEqual(engine._headers()['model'],'s2.1-pro-free')
            self.assertNotEqual(engine.root,ROOT/'voice_cache/fish_direct')
            with patch('winky.fish_tts.FishAudioTTS._budget') as paid_budget:
                engine._budget(100)
                paid_budget.assert_not_called()
        finally:
            engine._client.close()
    def quote(self):
        return dict(catalog_sha256='exact',reserved_usd=3.9,estimate_usd=.012,fits_cumulative_limit=True)

    def approval(self):
        return dict(approved=True,catalog_sha256='exact',baseline_reserved_usd=3.9,max_new_usd=.03)

    def test_only_current_order_can_use_the_new_limit(self):
        verify_approval(self.approval(),self.quote())
        for change in [dict(approved=False),dict(catalog_sha256='old-pilot'),dict(max_new_usd=.04),dict(baseline_reserved_usd=float('nan'))]:
            with self.assertRaises(ValueError):verify_approval({**self.approval(),**change},self.quote())

    def test_partially_used_limit_and_cumulative_limit_are_enforced(self):
        with self.assertRaises(ValueError):verify_approval(self.approval(),{**self.quote(), 'reserved_usd':3.92})
        with self.assertRaises(ValueError):verify_approval(self.approval(),{**self.quote(), 'fits_cumulative_limit':False})
