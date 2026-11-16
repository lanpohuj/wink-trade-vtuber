import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock,patch

from tools import retake_autonomous_production as retakes
from tools import autonomous_production_order as production


class ProductionRetakeTests(unittest.TestCase):
    def fixture(self,root,spent):
        bank=root/'bank';bank.mkdir();docs=root/'docs';docs.mkdir();engine_root=root/'engine';engine_root.mkdir()
        rows=[]
        for n in range(2):
            media=bank/f'{n}.mp3';media.write_bytes(b'old waveform')
            rows.append(dict(id=str(n),category='TRADE_LOSS',lang='ru',text='Эх. Обидно получилось.',
                tts_text='[conversational] Эх. Обидно получилось.',file=media.name,sha256=hashlib.sha256(media.read_bytes()).hexdigest(),
                status='review_pending',auditory_verified=False,text_sha256='text'))
        (bank/'manifest.json').write_text(json.dumps(dict(activated=False,categories={'TRADE_LOSS':rows})))
        (docs/'autonomous-production-qc-v1.json').write_text(json.dumps(dict(records=[dict(id=r['id'],sha256=r['sha256'],issues=['mismatch']) for r in rows])))
        (docs/'owner-autonomous-production-spend-approval-v1.json').write_text(json.dumps(dict(approved=True,order_sha256='exact',baseline_reserved_usd=0,max_new_usd=.1)))
        (engine_root/'budget.json').write_text(json.dumps(dict(reserved_usd=spent)))
        fresh=root/'new.mp3';fresh.write_bytes(b'fresh waveform')
        engine=Mock(root=engine_root,voices={'ru':retakes.MARIN})
        engine.payload.return_value={'text':rows[0]['tts_text']};engine.synthesize.return_value=fresh
        quote=dict(order_sha256='exact',reserved_usd=spent,estimate_usd=0,fits_cumulative_limit=True)
        return bank,docs,engine,quote,rows

    def test_aliases_share_one_retake_and_old_files_are_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);bank,docs,engine,quote,old=self.fixture(root,.06)
            with patch.object(retakes,'BANK',bank),patch.object(retakes,'DOCS',docs),patch.object(retakes,'ProductionTTS',return_value=engine), \
                    patch.object(retakes,'quote',return_value=quote),patch.object(retakes,'direction_delivery_accepted',return_value=True),patch.object(retakes,'media_duration_seconds',return_value=1):
                retakes.retake()
            engine.synthesize.assert_called_once()
            data=json.loads((bank/'manifest.json').read_text());rows=data['categories']['TRADE_LOSS']
            self.assertEqual(rows[0]['file'],rows[1]['file']);self.assertEqual(len(data['superseded_recordings']),2)
            self.assertTrue(all((bank/r['file']).read_bytes()==b'old waveform' for r in old))

    def test_new_spend_cap_blocks_synthesis_before_a_charge(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);bank,docs,engine,quote,_=self.fixture(root,.09999)
            before=(bank/'manifest.json').read_bytes()
            with patch.object(retakes,'BANK',bank),patch.object(retakes,'DOCS',docs),patch.object(retakes,'ProductionTTS',return_value=engine), \
                    patch.object(retakes,'quote',return_value=quote),patch.object(retakes,'direction_delivery_accepted',return_value=True):
                with self.assertRaisesRegex(ValueError,'cap'):retakes.retake()
            engine.synthesize.assert_not_called();self.assertEqual((bank/'manifest.json').read_bytes(),before)

    def test_complete_generation_is_idempotent_and_preserves_repaired_takes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);bank,docs,engine,quote,rows=self.fixture(root,.06)
            order=root/'order.json';order.write_text(json.dumps(dict(records=rows)))
            approval=docs/'owner-autonomous-production-spend-approval-v1.json'
            with patch.object(production,'BANK',bank),patch.object(production,'ORDER',order), \
                    patch.object(production,'quote',return_value=quote),patch.object(production,'direction_delivery_accepted',return_value=True), \
                    patch.object(production.build,'generate') as synth:
                production.generate(approval)
                synth.assert_not_called()
