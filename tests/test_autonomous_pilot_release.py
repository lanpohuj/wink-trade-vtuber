import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from tools import release_autonomous_pilot as release


class PilotReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.bank=self.root/'bank';self.bank.mkdir();self.docs=self.root/'docs';self.docs.mkdir()
        self.manifest=json.loads((release.BANK/'manifest.json').read_text());self.manifest['activated']=False
        for group in self.manifest['categories'].values():
            for row in group:
                target=self.bank/row['file'];target.parent.mkdir(parents=True,exist_ok=True)
                if not target.exists():shutil.copy2(release.BANK/row['file'],target)
        self.write_manifest()
        self.proof=dict(passed=True,duration_sec=7200,real_queue=True,remaining_speech_queue=0,max_concurrent_voices=1,
                        bank_manifest_sha256=release.sha(self.bank/'manifest.json'),
                        runtime_sources={name:release.sha(release.ROOT/name) for name in release.RUNTIME_FILES})
        self.write_proof()

    def tearDown(self):self.tmp.cleanup()
    def write_manifest(self):
        (self.bank/'manifest.json').write_text(json.dumps(self.manifest))
    def write_proof(self):
        (self.docs/'autonomous-two-hour-queue-verification.json').write_text(json.dumps(self.proof))

    def test_complete_reviewed_pilot_has_75_ready_records_and_one_hold(self):
        _,_,ready=release.validate(self.bank,self.docs);self.assertEqual(len(ready),75)

    def test_changed_audio_or_runtime_invalidates_the_release(self):
        first=next(iter(self.manifest['categories'].values()))[0]
        path=self.bank/first['file'];before=path.read_bytes();path.write_bytes(b'changed')
        with self.assertRaises(ValueError):release.validate(self.bank,self.docs)
        path.write_bytes(before)
        self.proof['runtime_sources']['winky/tts.py']='changed';self.write_proof()
        with self.assertRaises(ValueError):release.validate(self.bank,self.docs)

    def test_failed_audio_cannot_be_promoted_by_only_changing_its_status(self):
        bad=next(r for g in self.manifest['categories'].values() for r in g if r['id']=='autonomous_ru_loss_04')
        bad.update(status='ready',review_accepted=True,review_method='owner_sampled')
        self.write_manifest();self.proof['bank_manifest_sha256']=release.sha(self.bank/'manifest.json');self.write_proof()
        with self.assertRaises(ValueError):release.validate(self.bank,self.docs)

    def test_pointer_release_is_idempotent_and_keeps_a_rollback_record(self):
        pointer=self.root/'pointer.json';pointer.write_text(json.dumps(dict(path='lively_v3')))
        receipt=self.docs/'release.json'
        with patch.object(release,'BANK',self.bank),patch.object(release,'DOCS',self.docs), \
             patch.object(release,'POINTER',pointer),patch.object(release,'RECEIPT',receipt):
            result=release.release();self.assertTrue(result['activated'])
            self.assertEqual(json.loads(pointer.read_text())['path'],'autonomous_v1')
            self.assertEqual(json.loads(receipt.read_text())['previous_pointer']['path'],'lively_v3')
            self.assertTrue(release.release()['already_active'])
