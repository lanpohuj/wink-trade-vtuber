import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from tools.import_autonomous_production_review import apply
from tools.review_autonomous_production import binding
from tools.prepare_autonomous_performance import beats


class ProductionReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.bank=Path(self.tmp.name)/'bank';self.bank.mkdir()
        self.docs=Path(self.tmp.name)/'docs';self.docs.mkdir()
        (self.docs/'autonomous-bank-rehearsal-timeline.json').write_text('{}')
        self.rows=[]
        for n in range(2):
            path=self.bank/f'{n}.mp3';path.write_bytes(str(n).encode());sha=hashlib.sha256(path.read_bytes()).hexdigest()
            self.rows.append(dict(id=str(n),file=path.name,sha256=sha,status='review_pending',automatic_qc_passed=n==0,
                auditory_verified=False,performance=dict(audio_sha256=sha,review_accepted=False)))
        (self.bank/'manifest.json').write_text(json.dumps(dict(activated=False,categories={'TEST':self.rows})))
        self.review=Path(self.tmp.name)/'review.json'

    def tearDown(self):self.tmp.cleanup()

    def write_review(self,records=None):
        review=dict(kind='autonomous_production_voice_review_v1',created_at='test',records=records or [],
                    sampled_bank_accepted=True,scene_accepted=True,**binding(self.bank,self.docs))
        self.review.write_text(json.dumps(review));return review

    def test_sampled_acceptance_keeps_flagged_audio_pending_and_does_not_fabricate_listening(self):
        self.write_review();result=apply(self.review,self.bank,self.docs)
        self.assertEqual(result['ready'],1);self.assertEqual(result['pending'],1)
        data=json.loads((self.bank/'manifest.json').read_text());rows=data['categories']['TEST']
        self.assertTrue(rows[0]['performance']['review_accepted'])
        self.assertFalse(rows[1]['performance']['review_accepted'])
        self.assertTrue(all(not row['auditory_verified'] for row in rows))
        self.assertFalse(data['activated'])

    def test_flagged_audio_needs_exact_listened_acceptance_for_override(self):
        row=self.rows[1]
        self.write_review([dict(id=row['id'],sha256=row['sha256'],accepted=True,listened=True,note='heard')])
        result=apply(self.review,self.bank,self.docs);self.assertEqual(result['ready'],2)
        rows=json.loads((self.bank/'manifest.json').read_text())['categories']['TEST']
        self.assertTrue(rows[1]['qc_override_accepted']);self.assertTrue(rows[1]['auditory_verified'])
        self.assertFalse(rows[0]['auditory_verified'])

    def test_changed_unreviewed_waveform_or_scene_prevents_all_partial_writes(self):
        self.write_review();before=(self.bank/'manifest.json').read_bytes()
        (self.bank/'1.mp3').write_bytes(b'changed')
        with self.assertRaises(ValueError):apply(self.review,self.bank,self.docs)
        self.assertEqual((self.bank/'manifest.json').read_bytes(),before)
        self.assertFalse((self.docs/'owner-autonomous-production-review.json').exists())
        (self.bank/'1.mp3').write_bytes(b'1')
        (self.docs/'autonomous-bank-rehearsal-timeline.json').write_text('{"new":true}')
        with self.assertRaises(ValueError):apply(self.review,self.bank,self.docs)
        self.assertEqual((self.bank/'manifest.json').read_bytes(),before)

    def test_short_audio_cannot_compress_a_large_gesture_or_leave_beats_past_the_end(self):
        self.assertEqual(beats(dict(duration=1.2,gesture='wave'))[0]['gesture'],'nod')
        for duration in (1.2,3.5,7):
            result=beats(dict(duration=duration,gesture='hand_heart'))
            self.assertTrue(all(b['start']+b['duration']<=duration for b in result))
            self.assertTrue(all(a['start']+a['duration']<=b['start'] for a,b in zip(result,result[1:])))
