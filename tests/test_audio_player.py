import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from winky import audio_player
from winky.tts import SpeechController


class PlayerClockTests(unittest.TestCase):
    def test_speech_begin_waits_for_the_native_playhead_and_clocks_exclude_startup(self):
        clock=[0.0];events=[]
        class Player:
            clock_source='native_playhead'
            duration=4
            def playback_time(self):return max(0,min(4,clock[0]-1))
            def poll(self):return None if clock[0]<5 else 0
            def wait(self,timeout=None):return 0
            def kill(self):clock[0]=5
        controller=SpeechController(on_speak=Mock(),engine=Mock(),on_performance=lambda m:events.append((clock[0],m)))
        try:
            with patch.object(audio_player,'start_player',return_value=Player()), \
                 patch('winky.tts.time.monotonic',side_effect=lambda:clock[0]), \
                 patch('winky.tts.time.sleep',side_effect=lambda s:clock.__setitem__(0,clock[0]+s)), \
                 patch('winky.tts.media_duration_seconds',return_value=4):
                controller._play_media(Path('/tmp/fake-playhead-test.mp3'),'Проверка','happy','ru',[.2]*80)
            begin=next((at,m) for at,m in events if m['type']=='begin')
            clocks=[m for at,m in events if m['type']=='clock']
            self.assertGreaterEqual(begin[0],1)
            self.assertEqual(begin[1]['event']['audio_clock'],'native_playhead')
            self.assertLess(clocks[0]['time'],.02)
            self.assertGreater(clocks[-1]['time'],3.9)
        finally:
            controller._synth_pool.shutdown(wait=True,cancel_futures=True)

    def test_media_position_does_not_use_process_start_or_wall_time(self):
        player=Mock(clock_source='native_playhead')
        player.playback_time.return_value=.125
        with patch.object(audio_player.time,'monotonic',return_value=999):
            self.assertEqual(audio_player.playback_position(player,10),.125)

    def test_native_playhead_never_rewinds_on_end_reset(self):
        native=audio_player.NativeAudioPlayer.__new__(audio_player.NativeAudioPlayer)
        native.player=Mock();native.duration=4;native.last_time=0;native.returncode=None
        native.player.currentTime.side_effect=[3.95,0]
        self.assertEqual(native.playback_time(),3.95)
        self.assertEqual(native.playback_time(),3.95)
        native.terminate();self.assertEqual(native.poll(),-15)
        native.player.stop.assert_called_once()

    def test_file_fallback_is_only_used_if_native_initialization_failed(self):
        with patch.object(audio_player.sys,'platform','darwin'), \
             patch.object(audio_player,'NativeAudioPlayer') as native, \
             patch.object(audio_player.subprocess,'Popen') as fallback:
            instance=native.return_value
            self.assertIs(audio_player.start_player(Path('/tmp/file.mp3'),.7),instance)
            fallback.assert_not_called()
            native.side_effect=ImportError
            self.assertIs(audio_player.start_player(Path('/tmp/file.mp3'),.7),fallback.return_value)
            self.assertEqual(fallback.call_args.args[0],['/usr/bin/afplay','-v','0.7','/tmp/file.mp3'])
