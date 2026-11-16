"""One local file player with an audio playhead; afplay remains a file-only fallback."""
import math
from pathlib import Path
import subprocess
import sys
import time


class NativeAudioPlayer:
    clock_source = 'native_playhead'

    def __init__(self, path: Path, volume: float):
        from AVFoundation import AVAudioPlayer
        from Foundation import NSURL
        player, error = AVAudioPlayer.alloc().initWithContentsOfURL_error_(NSURL.fileURLWithPath_(str(path)), None)
        if player is None:
            raise RuntimeError('Cannot decode audio file with AVAudioPlayer')
        self.player = player
        self.returncode = None
        self.last_time = 0.0
        self.duration = float(player.duration())
        if not math.isfinite(self.duration) or self.duration <= 0:
            raise RuntimeError('Invalid native audio duration')
        player.setVolume_(volume)
        if not player.prepareToPlay() or not player.play():
            player.stop()
            raise RuntimeError('Native audio player did not start')

    def playback_time(self):
        # AVAudioPlayer resets currentTime when it finishes; never rewind a clock.
        value = float(self.player.currentTime())
        if math.isfinite(value):
            self.last_time = min(self.duration, max(self.last_time, value))
        return self.last_time

    def poll(self):
        if self.returncode is not None:
            return self.returncode
        self.playback_time()
        if self.player.isPlaying():
            return None
        self.returncode = 0
        return self.returncode

    def wait(self, timeout=None):
        deadline = time.monotonic() + timeout if timeout is not None else float('inf')
        while self.poll() is None:
            if time.monotonic() >= deadline:
                raise subprocess.TimeoutExpired('AVAudioPlayer', timeout)
            time.sleep(.01)
        return self.returncode

    def terminate(self):
        self.player.stop()
        self.returncode = -15

    def kill(self):
        self.player.stop()
        self.returncode = -9


def start_player(path, volume):
    if sys.platform == 'darwin':
        try:
            return NativeAudioPlayer(path, volume)
        except (ImportError, RuntimeError, OSError):
            # Preparation failed before a successful play. Never synthesize a
            # different voice or restart an already playing file here.
            pass
    return subprocess.Popen(['/usr/bin/afplay', '-v', str(volume), str(path)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def playback_position(player, process_started):
    if getattr(player, 'clock_source', '') == 'native_playhead':
        return player.playback_time()
    return max(0, time.monotonic() - process_started)
