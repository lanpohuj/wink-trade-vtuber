import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from winky.commentary import choices, narration_valid
from winky.director import StreamDirector, ChatItem
from winky.tts import SpeechController
from winky.voice_bank import VoiceBank
from tools.commentary_catalog import catalog


class CommentaryTests(unittest.TestCase):
    def test_catalog_has_80_unique_contextual_records_per_language(self):
        rows = catalog()
        self.assertEqual(len(rows), 160)
        for lang in ("ru", "en"):
            self.assertEqual(sum(r["lang"] == lang for r in rows), 80)
        opens = [r for r in rows if r["category"].startswith("OPEN_")]
        self.assertEqual(len(opens), 32)
        self.assertTrue(all(r["conditions"]["setup_confirmed"] for r in opens))
        self.assertFalse(
            any("мяу" in r["text"].lower() or "meow" in r["text"].lower() for r in rows)
        )

    def test_freshness_auto_stream_language_pair_and_trade_scopes(self):
        c = dict(
            auto_stream=True, session_id="s", lang="ru", trade_seq=1, pair="EUR/USD"
        )
        e = dict(c, commentary_scope="trade")
        self.assertTrue(narration_valid(e, c, "IN_TRADE", 99, 100))
        self.assertFalse(narration_valid(e, c, "IN_TRADE", 96, 100))
        for field, value in [
            ("auto_stream", False),
            ("lang", "en"),
            ("trade_seq", 2),
            ("pair", "USD/JPY"),
        ]:
            self.assertFalse(
                narration_valid(e, {**c, field: value}, "IN_TRADE", 99, 100)
            )
        self.assertFalse(narration_valid(e, c, "COOLDOWN", 99, 100))

    def test_loss_recovery_refund_unknown_and_near_miss(self):
        c = {
            "last_result": dict(seq=1, outcome="LOSS", closed_at=100, previous_step=0),
            "next_stake": 110,
        }
        self.assertEqual(
            next(choices(c, "COOLDOWN", 101))[3]["result_kind"], "LOSS_110"
        )
        c["next_stake"] = 242
        self.assertEqual(
            next(choices(c, "COOLDOWN", 101))[3]["result_kind"], "LOSS_242"
        )
        c["next_stake"] = 50
        c["last_result"]["previous_step"] = 2
        self.assertEqual(
            next(choices(c, "COOLDOWN", 101))[3]["result_kind"], "LOSS_RESET"
        )
        self.assertFalse(
            any(
                extra.get("result_kind") == "NEAR_LOSS"
                for _, _, _, extra, _ in choices(c, "COOLDOWN", 101)
            )
        )
        c["last_result"]["near_loss_verified"] = True
        self.assertTrue(
            any(
                extra.get("result_kind") == "NEAR_LOSS"
                for _, _, _, extra, _ in choices(c, "COOLDOWN", 101)
            )
        )
        for outcome in ("REFUND", "UNKNOWN"):
            c["last_result"]["outcome"] = outcome
            self.assertFalse(
                any(
                    category == "NARRATE_RESULT"
                    for category, *_ in choices(c, "COOLDOWN", 101)
                )
            )

    def test_only_recent_measured_volatility_gets_a_comment(self):
        c = dict(high_volatility=True, market_observed_at=99)
        self.assertTrue(
            any(
                category == "NARRATE_VOLATILITY"
                for category, *_ in choices(c, "ANALYZING", 100)
            )
        )
        self.assertFalse(
            any(
                category == "NARRATE_VOLATILITY"
                for category, *_ in choices(c, "ANALYZING", 104)
            )
        )

    def test_tick_uses_end_of_speech_gap_and_ready_chat_outranks_filler(self):
        tts = Mock()
        tts.speaking = False
        tts.narration_state.return_value = dict(
            paused=False, ended_at=100, foreground_ready=False, background_pending=False
        )
        tts.voice_bank.candidates.return_value = [dict(duration=3)]
        tts.enqueue_voice_event.return_value = {"ok": True}
        d = StreamDirector(tts=tts)
        d._trade_phase = "ANALYZING"
        d.context = dict(
            session_id="s",
            lang="ru",
            auto_stream=True,
            pair="EUR/USD",
            search_generation=1,
        )
        d._last_phase_update = 100
        with patch("winky.director.random.uniform", return_value=4):
            d.tick(101)
        tts.enqueue_voice_event.assert_not_called()
        d._last_phase_update = 104
        d.tick(104)
        self.assertTrue(tts.enqueue_voice_event.called)
        tts.enqueue_voice_event.reset_mock()
        chat = ChatItem(
            user="viewer",
            text="hello",
            created_at=103,
            ready=True,
            media_path=Path("test.mp3"),
        )
        d._chat_queue.append(chat)
        with patch("winky.tts.media_duration_seconds", return_value=3):
            d.tick(104)
        tts.speak_chat_item.assert_called_once_with(chat)
        tts.enqueue_voice_event.assert_not_called()
        d.stop()

    def test_pending_chat_does_not_block_commentary_and_short_window_does(self):
        tts = Mock()
        tts.speaking = False
        tts.narration_state.return_value = {}
        tts.voice_bank.candidates.return_value = [dict(duration=4)]
        tts.enqueue_voice_event.return_value = {"ok": True}
        d = StreamDirector(tts=tts)
        d._next_commentary_at = 0
        d._trade_phase = "IN_TRADE"
        d._last_phase_update = 100
        d._remaining_sec = 5
        d.context = dict(
            session_id="s",
            lang="ru",
            auto_stream=True,
            pair="EUR/USD",
            trade_seq=1,
            open_observed=True,
            duration="15s",
        )
        d._chat_queue.append(ChatItem(user="viewer", text="pending", created_at=99))
        d.tick(100)
        tts.enqueue_voice_event.assert_not_called()
        d._remaining_sec = 15
        d.tick(101)
        self.assertTrue(tts.enqueue_voice_event.called)
        d.stop()

    def test_overlay_is_additive_and_requires_acceptance(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = root / "base"
            overlay = root / "overlay"
            base.mkdir()
            overlay.mkdir()
            (base / "a.mp3").write_bytes(b"a")
            (overlay / "b.mp3").write_bytes(b"b")
            (base / "manifest.json").write_text(
                json.dumps(
                    {
                        "categories": {
                            "OPEN_TRADE_CALL": [
                                dict(
                                    id="a",
                                    lang="ru",
                                    text="Открыла вверх.",
                                    file="a.mp3",
                                    conditions={},
                                )
                            ]
                        }
                    }
                )
            )
            row = dict(
                id="b",
                lang="ru",
                text="Открыла вверх после отката.",
                file="b.mp3",
                status="ready",
                review_method="owner_sampled",
                review_accepted=True,
                automatic_qc_passed=True,
                conditions={"setup": "TREND_PULLBACK"},
            )
            manifest = dict(
                bank_type="commentary_v1",
                activated=False,
                review_method="owner_sampled",
                review_accepted=True,
                categories={"OPEN_TRADE_CALL": [row]},
            )
            path = overlay / "manifest.json"
            path.write_text(json.dumps(manifest))
            bank = VoiceBank(base, root / "history.json", overlay)
            event = dict(category="OPEN_TRADE_CALL", lang="ru", setup="TREND_PULLBACK")
            self.assertEqual(bank.candidates(event)[0]["id"], "a")
            manifest["activated"] = True
            path.write_text(json.dumps(manifest))
            self.assertEqual(bank.candidates(event)[0]["id"], "b")
            event["setup"] = "LOCAL_REVERSAL"
            self.assertEqual(bank.candidates(event)[0]["id"], "a")

    def test_numeric_asr_normalization_keeps_amounts_and_language_distinct(self):
        from tools.build_commentary_bank import normalize

        self.assertEqual(normalize("one hundred and ten", "en"), normalize("110", "en"))
        self.assertEqual(normalize("двести сорок два", "ru"), normalize("242", "ru"))
        self.assertNotEqual(normalize("110", "en"), normalize("242", "en"))
        self.assertEqual(
            normalize("пятнадцать секунд", "ru"), normalize("15 секунд", "ru")
        )

    def test_queue_replaces_background_without_interrupting_foreground(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "a.mp3").write_bytes(b"audio" * 1000)
            row = dict(
                id="a",
                lang="ru",
                text="Сравниваю графики.",
                file="a.mp3",
                conditions={},
            )
            (root / "manifest.json").write_text(
                json.dumps({"categories": {"NARRATE_SCAN": [row]}})
            )
            c = SpeechController(on_speak=Mock(), engine=Mock())
            c.voice_bank = VoiceBank(root, root / "history.json")
            c.stop_current = Mock()
            try:
                self.assertTrue(
                    c.enqueue_voice_event(
                        dict(category="NARRATE_SCAN", commentary=True, event_id="a")
                    )["ok"]
                )
                # A different record lets the reservation remain truthful.
                (root / "b.mp3").write_bytes(b"audio" * 1000)
                row2 = {**row, "id": "b", "file": "b.mp3"}
                (root / "manifest.json").write_text(
                    json.dumps({"categories": {"NARRATE_SCAN": [row, row2]}})
                )
                self.assertTrue(
                    c.enqueue_voice_event(
                        dict(category="NARRATE_SCAN", commentary=True, event_id="b")
                    )["ok"]
                )
                self.assertEqual(len(c._playback_queue), 1)
                c.stop_current.assert_not_called()
            finally:
                c._synth_pool.shutdown(wait=False, cancel_futures=True)

    def test_recovery_followup_waits_for_actual_result_announcement_not_background_gap(
        self,
    ):
        tts = Mock()
        tts.speaking = True
        tts.narration_state.return_value = {"pending_fact_keys": []}
        tts.voice_bank.candidates.return_value = [{"duration": 3}]
        d = StreamDirector(tts=tts)
        d._trade_phase = "RESULT"
        d._last_phase_update = 100
        d.context = dict(
            auto_stream=True,
            session_id="s",
            lang="ru",
            trade_seq=1,
            next_stake=110,
            last_result=dict(seq=1, outcome="LOSS", closed_at=100, previous_step=0),
        )
        d.tick(100)
        tts.enqueue_voice_event.assert_not_called()
        d.note_voice_started(dict(category="TRADE_LOSS", session_id="s", trade_seq=1))
        d.tick(101)
        tts.enqueue_voice_event.assert_called_once()
        event = tts.enqueue_voice_event.call_args.args[0]
        self.assertEqual(event["result_kind"], "LOSS_110")
        self.assertEqual(event["commentary_scope"], "result")
        d.note_commentary_started(event)
        tts.enqueue_voice_event.reset_mock()
        d._trade_phase = "COOLDOWN"
        d._last_phase_update = 102
        d.tick(102)
        tts.enqueue_voice_event.assert_not_called()
        d.stop()
