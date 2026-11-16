import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from winky.director import ChatItem, StreamDirector
from winky.fish_tts import FishAudioTTS
from winky.tts import SpeechController, SpeechItem, speech_delivery_text


class SpeechDeliveryTests(unittest.TestCase):
    def test_chat_excitement_reaches_synthesis_without_changing_visible_reply(self):
        brain = Mock()
        brain.reply.return_value = '[excited] Вот это приятно!'
        engine = Mock(spec=FishAudioTTS)
        engine.synthesize.return_value = Path('/tmp/prepared-reply.mp3')
        director = StreamDirector(brain=brain, tts=Mock(engine=engine))
        item = ChatItem('Саша', 'Отлично получилось!')
        try:
            with patch.object(director._stop_event, 'wait', return_value=False):
                director._pre_synthesize(item)
            engine.synthesize.assert_called_once_with('[excited] Вот это приятно!', 'ru')
            self.assertEqual(item.reply_text, brain.reply.return_value)
            self.assertTrue(item.ready)
        finally:
            director.stop()

    def test_pipeline_cache_and_synth_use_the_same_emotional_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            media = Path(tmp) / 'audio.mp3'
            media.write_bytes(b'audio')
            controller = object.__new__(SpeechController)
            controller.engine = Mock(spec=FishAudioTTS)
            controller.engine.is_cached.return_value = False
            controller.engine.synthesize.return_value = media
            controller._cancel_generation = 0
            item = SpeechItem(text='Есть плюс!', lang='ru', emotion='win')
            with patch('winky.tts.compute_rms_chunks', return_value=[0.1]):
                controller._prepare_audio(item)
            controller.engine.is_cached.assert_called_once_with('[excited] Есть плюс!', 'ru')
            controller.engine.synthesize.assert_called_once_with('[excited] Есть плюс!', 'ru')
            self.assertEqual(item.text, 'Есть плюс!')

    def test_existing_direction_and_neutral_defaults_are_preserved(self):
        engine = Mock(spec=FishAudioTTS)
        self.assertEqual(speech_delivery_text(engine, '[curious, conversational] Смотрю.', 'excited'),
                         '[curious, conversational] Смотрю.')
        self.assertEqual(speech_delivery_text(engine, 'Привет!', 'happy'), 'Привет!')
        self.assertEqual(speech_delivery_text(Mock(), 'Привет!', 'excited'), 'Привет!')


if __name__ == '__main__':
    unittest.main()
