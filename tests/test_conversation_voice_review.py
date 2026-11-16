import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from tools.import_conversation_voice_review import import_review


class ListeningReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.bank = self.root / 'bank'
        self.bank.mkdir()
        self.rows = []
        self.decisions = []
        for n in range(2):
            path = self.bank / f'{n}.mp3'
            path.write_bytes(f'audio-{n}'.encode())
            sha = hashlib.sha256(path.read_bytes()).hexdigest()
            self.rows.append(dict(id=str(n), file=path.name, sha256=sha,
                                  status='review_pending', auditory_verified=False))
            self.decisions.append(dict(id=str(n), sha256=sha, listened=True,
                                       accepted=n == 0, note='example note'))
        self.manifest = self.bank / 'manifest.json'
        self.manifest.write_text(json.dumps(dict(activated=False, categories={'CHAT_REPLY': self.rows})))
        self.review = self.root / 'review.json'
        self.write_review()

    def tearDown(self):
        self.tmp.cleanup()

    def write_review(self):
        self.review.write_text(json.dumps(dict(kind='voice_pilot_delivery_review', records=self.decisions)))

    def test_accepts_exact_listened_files_and_keeps_whole_pilot_inactive(self):
        result = import_review(self.review, self.bank, self.root / 'docs')
        self.assertEqual(result, dict(accepted=1, rejected=1, activated=False))
        manifest = json.loads(self.manifest.read_text())
        rows = manifest['categories']['CHAT_REPLY']
        self.assertTrue(rows[0]['auditory_verified'])
        self.assertFalse(rows[1]['auditory_verified'])
        self.assertEqual(rows[1]['status'], 'rejected_delivery')
        self.assertFalse(manifest['delivery_approved_for_expansion'])
        for row in rows:
            self.assertEqual(hashlib.sha256((self.bank / row['file']).read_bytes()).hexdigest(), row['sha256'])

    def test_changed_audio_invalidates_entire_import_without_partial_writes(self):
        before = self.manifest.read_bytes()
        (self.bank / '1.mp3').write_bytes(b'changed after owner listened')
        with self.assertRaisesRegex(ValueError, 'changed since listening'):
            import_review(self.review, self.bank, self.root / 'docs')
        self.assertEqual(before, self.manifest.read_bytes())
        self.assertFalse((self.root / 'docs').exists())

    def test_unknown_duplicate_and_unheard_decisions_are_rejected(self):
        for bad in (dict(id='unknown'), dict(listened=False), dict(accepted='yes')):
            with self.subTest(bad=bad):
                self.decisions[1] = {**self.decisions[1], **bad}
                self.write_review()
                with self.assertRaises(ValueError):
                    import_review(self.review, self.bank, self.root / 'docs')
                self.decisions[1] = dict(id='1', sha256=self.rows[1]['sha256'], listened=True, accepted=False)
        self.decisions[1] = dict(self.decisions[0])
        self.write_review()
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            import_review(self.review, self.bank, self.root / 'docs')


if __name__ == '__main__':
    unittest.main()
