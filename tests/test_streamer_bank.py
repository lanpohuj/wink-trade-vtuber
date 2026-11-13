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

    def test_half_minute_is_thirty_seconds_without_hiding_fifteen(self):
        from tools.build_commentary_bank import normalize

        self.assertEqual(normalize("полминуты", "ru"), "30")
        self.assertEqual(normalize("пол минуты", "ru"), "30")
        self.assertEqual(normalize("half a minute", "en"), "30")
        self.assertEqual(normalize("half-a-minute", "en"), "30")
        self.assertEqual(normalize("one-hundred-and-ten", "en"), "110")
        self.assertEqual(normalize("two-hundred-and-forty-two", "en"), "242")
        self.assertEqual(normalize("к пятидесяти", "ru"), "к50")
        self.assertNotEqual(
            normalize("fifteen", "en"), normalize("half a minute", "en")
        )
        self.assertNotEqual(normalize("пятнадцать", "ru"), normalize("полминуты", "ru"))

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

    def test_new_bank_standalone_warmup_uses_recordings_not_generated_old_text(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        from winky.app import WinkyAPI
        from winky.director import stream_director

        api = object.__new__(WinkyAPI)
        api._cta_enabled = True
        api._controller = SimpleNamespace(
            paused=False,
            speaking=False,
            queue_size=lambda: 0,
            enqueue_voice_event=Mock(return_value={"ok": True}),
            speak=Mock(),
        )
        api._book = SimpleNamespace(cta=SimpleNamespace(interval_minutes=0))
        api._last_cta_at = 0
        api._chat_router = None
        api._stream_interaction_count = 0
        with (
            patch.object(stream_director, "context", {}),
            patch.object(stream_director, "_last_phase_update", 0),
            patch.object(stream_director, "maybe_cta", return_value=False) as schedule,
            patch(
                "winky.voice_bank.active_commentary_root",
                return_value=Path("streamer_v2"),
            ),
        ):
            api.maybe_say_cta()
        api._controller.speak.assert_not_called()
        api._controller.enqueue_voice_event.assert_not_called()
        schedule.assert_called_once_with(lang='ru')

    def test_fresh_fish_defaults_match_delivery_but_explicit_user_tuning_wins(self):
        from winky.fish_tts import FishAudioTTS

        engine = FishAudioTTS()
        try:
            engine.tuning = {}
            t = engine.get_tuning("en")
            self.assertEqual(
                (t["temperature"], t["top_p"], t["latency"]), (0.82, 0.85, "balanced")
            )
            engine.tuning["en"] = {"temperature": 0.5, "latency": "low"}
            self.assertEqual(engine.get_tuning("en")["temperature"], 0.5)
            self.assertEqual(engine.get_tuning("en")["latency"], "low")
        finally:
            engine._client.close()

    def test_replacing_audio_invalidates_the_old_lipsync_envelope(self):
        from unittest.mock import Mock
        from tools import build_commentary_bank as generator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bank = root / "bank"
            catalog_path = root / "catalog.json"
            dest = bank / "en/NARRATE_TRADE/line.mp3"
            dest.parent.mkdir(parents=True)
            dest.write_bytes(b"old audio")
            cache = dest.with_suffix(".mp3.rms2.json")
            cache.write_text("[0.1,0.2]")
            dest.with_suffix(".review.json").write_text(
                json.dumps({"text_sha256": "old"})
            )
            source = root / "fresh.mp3"
            source.write_bytes(b"new audio")
            row = dict(
                id="line",
                lang="en",
                category="NARRATE_TRADE",
                text="Watching this trade.",
                tts_text="Watching this trade.",
                text_sha256="new",
                voice_id="voice",
            )
            catalog_path.write_text(json.dumps({"records": [row]}))
            engine = Mock()
            engine.voices = {"en": "voice"}
            engine.tuning = {}
            engine.synthesize.return_value = source
            engine.payload.return_value = {}

            def compute(path):
                self.assertFalse(cache.exists())
                self.assertEqual(path.read_bytes(), b"new audio")
                return [0.3]

            with (
                patch.object(generator, "BANK", bank),
                patch.object(generator, "CATALOG", catalog_path),
                patch.object(generator, "FishAudioTTS", return_value=engine),
                patch.object(generator, "compute_rms_chunks", side_effect=compute),
                patch.object(generator, "media_duration_seconds", return_value=1),
            ):
                generator.generate()

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
