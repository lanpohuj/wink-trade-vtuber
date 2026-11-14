import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock,patch
from winky.avatar_performance import describe,for_item,MAP_PATH
from winky.tts import SpeechController,SpeechItem


class AvatarPerformanceTests(unittest.TestCase):
    def test_all_active_recordings_have_current_annotations(self):
        root=Path(__file__).resolve().parent.parent
        voices=root/'assets/voices';bank=voices/json.loads((voices/'commentary-bank.json').read_text())['path']
        rows=[r for g in json.loads((bank/'manifest.json').read_text())['categories'].values() for r in g]
        records=json.loads(MAP_PATH.read_text())['records']
        self.assertEqual(len(records),1500)
        for r in rows:
            entry=records[r.get('phrase_id',r['id'])]
            self.assertEqual(entry['text_sha256'],hashlib.sha256(r['text'].encode()).hexdigest())
            if r['category'] in ('TRADE_LOSS','OPEN_TRADE_CALL','OPEN_TRADE_PUT','NARRATE_LESSON'):
                self.assertFalse(entry['flirt_allowed'])

    def test_chat_animation_uses_words_not_accidental_substrings(self):
        from winky.avatar_performance import chat_animation_intent
        self.assertIsNone(chat_animation_intent('Купил, потом заработал миллион'))
        self.assertEqual(chat_animation_intent('Привет, Винки!'),'wave')
        self.assertEqual(chat_animation_intent('Ты красивая!'),'blush')
        self.assertEqual(chat_animation_intent('Hi there'),'wave')

    def test_context_wins_over_playful_emotion(self):
        self.assertEqual(describe(category='TRADE_LOSS',emotion='blush')['profile'],'loss')
        self.assertFalse(describe(category='OPEN_TRADE_CALL',emotion='wink')['flirt_allowed'])
        self.assertEqual(for_item(SpeechItem('Спасибо!',lang='ru',emotion='happy'))['profile'],'thanks')
        from types import SimpleNamespace
        reply=SpeechItem('Спасибо!',lang='ru',emotion='happy',chat_item=SimpleNamespace(text='Ты красивая!'))
        self.assertEqual(for_item(reply)['profile'],'flirt')
        self.assertEqual(for_item(SpeechItem('Вход',lang='ru',source='signal_announcement',emotion='excited'))['profile'],'opening')
        self.assertEqual(for_item(SpeechItem('Результат',lang='ru',source='trade_event_loss_step1',emotion='wink'))['profile'],'loss')

    def test_lifecycle_emitted_only_from_actual_player_and_always_finished(self):
        events=[]
        c=SpeechController(on_speak=Mock(),on_avatar_event=events.append,engine=Mock())
        c.voice_bank=Mock()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                media=Path(tmp)/'test.mp3';media.write_bytes(b'audio')
                item=SpeechItem('Спасибо!',lang='ru',media_path=media,animation={'tone':'warm'})
                proc=Mock();proc.poll.side_effect=[None,None,0];proc.wait.return_value=0
                with patch('winky.tts.subprocess.Popen',return_value=proc),patch('winky.tts.time.sleep'),patch('winky.director.stream_director',Mock()):
                    c._play_media(media,item.text,item.emotion,item.lang,[.2,.1,0],item)
                self.assertEqual(events[0]['type'],'start')
                self.assertEqual(events[-1]['type'],'end')
                self.assertEqual({e['speech_id'] for e in events},{events[0]['speech_id']})
                self.assertEqual(events[-1]['rms'],0)
                self.assertEqual(events[0]['animation']['profile'],'thanks')
                events.clear()
                with patch('winky.tts.subprocess.Popen',side_effect=OSError('no player')),patch('winky.tts.time.sleep'):
                    c._play_media(media,item.text,item.emotion,item.lang,[.2],item)
                self.assertEqual(events,[])
        finally:c._synth_pool.shutdown(wait=False,cancel_futures=True)
