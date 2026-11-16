import copy
import hashlib
import json
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

from tools.autonomous_direction_revision import DOCS, make_amendment, amend
from tools.import_autonomous_bank_review import resolve
from tools.autonomous_production_order import verify_approval
from tools.autonomous_direction_probe import records, TEXTS
from winky.editorial import approved
from tools import autonomous_production_order as production
from tools import autonomous_direction_probe as directions


class DirectionRevisionTests(unittest.TestCase):
    def source(self):
        return json.loads((DOCS/'autonomous-bank-ru-80.json').read_text())

    def review(self):
        return json.loads((DOCS/'owner-autonomous-voice-review.json').read_text())

    def test_four_exact_requested_phrases_replace_twelve_slots_without_changing_other_cards(self):
        source=self.source();original=copy.deepcopy(source)
        amendment=make_amendment(self.review(),source)
        result=amend(source,amendment)
        self.assertEqual(source,original)
        changed=[r for r in result['records'] if r.get('supersedes_id')]
        self.assertEqual(len(changed),12)
        self.assertEqual({r['text'] for r in changed},set(TEXTS))
        self.assertTrue(all(sum(r['text']==text for r in changed)==3 for text in TEXTS))
        self.assertEqual([r for r in result['records'] if not r.get('supersedes_id')],
                         [r for r in source['records'] if not r['purpose'].startswith('direction_')])
        self.assertTrue(all(r['id']!=r['supersedes_id'] for r in changed))

    def test_other_document_instructions_cannot_replace_the_exact_requested_words(self):
        source=self.source();review=self.review()
        row=next(r for r in review['records'] if r['id']=='autonomous_voice_probe_free_ru_05')
        row['note']='Поставь случайную реплику'
        with self.assertRaises(ValueError):make_amendment(review,source)
        amendment=make_amendment(self.review(),source)
        amendment['changes'][0]['text']='Привет!'
        amendment['changes'][0]['text_sha256']=hashlib.sha256('Привет!'.encode()).hexdigest()
        with self.assertRaises(ValueError):amend(source,amendment)

    def test_new_direction_samples_are_unheard_and_old_words_are_no_longer_approved(self):
        rows=records()
        self.assertEqual(len(rows),4)
        self.assertTrue(all(r['evaluation_only'] and not r['auditory_verified'] for r in rows))
        self.assertTrue(all(approved(r['text']) for r in rows))
        self.assertFalse(approved('Вверх.'));self.assertFalse(approved('Вниз.'))

    def test_production_spend_approval_is_separate_from_listening_and_hash_bound(self):
        quote=dict(order_sha256='current',reserved_usd=3.9,estimate_usd=.066,fits_cumulative_limit=True)
        approval=dict(approved=True,order_sha256='current',max_new_usd=.1,baseline_reserved_usd=3.9)
        verify_approval(approval,quote)
        for delta in (dict(approved=False),dict(order_sha256='old-probe'),dict(max_new_usd=.11),
                      dict(baseline_reserved_usd=float('nan'))):
            with self.assertRaises(ValueError):verify_approval({**approval,**delta},quote)
        with self.assertRaises(ValueError):verify_approval(approval,{**quote,'reserved_usd':3.95})

    def test_rejected_or_unreviewed_directions_block_all_paid_generation(self):
        with patch.object(production,'direction_delivery_accepted',return_value=False), \
                patch.object(production.build,'generate') as paid:
            with self.assertRaisesRegex(ValueError,'owner delivery acceptance'):
                production.generate(Path('/nonexistent-approval.json'))
            paid.assert_not_called()

    def test_local_quality_profile_does_not_change_global_voice_tuning(self):
        engine=directions.ClearDirectionTTS()
        try:
            original=engine.get_tuning('ru').copy()
            payload=engine.payload('[conversational] Открыла вверх.','ru')
            self.assertEqual(payload['latency'],'normal')
            self.assertEqual(payload['temperature'],.72)
            self.assertEqual(payload['prosody']['speed'],1.0)
            self.assertEqual(engine.get_tuning('ru'),original)
            self.assertEqual(engine._headers()['model'],'s2.1-pro-free')
        finally:engine._client.close()

    def test_listened_direction_audio_is_immutable_even_after_rejection(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'manifest.json').write_text(json.dumps(dict(categories={'OPEN_TRADE_CALL':[
                dict(id='reviewed',owner_listened=True,auditory_verified=False,status='rejected_delivery')]})))
            with patch.object(directions,'BANK_V3',root),patch.object(directions,'ClearDirectionTTS') as synth:
                with self.assertRaisesRegex(ValueError,'owner-listened'):
                    directions.retake_v3('reviewed','conversational')
                synth.assert_not_called()

    def test_explicit_rejected_retake_preserves_old_audio_and_does_not_inherit_listening(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);source=root/'new.mp3';source.write_bytes(b'new waveform')
            old_path=root/'old.mp3';old_path.write_bytes(b'old waveform')
            old=dict(id='rejected',category='OPEN_TRADE_CALL',file='old.mp3',text='Открыла вверх.',
                     owner_listened=True,auditory_verified=False,status='rejected_delivery',
                     review_accepted=False,owner_review_note='noise',review_method='owner_per_recording')
            (root/'manifest.json').write_text(json.dumps(dict(categories={'OPEN_TRADE_CALL':[old]})))
            with patch.object(directions,'BANK_V3',root),patch.object(directions,'DOCS',root), \
                    patch.object(directions,'ClearDirectionTTS') as cls,patch.object(directions,'snapshot',return_value={'api-credit':'same','package':{},'ledger_sha256':'same'}), \
                    patch.object(directions,'media_duration_seconds',return_value=1):
                engine=cls.return_value;engine.voices={'ru':directions.MARIN}
                engine.synthesize.return_value=source;engine.payload.return_value={}
                directions.retake_v3('rejected','confident',replace_rejected=True)
                engine.synthesize.assert_called_once_with('[confident] Открыла вверх.','ru',bypass_cache=True)
            result=json.loads((root/'manifest.json').read_text())
            self.assertEqual(result['superseded_evaluation_takes'][0],old)
            new=result['categories']['OPEN_TRADE_CALL'][0]
            self.assertEqual(old_path.read_bytes(),b'old waveform')
            self.assertNotEqual(new['id'],old['id'])
            self.assertFalse(new['owner_listened']);self.assertFalse(new['auditory_verified'])
            self.assertNotIn('owner_review_note',new)

    def test_replacement_flag_does_not_allow_replacing_an_accepted_take(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'manifest.json').write_text(json.dumps(dict(categories={'OPEN_TRADE_CALL':[
                dict(id='accepted',owner_listened=True,auditory_verified=True,status='ready',review_accepted=True)]})))
            with patch.object(directions,'BANK_V3',root),patch.object(directions,'ClearDirectionTTS') as synth:
                with self.assertRaises(ValueError):directions.retake_v3('accepted','confident',replace_rejected=True)
                synth.assert_not_called()
