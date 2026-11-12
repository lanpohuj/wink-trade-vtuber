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
                row2 = {**row, "id": "b", "file": "b.mp3", "text": "Проверяю другую идею."}
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

    def test_delayed_heartbeat_does_not_refresh_narration_connection(self):
        d = StreamDirector()
        before = d._last_phase_update
        with patch("winky.director.time.time", return_value=200):
            res = d.update_trade_phase(
                "ANALYZING", "EUR/USD", 0, dict(auto_stream=True, created_at=100)
            )
        self.assertTrue(res["stale"])
        self.assertEqual(d._last_phase_update, before)
        d.stop()

    def test_activation_needs_both_corrected_hashes_and_keeps_auditory_flags_truthful(
        self,
    ):
        from tools import build_commentary_bank as build
        import hashlib

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bank = root / "bank"
            bank.mkdir()
            catalog_path = root / "catalog.json"
            source = catalog()
            catalog_path.write_text(json.dumps({"records": source}))
            groups = {}
            approved = []
            for original in source:
                row = dict(original)
                media = bank / (row["id"] + ".mp3")
                media.write_bytes(row["id"].encode())
                digest = hashlib.sha256(media.read_bytes()).hexdigest()
                row.update(
                    file=media.name,
                    sha256=digest,
                    automatic_qc_passed=True,
                    status="review_pending",
                )
                groups.setdefault(row["category"], []).append(row)
                media.with_suffix(".qc.json").write_text(
                    json.dumps(dict(sha256=digest, issues=[]))
                )
                if row.get("requires_listening"):
                    approved.append(dict(id=row["id"], sha256=digest, accepted=True))
            manifest_path = bank / "manifest.json"
            manifest_path.write_text(
                json.dumps(dict(activated=False, categories=groups))
            )
            approval_path = root / "approval.json"
            approval_path.write_text(
                json.dumps(
                    dict(
                        method="owner_sampled", voice_samples_accepted=True, records=[]
                    )
                )
            )
            with (
                patch.object(build, "BANK", bank),
                patch.object(build, "CATALOG", catalog_path),
            ):
                with self.assertRaisesRegex(
                    ValueError, "Corrected recording needs listening"
                ):
                    build.activate(approval_path)
                self.assertFalse(json.loads(manifest_path.read_text())["activated"])
                approval_path.write_text(
                    json.dumps(
                        dict(
                            method="owner_sampled",
                            voice_samples_accepted=True,
                            records=approved[1:],
                        )
                    )
                )
                build.activate(approval_path, allow_partial=True)
                partial = json.loads(manifest_path.read_text())
                self.assertEqual(partial["active_count"], 159)
                self.assertEqual(
                    sum(
                        row["status"] == "review_pending"
                        for group in partial["categories"].values()
                        for row in group
                    ),
                    1,
                )
                # The owner can request an exact text revision without claiming
                # to have heard the newly synthesized waveform.
                revision = {
                    **approved[0],
                    "listened": False,
                    "owner_requested_revision": True,
                    "text_sha256": "wrong",
                }
                approval_path.write_text(
                    json.dumps(
                        dict(
                            method="owner_sampled",
                            voice_samples_accepted=True,
                            records=[approved[1], revision],
                        )
                    )
                )
                with self.assertRaisesRegex(
                    ValueError, "Corrected recording needs listening"
                ):
                    build.activate(approval_path)
                revision["text_sha256"] = next(
                    r["text_sha256"] for r in source if r["id"] == revision["id"]
                )
                approval_path.write_text(
                    json.dumps(
                        dict(
                            method="owner_sampled",
                            voice_samples_accepted=True,
                            records=[approved[1], revision],
                        )
                    )
                )
                build.activate(approval_path)
                revised = json.loads(manifest_path.read_text())
                self.assertEqual(
                    sum(
                        r["auditory_verified"]
                        for group in revised["categories"].values()
                        for r in group
                    ),
                    1,
                )
                approval_path.write_text(
                    json.dumps(
                        dict(
                            method="owner_sampled",
                            voice_samples_accepted=True,
                            records=approved,
                        )
                    )
                )
                build.activate(approval_path)
            result = json.loads(manifest_path.read_text())
            rows = [r for group in result["categories"].values() for r in group]
            self.assertTrue(result["activated"])
            self.assertEqual(sum(r["auditory_verified"] for r in rows), 2)

    def test_generation_cannot_overwrite_a_live_ready_bank(self):
        from tools import build_commentary_bank as build

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bank = root / "bank"
            bank.mkdir()
            src = catalog()
            source_path = root / "catalog.json"
            source_path.write_text(json.dumps({"records": src}))
            manifest = bank / "manifest.json"
            manifest.write_text(
                json.dumps(
                    dict(
                        activated=True,
                        categories={"test": [{**src[0], "status": "ready"}]},
                    )
                )
            )
            before = manifest.read_bytes()
            with (
                patch.object(build, "BANK", bank),
                patch.object(build, "CATALOG", source_path),
                patch.object(build, "FishAudioTTS") as engine,
            ):
                with self.assertRaisesRegex(ValueError, "Active bank"):
                    build.generate()
                with self.assertRaisesRegex(ValueError, "ready recording"):
                    build.generate([src[0]["id"]])
                engine.assert_not_called()
            self.assertEqual(before, manifest.read_bytes())

    def test_ready_chat_can_play_during_analysis_but_must_fit_trade_window(self):
        from winky.tts import SpeechItem

        c = SpeechController(on_speak=Mock(), engine=Mock())
        item = SpeechItem(
            text="Привет!", lang="ru", priority=3, media_path=Path("test.mp3")
        )
        director = Mock()
        director.trade_phase = "ANALYZING"
        try:
            with (
                patch("winky.director.stream_director", director),
                patch("winky.tts.media_duration_seconds", return_value=4),
            ):
                self.assertTrue(c._fits_window(item))
                director.trade_phase = "IN_TRADE"
                director.remaining_sec = 3
                director._last_phase_update = 100
                with patch("winky.tts.time.time", return_value=100):
                    self.assertFalse(c._fits_window(item))
                    director.remaining_sec = 10
                    self.assertTrue(c._fits_window(item))
        finally:
            c._synth_pool.shutdown(wait=False, cancel_futures=True)

    def test_search_comments_and_volatility_are_revalidated_at_playback(self):
        c = dict(
            auto_stream=True,
            session_id="s",
            lang="ru",
            pair="EUR/USD",
            search_generation=1,
            high_volatility=True,
        )
        e = dict(c, category="NARRATE_PAIR", commentary_scope="search")
        self.assertTrue(narration_valid(e, c, "ANALYZING", 99, 100))
        self.assertFalse(
            narration_valid(e, {**c, "pair": "USD/JPY"}, "ANALYZING", 99, 100)
        )
        e.update(category="NARRATE_VOLATILITY", market_observed_at=95)
        self.assertFalse(narration_valid(e, c, "ANALYZING", 99, 100))

    def test_legacy_warmup_cannot_compete_with_pocket_narration(self):
        from winky.app import WinkyAPI

        api = object.__new__(WinkyAPI)
        api._controller = Mock()
        with patch("winky.commentary.context_valid", return_value=True):
            api.maybe_say_cta()
        api._controller.speak.assert_not_called()

    def test_twenty_second_chat_generation_does_not_occupy_the_speech_head(self):
        tts = Mock()
        tts.speaking = False
        tts.narration_state.return_value = {}
        tts.voice_bank.candidates.return_value = [{"duration": 3}]
        tts.enqueue_voice_event.return_value = {"ok": True}
        d = StreamDirector(tts=tts)
        d._next_commentary_at = 0
        d._trade_phase = "ANALYZING"
        d.context = dict(
            auto_stream=True,
            session_id="s",
            lang="ru",
            pair="EUR/USD",
            search_generation=1,
        )
        chat = ChatItem(user="viewer", text="question", created_at=100)
        d._chat_queue.append(chat)
        d._last_phase_update = 100
        d.tick(100)
        self.assertTrue(tts.enqueue_voice_event.called)
        tts.enqueue_voice_event.reset_mock()
        chat.ready = True
        chat.media_path = Path("reply.mp3")
        d._last_phase_update = 120
        with patch("winky.tts.media_duration_seconds", return_value=4):
            d.tick(120)
        tts.speak_chat_item.assert_called_once_with(chat)
        tts.enqueue_voice_event.assert_not_called()
        d.stop()
