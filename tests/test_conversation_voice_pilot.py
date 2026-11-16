"""Spending approval checks only; these tests never request speech."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools import conversation_voice_pilot as pilot


class PilotSpendingTests(unittest.TestCase):
    def setUp(self):
        self.quote = dict(catalog_sha256='catalog', reserved_usd=3.876195,
                          estimate_usd=0.016125, fits_cumulative_limit=True)
        self.approval = dict(approved=True, catalog_sha256='catalog',
                             baseline_reserved_usd=3.876195, max_new_usd=0.05)

    def test_exact_catalog_and_sufficient_cap_are_accepted(self):
        pilot.verify_approval(self.approval, self.quote)

    def test_changed_catalog_missing_approval_and_budget_overruns_are_denied(self):
        invalid = [dict(approved=False), dict(catalog_sha256='changed'),
                   dict(max_new_usd=0.001), dict(max_new_usd=0.06),
                   dict(max_new_usd=float('nan')),
                   dict(baseline_reserved_usd=float('inf'))]
        for change in invalid:
            with self.subTest(change=change), self.assertRaises(ValueError):
                pilot.verify_approval({**self.approval, **change}, self.quote)
        missing = dict(self.approval)
        del missing['baseline_reserved_usd']
        with self.assertRaises(ValueError):
            pilot.verify_approval(missing, self.quote)
        for change in (dict(reserved_usd=3.916195), dict(fits_cumulative_limit=False)):
            with self.subTest(change=change), self.assertRaises(ValueError):
                pilot.verify_approval(self.approval, {**self.quote, **change})

    def test_unapproved_command_never_reaches_paid_builder(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'approval.json'
            path.write_text(json.dumps({**self.approval, 'approved': False}))
            with patch.object(pilot, 'estimate', return_value=self.quote), patch.object(pilot.build, 'generate') as generate:
                with self.assertRaises(ValueError):
                    pilot.generate(path)
                generate.assert_not_called()

    def test_catalog_refuses_revoked_owner_text(self):
        row = dict(id='revoked', text='Test wording', text_review_accepted=True)
        with patch.object(pilot, 'approved', return_value=False), self.assertRaises(ValueError):
            pilot.validate([row])


if __name__ == '__main__':
    unittest.main()
