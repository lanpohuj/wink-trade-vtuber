import hashlib
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from tools import build_streamer_bank as build
from tools.streamer_catalog import catalog
from winky import voice_bank


class StreamerBankTests(unittest.TestCase):
    def test_500_distinct_lines_and_context_coverage(self):
        rows = build.preflight()
        self.assertEqual(Counter(r["lang"] for r in rows), {"ru": 250, "en": 250})
        self.assertEqual(len({r["id"] for r in rows}), 500)
        self.assertEqual(len({r["text"] for r in rows}), 500)
        self.assertTrue(all(len(r["tts_text"].encode()) <= 500 for r in rows))
        for lang in ("ru", "en"):
            opens = [
                r
                for r in rows
                if r["lang"] == lang and r["category"].startswith("OPEN_")
            ]
            self.assertEqual(len(opens), 40)
            self.assertTrue(all(r["conditions"]["open_observed"] for r in opens))
            self.assertEqual(
                Counter(
                    (r["conditions"]["setup"], r["conditions"]["direction"])
                    for r in opens
                ).most_common(),
                Counter(
                    {
                        (f, d): 5
                        for f in (
                            "TREND_PULLBACK",
                            "BREAKOUT_RETEST",
                            "RANGE_REJECTION",
                            "LOCAL_REVERSAL",
                        )
                        for d in ("BUY", "SELL")
                    }
                ).most_common(),
            )
            self.assertEqual(
                {
                    r["conditions"]["expiry"]
                    for r in rows
                    if r["category"] == "NARRATE_EXPIRY"
                },
                {"15s", "30s", "1m", "2m"},
            )
        text = " ".join(r["text"].lower() for r in rows)
        self.assertFalse(
            any(word in text for word in ("мяу", "мурр", "meow", "purr", "ушки"))
        )

    def test_delivery_acceptance_is_bound_to_both_languages_and_all_files(self):
        root = Path(__file__).resolve().parents[1]
        approval = json.loads(
            (root / "docs/voice-audit/streamer-v2/acceptance.json").read_text()
        )
        build.verify_delivery(approval)
        approval["delivery_samples"][0]["sha256"] = "wrong"
        with self.assertRaisesRegex(ValueError, "match"):
            build.verify_delivery(approval)

    def test_unreviewed_or_external_pointer_cannot_change_live_bank(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            new = root / "streamer_v2"
            new.mkdir()
            pointer = root / "commentary-bank.json"
            with patch.object(voice_bank, "VOICE_ROOT", root):
                self.assertEqual(
                    voice_bank.active_commentary_root(), root / "commentary_v1"
                )
                pointer.write_text(json.dumps({"path": "streamer_v2"}))
                manifest = new / "manifest.json"
                manifest.write_text(
                    json.dumps(
                        dict(
                            bank_type="commentary_v1",
                            activated=False,
                            review_accepted=True,
                        )
                    )
                )
                self.assertEqual(
                    voice_bank.active_commentary_root(), root / "commentary_v1"
                )
                manifest.write_text(
                    json.dumps(
                        dict(
                            bank_type="commentary_v1",
                            activated=True,
                            review_accepted=True,
                        )
                    )
                )
                self.assertEqual(voice_bank.active_commentary_root(), new.resolve())
                pointer.write_text(json.dumps({"path": "../outside"}))
                self.assertEqual(
                    voice_bank.active_commentary_root(), root / "commentary_v1"
                )

    def test_every_eligible_line_is_used_before_a_repeat(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            rows = []
            for i in range(24):
                file = f"{i}.mp3"
                (root / file).write_bytes(b"audio")
                rows.append(
                    dict(
                        id=str(i),
                        file=file,
                        lang="ru",
                        text=f"Смотрим вариант {i}",
                        status="ready",
                        conditions={},
                        duration=5,
                    )
                )
            (root / "manifest.json").write_text(
                json.dumps({"categories": {"NARRATE_TRADE": rows}})
            )
            bank = voice_bank.VoiceBank(root, root / "history.json")
            event = dict(lang="ru", category="NARRATE_TRADE")
            played = []
            for _ in range(24):
                row = bank.reserve(event)
                played.append(row["id"])
                bank.release(row["id"], event, played=True)
            self.assertEqual(len(set(played)), 24)
            bank = voice_bank.VoiceBank(root, root / "history.json")
            next_row = bank.reserve(event)
            self.assertNotEqual(next_row["id"], played[-1])


if __name__ == "__main__":
    unittest.main()
