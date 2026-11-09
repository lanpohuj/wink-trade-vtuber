import json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch, Mock
import httpx
from winky.fish_tts import FishAudioTTS
from winky.tts import TTSError
from config import settings


class FishTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = FishAudioTTS()
        self.engine._client.close()
        self.engine.root = Path(self.tmp.name)

    def tearDown(self):
        self.engine._client.close()
        self.tmp.cleanup()

    def transport(self, handler):
        self.engine._client = httpx.Client(transport=httpx.MockTransport(handler))

    def test_request_headers_voice_language_and_atomic_cache(self):
        requests = []

        def handler(r):
            requests.append(r)
            self.assertEqual(r.url.path, "/v1/tts")
            self.assertEqual(r.headers["model"], "s2.1-pro")
            self.assertEqual(r.headers["authorization"], "Bearer test")
            self.assertEqual(
                json.loads(r.content)["reference_id"], self.engine.voices["en"]
            )
            return httpx.Response(200, content=b"a" * 5000)

        self.transport(handler)
        probe = Mock(returncode=0, stdout='{"format":{"duration":"3.2"}}')
        with (
            patch.object(settings, "FISHAUDIO_API_KEY", "test"),
            patch("winky.fish_tts.subprocess.run", return_value=probe),
            patch("winky.tts.compute_rms_chunks", return_value=[0.1]),
        ):
            p = self.engine.synthesize("Hello chat!", "en")
            self.assertTrue(p.exists())
            self.engine.synthesize("Hello chat!", "en")
        self.assertEqual(len(requests), 1)
        self.assertFalse(list(self.engine.root.rglob("*.part")))

    def test_failure_does_not_return_other_recording(self):
        self.transport(lambda r: httpx.Response(503, json={"message": "unavailable"}))
        with patch.object(settings, "FISHAUDIO_API_KEY", "test"):
            with self.assertRaises(TTSError):
                self.engine.synthesize("Привет!", "ru")
        self.assertFalse(list(self.engine.root.rglob("*.mp3")))
        self.assertEqual(
            json.loads((self.engine.root / "budget.json").read_text())["reserved_usd"],
            0,
        )

    def test_budget_denies_request_before_network(self):
        calls = []
        self.transport(lambda r: calls.append(r))
        with (
            patch.object(settings, "FISHAUDIO_API_KEY", "test"),
            patch.object(settings, "FISHAUDIO_BUDGET_USD", 0),
        ):
            with self.assertRaises(TTSError):
                self.engine.synthesize("Hello!", "en")
        self.assertFalse(calls)

    def test_truncated_stream_never_becomes_cache_hit(self):
        self.transport(lambda r: httpx.Response(200, content=b"bad"))
        with patch.object(settings, "FISHAUDIO_API_KEY", "test"):
            with self.assertRaises(TTSError):
                self.engine.synthesize("Hello!", "en")
        self.assertFalse(self.engine.is_cached("Hello!", "en"))

    def test_cache_identity_separates_voices_and_tuning(self):
        a = self.engine.get_cache_path("Hello", "en")
        self.engine.tuning["en"] = {"speed": 1.2}
        self.assertNotEqual(a, self.engine.get_cache_path("Hello", "en"))
        self.assertNotEqual(a, self.engine.get_cache_path("Hello", "ru"))

    def test_explicit_fish_selection_does_not_fall_back_to_lumean(self):
        from winky.tts import build_engine, DummyTTS

        with (
            patch.object(settings, "FISHAUDIO_API_KEY", ""),
            patch.object(settings, "LUMEAN_API_KEY", "present"),
        ):
            self.assertIsInstance(build_engine(), DummyTTS)


if __name__ == "__main__":
    unittest.main()
