import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools import activate_fish_bank as release
from winky.voice_bank import CATEGORY_COUNTS, recording_reviewed

ROOT = Path(__file__).resolve().parents[1]


class BankReleaseTests(unittest.TestCase):
    def test_owner_rejection_blocks_activation_despite_automatic_qc(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bank = root / 'assets/voices/fish_v3'
            bank.mkdir(parents=True)
            (bank / 'manifest.json').write_text(json.dumps(dict(acceptance_status='rejected_delivery')))
            with patch.object(release, 'ROOT', root):
                with self.assertRaisesRegex(ValueError, 'rejected by owner'):
                    release.activate(root / 'unused.json')

    def test_staged_library_has_complete_verified_files_and_matching_qc(self):
        bank = ROOT / 'assets/voices/fish_v3'
        manifest = json.loads((bank / 'manifest.json').read_text())
        qc = {r['id']: r for r in json.loads(
            (ROOT / 'docs/voice-audit/fish-qc.json').read_text())['records']}
        ids = set()
        for category, count in CATEGORY_COUNTS.items():
            rows = manifest['categories'][category]
            for lang in ('ru', 'en'):
                self.assertEqual(sum(r['lang'] == lang for r in rows), count)
            for row in rows:
                self.assertNotIn(row['id'], ids)
                ids.add(row['id'])
                actual = hashlib.sha256((bank / row['file']).read_bytes()).hexdigest()
                self.assertEqual(actual, row['sha256'])
                self.assertEqual(actual, qc[row['id']]['metrics']['sha256'])
                self.assertFalse(qc[row['id']]['issues'])
                self.assertEqual(row['text'], qc[row['id']]['expected'])
        self.assertEqual(len(ids), 240)

    def test_acceptance_is_bound_to_every_file_hash_and_is_atomic(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bank = root / 'assets/voices/fish_v3'
            bank.mkdir(parents=True)
            categories = {}
            approvals = []
            for category, count in CATEGORY_COUNTS.items():
                rows = categories[category] = []
                for lang in ('ru', 'en'):
                    for i in range(count):
                        ident = f'{category}_{lang}_{i}'
                        filename = ident + '.mp3'
                        (bank / filename).write_bytes(ident.encode())
                        digest = hashlib.sha256(ident.encode()).hexdigest()
                        rows.append(dict(id=ident, lang=lang, file=filename, sha256=digest, automatic_qc_passed=True))
                        approvals.append(dict(id=ident, accepted=True, sha256=digest))
            path = bank / 'manifest.json'
            path.write_text(json.dumps(dict(version='3.0', activated=False, categories=categories)))
            approval = root / 'approval.json'
            approval.write_text(json.dumps(dict(method='owner_listening', records=approvals[:-1])))
            with patch.object(release, 'ROOT', root):
                with self.assertRaisesRegex(ValueError, 'Unreviewed'):
                    release.activate(approval)
                self.assertFalse(json.loads(path.read_text())['activated'])
                self.assertFalse((bank.parent / 'active-bank.json').exists())
                approval.write_text(json.dumps(dict(method='owner_listening', records=approvals)))
                release.activate(approval)
            self.assertTrue(json.loads(path.read_text())['activated'])
            self.assertEqual(json.loads((bank.parent / 'active-bank.json').read_text()), {'path': 'fish_v3'})
            # Sampled acceptance still requires every corrected recording;
            # it never claims that the other 239 files were heard.
            corrected = next(iter(categories.values()))[0]
            corrected['text_version'] = 2
            path.write_text(json.dumps(dict(version='3.0', activated=False, categories=categories)))
            approval.write_text(json.dumps(dict(method='owner_sampled', voice_samples_accepted=True, records=[])))
            with patch.object(release, 'ROOT', root):
                with self.assertRaisesRegex(ValueError, 'Unreviewed'):
                    release.activate(approval)
                approval.write_text(json.dumps(dict(method='owner_sampled', voice_samples_accepted=True, records=[approvals[0]])))
                release.activate(approval)
            accepted = json.loads(path.read_text())
            rows = [r for rr in accepted['categories'].values() for r in rr]
            self.assertEqual(sum(r['auditory_verified'] for r in rows), 1)
            self.assertTrue(all(recording_reviewed(accepted, r) for r in rows))
            rows[0]['auditory_verified'] = False
            self.assertFalse(recording_reviewed(accepted, rows[0]))

    def test_samples_are_not_whole_bank_acceptance(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bank = root / 'assets/voices/fish_v3'
            bank.mkdir(parents=True)
            (bank / 'manifest.json').write_text('{}')
            approval = root / 'approval.json'
            approval.write_text(json.dumps(dict(method='samples_only', records=[])))
            with patch.object(release, 'ROOT', root):
                with self.assertRaisesRegex(ValueError, 'Listening acceptance'):
                    release.activate(approval)
                approval.write_text(json.dumps(dict(method='owner_sampled', records=[])))
                with self.assertRaisesRegex(ValueError, 'Voice sample acceptance'):
                    release.activate(approval)
