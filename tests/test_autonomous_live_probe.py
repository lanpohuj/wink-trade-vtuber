import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools import probe_autonomous_live_reply as probe


class LiveProbeTests(unittest.TestCase):
    def test_repeated_probe_reuses_the_exact_paid_result_without_constructing_services(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory);media=out/'reply.mp3';media.write_bytes(b'paid waveform')
            result=dict(audio_path=str(media),waveform_sha256=hashlib.sha256(media.read_bytes()).hexdigest())
            (out/'real-reply-probe.json').write_text(json.dumps(result))
            with patch.object(probe,'OUT',out),patch.object(probe,'CappedProbeTTS') as tts,patch.object(probe,'LLMBrain') as brain:
                self.assertEqual(probe.probe(),result)
                tts.assert_not_called();brain.assert_not_called()

    def test_changed_paid_waveform_stops_instead_of_silently_paying_for_a_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory);media=out/'reply.mp3';media.write_bytes(b'changed')
            (out/'real-reply-probe.json').write_text(json.dumps(dict(audio_path=str(media),waveform_sha256='original')))
            with patch.object(probe,'OUT',out),patch.object(probe,'CappedProbeTTS') as tts,patch.object(probe,'LLMBrain') as brain:
                with self.assertRaises(ValueError):probe.probe()
                tts.assert_not_called();brain.assert_not_called()
